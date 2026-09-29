import {
  DOC_FIELD_NAME_MAX_LENGTH,
  DOC_FIELD_VALUE_MAX_LENGTH,
  DOC_FILE_NAME_MAX_LENGTH,
  DOC_MAX_FIELDS,
  DOC_PREVIEW_MAX_DIMENSION,
  DOC_PREVIEW_MAX_VISUAL_TOKENS,
  DOC_TITLE_MAX_LENGTH,
  DOC_VISUAL_TOKEN_SIZE,
} from '~~/shared/schemas/docs'
import type { DocField, DocImageVariant } from '~~/shared/types/docs'

export interface ImageSize {
  width: number
  height: number
}

export interface RecognizedDocField {
  existingNumber: number | null
  name: string
  value: string
}

interface MergeState {
  fields: DocField[]
  usedNumbers: ReadonlySet<number>
  fieldKeys: ReadonlySet<string>
  addedCount: number
}

const FIELD_NAME_TRAILING_COLON = /\s*[:：]+\s*$/

const DEFAULT_FILE_NAME = 'image'

const truncate = (text: string, maxLength: number): string => text.trim().slice(0, maxLength).trim()

const toFieldKey = ({ name, value }: DocField): string => `${name.toLowerCase()}\n${value.toLowerCase()}`

export const normalizeRecognizedTitle = (title: string): string => truncate(title, DOC_TITLE_MAX_LENGTH)

export const normalizeRecognizedField = ({ name, value }: Pick<RecognizedDocField, 'name' | 'value'>): DocField => ({
  name: truncate(name.replace(FIELD_NAME_TRAILING_COLON, ''), DOC_FIELD_NAME_MAX_LENGTH),
  value: truncate(value, DOC_FIELD_VALUE_MAX_LENGTH),
})

const findExistingField = (existingFields: readonly DocField[], existingNumber: number | null): DocField | undefined =>
  existingNumber !== null && Number.isInteger(existingNumber) && existingNumber > 0
    ? existingFields[existingNumber - 1]
    : undefined

export const mergeRecognizedFields = (
  existingFields: readonly DocField[],
  recognizedFields: readonly RecognizedDocField[],
): DocField[] => {
  const capacity = Math.max(0, DOC_MAX_FIELDS - existingFields.length)

  const merged = recognizedFields.reduce<MergeState>((state, recognized) => {
    const existingField = findExistingField(existingFields, recognized.existingNumber)

    if (existingField && recognized.existingNumber !== null) {
      return state.usedNumbers.has(recognized.existingNumber)
        ? state
        : {
            ...state,
            fields: [...state.fields, existingField],
            usedNumbers: new Set([...state.usedNumbers, recognized.existingNumber]),
          }
    }

    const field = normalizeRecognizedField(recognized)
    const fieldKey = toFieldKey(field)

    if (!field.name || !field.value || state.fieldKeys.has(fieldKey) || state.addedCount >= capacity) {
      return state
    }

    return {
      ...state,
      fields: [...state.fields, field],
      fieldKeys: new Set([...state.fieldKeys, fieldKey]),
      addedCount: state.addedCount + 1,
    }
  }, {
    fields: [],
    usedNumbers: new Set(),
    fieldKeys: new Set(existingFields.map(toFieldKey)),
    addedCount: 0,
  })

  const skippedExistingFields = existingFields.filter((_, index) => !merged.usedNumbers.has(index + 1))

  return [...merged.fields, ...skippedExistingFields]
}

export const appendRecognizedFields = (
  currentFields: readonly DocField[],
  recognizedFields: readonly RecognizedDocField[],
): DocField[] => mergeRecognizedFields(currentFields, [
  ...currentFields.map((_, index) => ({ existingNumber: index + 1, name: '', value: '' })),
  ...recognizedFields.filter(recognized => recognized.existingNumber === null),
])

export const formatDocFieldsForCopy = (title: string, fields: readonly DocField[]): string =>
  [title.trim(), ...fields.map(({ name, value }) => `${name}: ${value}`)]
    .filter(line => line !== '')
    .join('\n')

export const getDocImagePath = (imageId: string, variant: DocImageVariant): string =>
  `/api/docs/images/${encodeURIComponent(imageId)}/${variant}`

const isPrintableCharacter = (character: string): boolean => {
  const code = character.charCodeAt(0)
  return code >= 32 && code !== 127 && character !== '"'
}

export const sanitizeFileName = (fileName: string): string => {
  const baseName = fileName.split(/[\\/]/).at(-1) ?? ''
  const printableName = Array.from(baseName).filter(isPrintableCharacter).join('')
  return truncate(printableName, DOC_FILE_NAME_MAX_LENGTH) || DEFAULT_FILE_NAME
}

const countVisualTokens = ({ width, height }: ImageSize): number =>
  Math.ceil(width / DOC_VISUAL_TOKEN_SIZE) * Math.ceil(height / DOC_VISUAL_TOKEN_SIZE)

const fitsPreviewLimits = (size: ImageSize): boolean =>
  Math.ceil(Math.max(size.width, size.height) / DOC_VISUAL_TOKEN_SIZE) * DOC_VISUAL_TOKEN_SIZE <= DOC_PREVIEW_MAX_DIMENSION
  && countVisualTokens(size) <= DOC_PREVIEW_MAX_VISUAL_TOKENS

const findLongestFittingEdge = (fittingEdge: number, tooLongEdge: number, fits: (edge: number) => boolean): number => {
  if (fittingEdge + 1 >= tooLongEdge) {
    return fittingEdge
  }

  const middleEdge = Math.floor((fittingEdge + tooLongEdge) / 2)
  return fits(middleEdge)
    ? findLongestFittingEdge(middleEdge, tooLongEdge, fits)
    : findLongestFittingEdge(fittingEdge, middleEdge, fits)
}

export const getDocPreviewSize = (size: ImageSize): ImageSize => {
  if (fitsPreviewLimits(size)) {
    return size
  }

  const isLandscape = size.width >= size.height
  const longEdge = isLandscape ? size.width : size.height
  const shortEdge = isLandscape ? size.height : size.width
  const toSize = (edge: number): ImageSize => {
    const scaledShortEdge = Math.max(1, Math.round(edge * shortEdge / longEdge))
    return isLandscape ? { width: edge, height: scaledShortEdge } : { width: scaledShortEdge, height: edge }
  }

  return toSize(findLongestFittingEdge(1, longEdge, edge => fitsPreviewLimits(toSize(edge))))
}
