import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { createError, isError } from 'h3'
import { z } from 'zod'
import { secureLog } from '~~/server/utils/secure-logger'
import { isTestMode } from '~~/server/utils/test-mode'
import type { DocField, DocRecognitionEffort } from '~~/shared/types/docs'
import type { RecognizedDocField } from '~~/shared/utils/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export type RecognitionLanguage = 'en' | 'ru'

export type RecognitionImageReader = () => Promise<Blob>

export interface RecognitionRequest {
  imageReaders: readonly RecognitionImageReader[]
  existingFields: readonly DocField[]
  language: RecognitionLanguage
  effort: DocRecognitionEffort
}

export interface RecognitionResult {
  title: string
  fields: RecognizedDocField[]
}

interface LanguageExamples {
  name: string
  fieldNames: string
  titles: string
}

const RECOGNITION_MODEL = 'claude-sonnet-5-5'
const RECOGNITION_MAX_TOKENS = 16000
const RECOGNITION_TIMEOUT_MS = 3 * 60 * 1000
const RECOGNITION_MAX_RETRIES = 1
const UPLOADED_IMAGE_LIFETIME_SECONDS = 60 * 60
const SERVER_SIDE_FALLBACK_BETA = 'server-side-fallback-2026-07-01'
const IMAGE_CONTENT_TYPE = 'image/jpeg'

const LANGUAGE_EXAMPLES: Record<RecognitionLanguage, LanguageExamples> = {
  en: {
    name: 'English',
    fieldNames: '"Surname", "Series and number", "Date of issue", "Issued by"',
    titles: '"Passport", "Driver\'s license", "Insurance number"',
  },
  ru: {
    name: 'Russian',
    fieldNames: '"Фамилия", "Серия и номер", "Дата выдачи", "Кем выдан"',
    titles: '"Паспорт РФ", "Водительское удостоверение", "СНИЛС"',
  },
}

const recognitionOutputSchema = z.object({
  title: z.string().describe('Short name of the document, or an empty string if the photos show no document'),
  fields: z.array(z.object({
    existingNumber: z.number().nullable().describe('Number of a field the user already has, or null for a new field'),
    name: z.string().describe('Field name, empty for a field the user already has'),
    value: z.string().describe('Value exactly as printed, empty for a field the user already has'),
  })).describe('Every field of the document, the most needed first'),
})

const TEST_MODE_TITLE = 'Test document'

const getApiKey = (): string | undefined => process.env.ANTHROPIC_API_KEY?.trim() || undefined

export const isRecognitionAvailable = (): boolean => Boolean(getApiKey()) || isTestMode()

const buildSystemPrompt = (language: RecognitionLanguage): string => {
  const examples = LANGUAGE_EXAMPLES[language]

  return `You read photos of personal documents and turn them into fields that a person copies when filling in forms. The photos are the user's own documents or their family's, kept in a private document wallet.

Values
- Copy every value exactly as printed: the same script, spelling, letter case, punctuation and grouping of digits, for example "45 12 345678" or "123-456-789 01". Do not translate or transliterate.
- If the document prints a value in two scripts, such as Cyrillic and Latin, return one field for each.
- Keep dates in the form printed on the document.
- If some characters are unreadable, write what you can read and put "…" in place of the missing part. Leave out values you cannot read at all; never guess.
- Skip captions without values, stamps, signatures, security patterns and the machine-readable zone.
- The photos may show several pages or sides of one document: combine them into one list without repeating a field.

Field names
- Write field names in ${examples.name}. Keep them short and conventional, the way forms ask for them, for example ${examples.fieldNames}.

Order
- Put first the fields people need most often: the holder's full name, the document number (series and number), date of birth, dates of issue and expiry, the issuing authority and its code, place of birth, sex. Then the rest. Do not follow the order of the photo.

Title
- In "title", name the document in ${examples.name} in a few words, for example ${examples.titles}. Leave it empty if the photos show no document.

Fields the user already has
- The request may list the fields the user already has, numbered. The user entered or checked them, so keep every one of them: return an item with its number in "existingNumber" and an empty "name" and "value". Do not add a new field that repeats one of them, and place them among the new fields in the order above.
- For a new field, set "existingNumber" to null.`
}

const formatExistingField = ({ name, value }: DocField, index: number): string =>
  `${index + 1}. ${name}: ${value.replace(/\s+/g, ' ')}`

const buildInstructions = (existingFields: readonly DocField[]): string =>
  existingFields.length === 0
    ? 'The user has no fields for this document yet. Read the photos and return its fields.'
    : `Fields the user already has:\n${existingFields.map(formatExistingField).join('\n')}\n\nRead the photos and return the full list of fields.`

const toRecognitionError = (error: unknown) => {
  if (isError(error)) {
    return error
  }

  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return createError({ statusCode: 503, message: ERROR_KEYS.DOCS_RECOGNITION_NOT_CONFIGURED })
  }

  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
    return createError({ statusCode: 503, message: ERROR_KEYS.DOCS_RECOGNITION_BUSY })
  }

  return createError({ statusCode: 502, message: ERROR_KEYS.DOCS_RECOGNITION_FAILED })
}

