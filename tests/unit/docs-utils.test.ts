import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatFileSize } from '../../app/utils/file-size'
import { detectImageContentType } from '../../server/utils/image-type'
import {
  DOC_FIELD_NAME_MAX_LENGTH,
  DOC_MAX_FIELDS,
  docFieldSchema,
  recognizeDocDocumentSchema,
  uploadDocImageQuerySchema,
} from '../../shared/schemas/docs'
import type { DocField } from '../../shared/types/docs'
import {
  appendRecognizedFields,
  formatDocFieldsForCopy,
  getDocImagePath,
  getDocPreviewSize,
  mergeRecognizedFields,
  normalizeRecognizedTitle,
  sanitizeFileName,
  type RecognizedDocField,
} from '../../shared/utils/docs'

const surname: DocField = { name: 'Surname', value: 'Ivanov' }
const givenName: DocField = { name: 'Given name', value: 'Andrew' }
const phone: DocField = { name: 'Phone', value: '+7 900 000-00-00' }

const existing = (existingNumber: number): RecognizedDocField => ({ existingNumber, name: '', value: '' })
const recognized = (name: string, value: string): RecognizedDocField => ({ existingNumber: null, name, value })

test('mergeRecognizedFields places kept and new fields in the recognized order', () => {
  const fields = mergeRecognizedFields([surname, givenName], [
    recognized('Number', '45 12 345678'),
    existing(2),
    existing(1),
    recognized('Date of birth', '01.02.1990'),
  ])

  assert.deepEqual(fields, [
    { name: 'Number', value: '45 12 345678' },
    givenName,
    surname,
    { name: 'Date of birth', value: '01.02.1990' },
  ])
})

test('mergeRecognizedFields keeps the fields the model left out at the end', () => {
  const fields = mergeRecognizedFields([surname, givenName, phone], [existing(2), recognized('Number', '123')])

  assert.deepEqual(fields, [givenName, { name: 'Number', value: '123' }, surname, phone])
})

test('mergeRecognizedFields keeps user values even when the model repeats the field with other text', () => {
  const fields = mergeRecognizedFields([surname], [{ existingNumber: 1, name: 'Surname', value: 'IVANOV' }])

  assert.deepEqual(fields, [surname])
})

test('mergeRecognizedFields uses each kept field once', () => {
  const fields = mergeRecognizedFields([surname, givenName], [existing(1), existing(1), existing(2)])

  assert.deepEqual(fields, [surname, givenName])
})

test('mergeRecognizedFields treats an unknown number with a name as a new field', () => {
  const fields = mergeRecognizedFields([surname], [{ existingNumber: 7, name: 'Number', value: '123' }, existing(0), existing(1.5)])

  assert.deepEqual(fields, [{ name: 'Number', value: '123' }, surname])
})

test('mergeRecognizedFields drops empty fields and fields that repeat existing ones', () => {
  const fields = mergeRecognizedFields([surname], [
    recognized('surname', 'ivanov'),
    recognized('Number', ''),
    recognized('', '123'),
    recognized('Number', '123'),
    recognized('NUMBER', '123'),
    existing(1),
  ])

  assert.deepEqual(fields, [{ name: 'Number', value: '123' }, surname])
})

test('mergeRecognizedFields trims values and the colon after a name', () => {
  const fields = mergeRecognizedFields([], [recognized('  Issued by :  ', '  Department of Internal Affairs  ')])

  assert.deepEqual(fields, [{ name: 'Issued by', value: 'Department of Internal Affairs' }])
})

test('mergeRecognizedFields cuts names to the maximum length', () => {
  const [field] = mergeRecognizedFields([], [recognized('N'.repeat(DOC_FIELD_NAME_MAX_LENGTH + 20), 'value')])

  assert.equal(field?.name.length, DOC_FIELD_NAME_MAX_LENGTH)
})

