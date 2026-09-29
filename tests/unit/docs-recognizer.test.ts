import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { createError } from 'h3'
import { isRecognitionAvailable, recognizeDocumentImages, type RecognitionImageReader } from '../../server/services/docs/recognizer'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'

interface RecordedRequest {
  method: string
  path: string
  search: string
  headers: Headers
  json?: Record<string, unknown>
  form?: FormData
}

interface FakeApi {
  getRequests: () => RecordedRequest[]
}

type MessageReply = () => Response

const API_KEY = 'test-api-key'

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const messageResponse = (content: unknown[], stopReason: string): Response => jsonResponse({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-5-5',
  content,
  stop_reason: stopReason,
  stop_sequence: null,
  usage: { input_tokens: 1200, output_tokens: 300 },
})

const recognizedReply = (output: unknown): MessageReply => () =>
  messageResponse([{ type: 'text', text: JSON.stringify(output) }], 'end_turn')

const useFakeApi = (context: TestContext, reply: MessageReply): FakeApi => {
  const previousFetch = globalThis.fetch
  const previousApiKey = process.env.ANTHROPIC_API_KEY
  let requests: RecordedRequest[] = []
  let uploadedFileCount = 0

  const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    const url = new URL(request.url)

    if (url.protocol === 'data:') {
      return new Response('')
    }

    const isUpload = request.method === 'POST' && url.pathname === '/v1/files'
    const isMessage = request.method === 'POST' && url.pathname === '/v1/messages'
    const recorded: RecordedRequest = {
      method: request.method,
      path: url.pathname,
      search: url.search,
      headers: request.headers,
      ...(isUpload ? { form: await request.formData() } : {}),
      ...(isMessage ? { json: await request.json() } : {}),
    }
    requests = [...requests, recorded]

    if (isUpload) {
      uploadedFileCount += 1
      return jsonResponse({
        id: `file_${uploadedFileCount}`,
        type: 'file',
        filename: `photo-${uploadedFileCount}.jpg`,
        mime_type: 'image/jpeg',
        size_bytes: 3,
        created_at: '2026-09-28T10:00:00Z',
        downloadable: false,
      })
    }

    if (request.method === 'DELETE') {
      return jsonResponse({ id: url.pathname.split('/').at(-1), type: 'file_deleted' })
    }

    return reply()
  }

  globalThis.fetch = fakeFetch as typeof fetch
  process.env.ANTHROPIC_API_KEY = API_KEY

  context.after(() => {
    globalThis.fetch = previousFetch
    if (previousApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    }
    else {
      process.env.ANTHROPIC_API_KEY = previousApiKey
    }
  })

  return { getRequests: () => requests }
}

const createImageReaders = (onRead: (index: number) => void = () => undefined): RecognitionImageReader[] =>
  [0, 1].map(index => async () => {
    onRead(index)
    return new Blob([Uint8Array.from([0xFF, 0xD8, 0xFF])], { type: 'image/jpeg' })
  })

const readMessageRequest = (api: FakeApi): RecordedRequest => {
  const messageRequest = api.getRequests().find(request => request.path === '/v1/messages')
  assert.ok(messageRequest)
  return messageRequest
}

test('recognizeDocumentImages uploads the photos, asks Claude Sonnet 5.5 for the fields with the chosen effort and deletes the photos', async (context) => {
  const output = {
    title: 'Паспорт РФ',
    fields: [
      { existingNumber: null, name: 'Серия и номер', value: '45 12 345678' },
      { existingNumber: 1, name: '', value: '' },
    ],
  }
  const api = useFakeApi(context, recognizedReply(output))
  let uploadsBeforeEachRead: number[] = []
  const countUploads = (): number => api.getRequests().filter(request => request.path === '/v1/files').length

  const result = await recognizeDocumentImages({
    imageReaders: createImageReaders(() => {
      uploadsBeforeEachRead = [...uploadsBeforeEachRead, countUploads()]
    }),
    existingFields: [{ name: 'Фамилия', value: 'Иванов' }],
    language: 'ru',
    effort: 'xhigh',
  })

  assert.deepEqual(result, output)
  assert.deepEqual(uploadsBeforeEachRead, [0, 1])

  const requests = api.getRequests()
  assert.deepEqual(requests.map(({ method, path }) => `${method} ${path}`), [
    'POST /v1/files',
    'POST /v1/files',
    'POST /v1/messages',
    'DELETE /v1/files/file_1',
    'DELETE /v1/files/file_2',
  ])

  const uploads = requests.filter(request => request.path === '/v1/files')
  uploads.forEach((upload, index) => {
    const file = upload.form?.get('file')
    assert.ok(file instanceof File)
    assert.equal(file.name, `photo-${index + 1}.jpg`)
    assert.equal(file.type, 'image/jpeg')
    assert.equal(upload.form?.get('expires_in_seconds'), '3600')
    assert.equal(upload.headers.get('x-api-key'), API_KEY)
  })

  const messageRequest = readMessageRequest(api)
  const body = messageRequest.json
  assert.ok(body)
  assert.equal(messageRequest.search, '?beta=true')
  assert.match(messageRequest.headers.get('anthropic-beta') ?? '', /server-side-fallback-2026-07-01/)
  assert.equal(body.model, 'claude-sonnet-5-5')
  assert.equal(body.max_tokens, 16000)
  assert.equal(body.fallbacks, 'default')
  assert.equal(body.thinking, undefined)
  assert.equal(body.stream, undefined)

  const outputConfig = body.output_config as { effort: string, format: { type: string, schema: { properties: Record<string, unknown>, required: string[] } } }
  assert.equal(outputConfig.effort, 'xhigh')
  assert.equal(outputConfig.format.type, 'json_schema')
  assert.deepEqual(Object.keys(outputConfig.format.schema.properties), ['title', 'fields'])
  assert.deepEqual(outputConfig.format.schema.required, ['title', 'fields'])

  const messages = body.messages as Array<{ role: string, content: Array<Record<string, unknown>> }>
  assert.equal(messages.length, 1)
  assert.equal(messages[0]?.role, 'user')
  assert.deepEqual(messages[0]?.content.slice(0, 2), [
    { type: 'image', source: { type: 'file', file_id: 'file_1' } },
    { type: 'image', source: { type: 'file', file_id: 'file_2' } },
  ])
  assert.match(String(messages[0]?.content[2]?.text), /1\. Фамилия: Иванов/)
  assert.match(String(body.system), /Write field names in Russian/)
})