const deleteUploadedImages = async (client: Anthropic, fileIds: readonly string[]): Promise<void> => {
  await Promise.allSettled(fileIds.map(fileId => client.files.delete(fileId)))
}

const uploadImage = async (client: Anthropic, readImage: RecognitionImageReader, index: number): Promise<string> => {
  const image = await readImage()
  const uploadedFile = await client.files.upload({
    file: new File([image], `photo-${index + 1}.jpg`, { type: IMAGE_CONTENT_TYPE }),
    expires_in_seconds: UPLOADED_IMAGE_LIFETIME_SECONDS,
  })

  return uploadedFile.id
}

const uploadImages = (client: Anthropic, imageReaders: readonly RecognitionImageReader[]): Promise<string[]> =>
  imageReaders.reduce<Promise<string[]>>(async (previousUploads, readImage, index) => {
    const fileIds = await previousUploads

    try {
      return [...fileIds, await uploadImage(client, readImage, index)]
    }
    catch (error) {
      await deleteUploadedImages(client, fileIds)
      throw error
    }
  }, Promise.resolve([]))

const describeTokens = ({ input_tokens, output_tokens }: Pick<Anthropic.Beta.BetaUsage, 'input_tokens' | 'output_tokens'>): string =>
  `${input_tokens} input, ${output_tokens} output`

const describeUsage = (usage: Anthropic.Beta.BetaUsage): string => {
  const iterations = usage.iterations ?? []

  return iterations.length > 1
    ? iterations.map(iteration => `${iteration.type}: ${describeTokens(iteration)}`).join('; ')
    : describeTokens(usage)
}

const readRecognition = async (client: Anthropic, fileIds: readonly string[], request: RecognitionRequest): Promise<RecognitionResult> => {
  const outputFormat = betaZodOutputFormat(recognitionOutputSchema)
  const imageBlocks: Anthropic.Beta.BetaContentBlockParam[] = fileIds.map(fileId => ({
    type: 'image',
    source: { type: 'file', file_id: fileId },
  }))

  const response = await client.beta.messages.create({
    model: RECOGNITION_MODEL,
    max_tokens: RECOGNITION_MAX_TOKENS,
    betas: [SERVER_SIDE_FALLBACK_BETA],
    fallbacks: 'default',
    output_config: {
      effort: request.effort,
      format: outputFormat,
    },
    system: buildSystemPrompt(request.language),
    messages: [{
      role: 'user',
      content: [...imageBlocks, { type: 'text', text: buildInstructions(request.existingFields) }],
    }],
  })

  secureLog.info('Document recognition finished', {
    model: response.model,
    effort: request.effort,
    stopReason: response.stop_reason,
    images: fileIds.length,
    usage: describeUsage(response.usage),
  })

  if (response.stop_reason === 'refusal') {
    throw createError({ statusCode: 422, message: ERROR_KEYS.DOCS_RECOGNITION_REFUSED })
  }

  const textBlock = response.content.find((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')

  if (response.stop_reason === 'max_tokens' || !textBlock) {
    throw createError({ statusCode: 502, message: ERROR_KEYS.DOCS_RECOGNITION_FAILED })
  }

  return outputFormat.parse(textBlock.text)
}

const recognizeWithClaude = async (apiKey: string, request: RecognitionRequest): Promise<RecognitionResult> => {
  const client = new Anthropic({ apiKey, timeout: RECOGNITION_TIMEOUT_MS, maxRetries: RECOGNITION_MAX_RETRIES })
  const fileIds = await uploadImages(client, request.imageReaders)

  try {
    return await readRecognition(client, fileIds, request)
  }
  finally {
    await deleteUploadedImages(client, fileIds)
  }
}

const recognizeInTestMode = async ({ imageReaders, existingFields }: RecognitionRequest): Promise<RecognitionResult> => {
  const images = await Promise.all(imageReaders.map(readImage => readImage()))

  return {
    title: TEST_MODE_TITLE,
    fields: [
      { existingNumber: null, name: 'Test mode', value: 'ANTHROPIC_API_KEY is not set' },
      { existingNumber: null, name: 'Photos read', value: String(images.length) },
      ...existingFields.map((_, index) => ({ existingNumber: index + 1, name: '', value: '' })),
    ],
  }
}

export const recognizeDocumentImages = async (request: RecognitionRequest): Promise<RecognitionResult> => {
  const apiKey = getApiKey()

  if (apiKey) {
    try {
      return await recognizeWithClaude(apiKey, request)
    }
    catch (error) {
      secureLog.error('Document recognition failed', error)
      throw toRecognitionError(error)
    }
  }

  if (isTestMode()) {
    return recognizeInTestMode(request)
  }

  throw createError({
    statusCode: 503,
    message: ERROR_KEYS.DOCS_RECOGNITION_NOT_CONFIGURED,
  })
}