test('mergeRecognizedFields adds new fields only up to the field limit and keeps every existing one', () => {
  const existingFields = Array.from({ length: DOC_MAX_FIELDS - 1 }, (_, index) => ({ name: `Field ${index}`, value: 'value' }))
  const fields = mergeRecognizedFields(existingFields, [recognized('First', '1'), recognized('Second', '2')])

  assert.equal(fields.length, DOC_MAX_FIELDS)
  assert.deepEqual(fields[0], { name: 'First', value: '1' })
  assert.deepEqual(fields.slice(1), existingFields)
})

test('appendRecognizedFields keeps the current order and adds new fields after it', () => {
  const fields = appendRecognizedFields([givenName, surname], [
    recognized('Number', '123'),
    existing(1),
    recognized('Surname', 'Ivanov'),
  ])

  assert.deepEqual(fields, [givenName, surname, { name: 'Number', value: '123' }])
})

test('normalizeRecognizedTitle trims the title', () => {
  assert.equal(normalizeRecognizedTitle('  Passport  '), 'Passport')
})

test('formatDocFieldsForCopy puts the title and one field per line', () => {
  assert.equal(formatDocFieldsForCopy('Passport', [surname, givenName]), 'Passport\nSurname: Ivanov\nGiven name: Andrew')
})

test('formatDocFieldsForCopy leaves out an empty title', () => {
  assert.equal(formatDocFieldsForCopy('  ', [surname]), 'Surname: Ivanov')
})

test('getDocImagePath builds the address of an image variant', () => {
  assert.equal(getDocImagePath('image-id', 'thumbnail'), '/api/docs/images/image-id/thumbnail')
})

const fileNameCases = [
  { input: 'passport.jpg', expected: 'passport.jpg' },
  { input: 'C:\\photos\\page "1".jpg', expected: 'page 1.jpg' },
  { input: '/tmp/scan.png', expected: 'scan.png' },
  { input: 'bad\u0000name\u007f.jpg', expected: 'badname.jpg' },
  { input: '   ', expected: 'image' },
]

fileNameCases.forEach(({ input, expected }) => {
  test(`sanitizeFileName turns ${JSON.stringify(input)} into ${JSON.stringify(expected)}`, () => {
    assert.equal(sanitizeFileName(input), expected)
  })
})

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values)
const ascii = (text: string): number[] => Array.from(text, character => character.charCodeAt(0))