test('recognizeDocumentImages says there are no fields yet when the document is empty', async (context) => {
  const api = useFakeApi(context, recognizedReply({ title: '', fields: [] }))

  await recognizeDocumentImages({ imageReaders: createImageReaders().slice(0, 1), existingFields: [], language: 'en', effort: 'low' })

  const messages = readMessageRequest(api).json?.messages as Array<{ content: Array<Record<string, unknown>> }>
  assert.match(String(messages[0]?.content[1]?.text), /no fields for this document yet/)
  assert.match(String(readMessageRequest(api).json?.system), /Write field names in English/)
})

test('recognizeDocumentImages reports a refusal and still deletes the photos', async (context) => {
  const api = useFakeApi(context, () => messageResponse([], 'refusal'))

  await assert.rejects(recognizeDocumentImages({ imageReaders: createImageReaders(), existingFields: [], language: 'en', effort: 'low' }), {
    statusCode: 422,
    message: ERROR_KEYS.DOCS_RECOGNITION_REFUSED,
  })
  assert.equal(api.getRequests().filter(request => request.method === 'DELETE').length, 2)
})

test('recognizeDocumentImages reports an answer that does not match the schema as a failure', async (context) => {
  useFakeApi(context, recognizedReply({ title: 'Passport', fields: 'none' }))

  await assert.rejects(recognizeDocumentImages({ imageReaders: createImageReaders(), existingFields: [], language: 'en', effort: 'low' }), {
    statusCode: 502,
    message: ERROR_KEYS.DOCS_RECOGNITION_FAILED,
  })
})

test('recognizeDocumentImages reports a cut off answer as a failure', async (context) => {
  useFakeApi(context, () => messageResponse([{ type: 'text', text: '{"title":"Pass' }], 'max_tokens'))

  await assert.rejects(recognizeDocumentImages({ imageReaders: createImageReaders(), existingFields: [], language: 'en', effort: 'low' }), {
    statusCode: 502,
    message: ERROR_KEYS.DOCS_RECOGNITION_FAILED,
  })
})

test('recognizeDocumentImages deletes the photos it uploaded when it cannot read the next one', async (context) => {
  const api = useFakeApi(context, recognizedReply({ title: '', fields: [] }))
  const [firstReader] = createImageReaders()
  assert.ok(firstReader)
  const missingImageReader: RecognitionImageReader = async () => {
    throw createError({ statusCode: 404, message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND })
  }

  await assert.rejects(recognizeDocumentImages({ imageReaders: [firstReader, missingImageReader], existingFields: [], language: 'en', effort: 'low' }), {
    statusCode: 404,
    message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
  })
  assert.deepEqual(api.getRequests().map(({ method, path }) => `${method} ${path}`), [
    'POST /v1/files',
    'DELETE /v1/files/file_1',
  ])
})

const apiErrorCases = [
  { name: 'a rejected key', status: 401, type: 'authentication_error', expected: { statusCode: 503, message: ERROR_KEYS.DOCS_RECOGNITION_NOT_CONFIGURED } },
  { name: 'an overloaded API', status: 529, type: 'overloaded_error', expected: { statusCode: 503, message: ERROR_KEYS.DOCS_RECOGNITION_BUSY } },
  { name: 'a rate limit', status: 429, type: 'rate_limit_error', expected: { statusCode: 503, message: ERROR_KEYS.DOCS_RECOGNITION_BUSY } },
  { name: 'a bad request', status: 400, type: 'invalid_request_error', expected: { statusCode: 502, message: ERROR_KEYS.DOCS_RECOGNITION_FAILED } },
]

apiErrorCases.forEach(({ name, status, type, expected }) => {
  test(`recognizeDocumentImages turns ${name} into ${expected.message}`, async (context) => {
    const api = useFakeApi(context, () => jsonResponse(
      { type: 'error', error: { type, message: 'Request failed' } },
      status,
      { 'x-should-retry': 'false' },
    ))

    await assert.rejects(recognizeDocumentImages({ imageReaders: createImageReaders(), existingFields: [], language: 'en', effort: 'low' }), expected)
    assert.equal(api.getRequests().filter(request => request.method === 'DELETE').length, 2)
  })
})

test('isRecognitionAvailable depends on the API key outside test mode', (context) => {
  const previousApiKey = process.env.ANTHROPIC_API_KEY
  context.after(() => {
    if (previousApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    }
    else {
      process.env.ANTHROPIC_API_KEY = previousApiKey
    }
  })

  process.env.ANTHROPIC_API_KEY = ' '
  assert.equal(isRecognitionAvailable(), false)
  process.env.ANTHROPIC_API_KEY = API_KEY
  assert.equal(isRecognitionAvailable(), true)
})