const imageTypeCases = [
  { name: 'JPEG', data: bytes(0xFF, 0xD8, 0xFF, 0xE0), expected: 'image/jpeg' },
  { name: 'PNG', data: bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00), expected: 'image/png' },
  { name: 'GIF', data: bytes(...ascii('GIF89a')), expected: 'image/gif' },
  { name: 'WebP', data: bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')), expected: 'image/webp' },
  { name: 'HEIC', data: bytes(0, 0, 0, 24, ...ascii('ftypheic')), expected: 'image/heic' },
  { name: 'HEIF', data: bytes(0, 0, 0, 24, ...ascii('ftypmif1')), expected: 'image/heif' },
  { name: 'AVIF', data: bytes(0, 0, 0, 24, ...ascii('ftypavif')), expected: 'image/avif' },
  { name: 'BMP', data: bytes(...ascii('BM'), 0, 0), expected: 'image/bmp' },
  { name: 'TIFF', data: bytes(0x49, 0x49, 0x2A, 0x00), expected: 'image/tiff' },
  { name: 'SVG text', data: bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg">')), expected: null },
  { name: 'an empty file', data: bytes(), expected: null },
  { name: 'MP4 video', data: bytes(0, 0, 0, 24, ...ascii('ftypisom')), expected: null },
]

imageTypeCases.forEach(({ name, data, expected }) => {
  test(`detectImageContentType reads ${name}`, () => {
    assert.equal(detectImageContentType(data), expected)
  })
})

test('docFieldSchema trims the field and needs a name', () => {
  assert.deepEqual(docFieldSchema.parse({ name: ' Surname ', value: ' Ivanov ' }), { name: 'Surname', value: 'Ivanov' })
  assert.equal(docFieldSchema.safeParse({ name: '  ', value: 'Ivanov' }).success, false)
  assert.equal(docFieldSchema.safeParse({ name: 'Note', value: '' }).success, true)
})

test('uploadDocImageQuerySchema reads sizes from the query string', () => {
  const query = uploadDocImageQuerySchema.parse({ fileName: 'scan.jpg', originalSize: '10', previewSize: '5', thumbnailSize: '2', width: '1200' })

  assert.deepEqual(query, { fileName: 'scan.jpg', originalSize: 10, previewSize: 5, thumbnailSize: 2, width: 1200 })
  assert.equal(uploadDocImageQuerySchema.safeParse({ fileName: 'scan.jpg', originalSize: '0', previewSize: '5', thumbnailSize: '2' }).success, false)
  assert.equal(uploadDocImageQuerySchema.safeParse({ fileName: 'scan.jpg', originalSize: String(50 * 1024 * 1024), previewSize: '5', thumbnailSize: '2' }).success, false)
})

test('recognizeDocDocumentSchema accepts the two modes only', () => {
  assert.equal(recognizeDocDocumentSchema.safeParse({ mode: 'merge' }).success, true)
  assert.equal(recognizeDocDocumentSchema.safeParse({ mode: 'replace', imageIds: ['a'] }).success, true)
  assert.equal(recognizeDocDocumentSchema.safeParse({ mode: 'append' }).success, false)
  assert.equal(recognizeDocDocumentSchema.safeParse({ mode: 'merge', imageIds: [] }).success, false)
})

test('recognizeDocDocumentSchema takes the lowest effort unless another known effort is chosen', () => {
  assert.equal(recognizeDocDocumentSchema.parse({ mode: 'merge' }).effort, 'low')
  assert.equal(recognizeDocDocumentSchema.parse({ mode: 'merge', effort: 'max' }).effort, 'max')
  assert.equal(recognizeDocDocumentSchema.safeParse({ mode: 'merge', effort: 'extreme' }).success, false)
})

const fileSizeCases = [
  { bytes: 512, locale: 'en', expected: '0.5 kB' },
  { bytes: 2048, locale: 'en', expected: '2 kB' },
  { bytes: 4.2 * 1024 * 1024, locale: 'en', expected: '4.2 MB' },
  { bytes: 4.2 * 1024 * 1024, locale: 'ru', expected: '4,2 МБ' },
  { bytes: 3 * 1024 * 1024 * 1024, locale: 'en', expected: '3 GB' },
]

fileSizeCases.forEach(({ bytes, locale, expected }) => {
  test(`formatFileSize shows ${bytes} bytes as ${expected} in ${locale}`, () => {
    assert.equal(formatFileSize(bytes, locale), expected)
  })
})

const previewSizeCases = [
  { name: 'keeps a photo that fits the model limits', size: { width: 1200, height: 1600 }, expected: { width: 1200, height: 1600 } },
  { name: 'shrinks a 4K frame to the size from the vision guide', size: { width: 3840, height: 2160 }, expected: { width: 2576, height: 1449 } },
  { name: 'shrinks a 12 MP photo to the visual token budget', size: { width: 4032, height: 3024 }, expected: { width: 2212, height: 1659 } },
  { name: 'shrinks a portrait photo the same way', size: { width: 3024, height: 4032 }, expected: { width: 1659, height: 2212 } },
  { name: 'limits the long edge of a panorama', size: { width: 10000, height: 1000 }, expected: { width: 2576, height: 258 } },
]

previewSizeCases.forEach(({ name, size, expected }) => {
  test(`getDocPreviewSize ${name}`, () => {
    const previewSize = getDocPreviewSize(size)

    assert.deepEqual({ width: previewSize.width, height: previewSize.height }, expected)
  })
})
