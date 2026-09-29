import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { useDatabase } from '../../server/db'
import { budgetShare, user } from '../../server/db/schema'
import { createDocument, deleteDocument, updateDocument } from '../../server/services/docs/documents'
import { createFolder, deleteFolder, getFolderDetails, listFolders, updateFolder } from '../../server/services/docs/folders'
import { findReadableImage } from '../../server/services/docs/access'
import { addImage, deleteImage, readStoredImage, reorderImages } from '../../server/services/docs/images'
import { recognizeDocument } from '../../server/services/docs/recognition'
import { DOC_MAX_DOCUMENTS, DOC_MAX_IMAGES } from '../../shared/schemas/docs'
import type { User } from '../../shared/types'
import type { UploadDocImageQuery } from '../../shared/types/docs'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const toUser = (id: string): User => ({ id, username: `${id}@example.com`, mainCurrency: 'USD', isAdmin: false })

const owner = toUser('owner')
const friend = toUser('friend')
const stranger = toUser('stranger')

const JPEG_BYTES = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01])

interface Upload {
  query: UploadDocImageQuery
  body: Uint8Array
}

const createUpload = (fileName = 'passport.png', original: Uint8Array = PNG_BYTES, preview: Uint8Array = JPEG_BYTES): Upload => ({
  query: {
    fileName,
    originalSize: original.byteLength,
    previewSize: preview.byteLength,
    thumbnailSize: JPEG_BYTES.byteLength,
    width: 1200,
    height: 800,
  },
  body: Uint8Array.from([...original, ...preview, ...JPEG_BYTES]),
})

const createDatabaseWithFriend = async (): Promise<TestDatabase> => {
  const database = createTestDatabase()
  const db = useDatabase(database.event)
  await db.insert(user).values([owner, friend, stranger].map(({ id, username }) => ({
    id,
    username,
    passwordHash: 'hash',
    mainCurrency: 'USD',
    createdAt: new Date(),
  })))
  await db.insert(budgetShare).values({
    id: 'share-friend',
    ownerId: friend.id,
    sharedWithId: owner.id,
    access: 'read',
    createdAt: new Date(),
  })
  return database
}

const createSharedDocument = async (database: TestDatabase) => {
  const folder = await createFolder(owner, { name: 'Andrew', sharedWithUserIds: [friend.id] }, database.event)
  const document = await createDocument(owner, folder.id, { title: 'Passport' }, database.event)
  return { folder, document }
}

const countRows = (database: TestDatabase, table: string): number =>
  Number(database.sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get()?.total)

const readPositions = (database: TestDatabase, documentId: string): Array<{ id: string, position: number }> =>
  database.sqlite
    .prepare('SELECT id, position FROM doc_image WHERE document_id = ? ORDER BY position')
    .all(documentId)
    .map(row => ({ id: String(row.id), position: Number(row.position) }))

const useTestMode = (context: TestContext): void => {
  const previousValue = process.env.E2E_TEST_MODE
  process.env.E2E_TEST_MODE = 'true'
  context.after(() => {
    if (previousValue === undefined) {
      delete process.env.E2E_TEST_MODE
    }
    else {
      process.env.E2E_TEST_MODE = previousValue
    }
  })
}

test('createFolder shares a folder with a connection who then sees it', async () => {
  const database = await createDatabaseWithFriend()

  const folder = await createFolder(owner, { name: 'Andrew', sharedWithUserIds: [friend.id, friend.id] }, database.event)

  assert.equal(folder.isOwner, true)
  assert.deepEqual(folder.sharedWith, [{ id: friend.id, username: friend.username }])
  const [friendFolder] = await listFolders(friend.id, database.event)
  assert.equal(friendFolder?.id, folder.id)
  assert.equal(friendFolder?.isOwner, false)
  assert.equal(friendFolder?.ownerUsername, owner.username)
  assert.deepEqual(friendFolder?.sharedWith, [])
  assert.deepEqual(await listFolders(stranger.id, database.event), [])
})

test('createFolder rejects a user who is not a connection and writes nothing', async () => {
  const database = await createDatabaseWithFriend()

  await assert.rejects(createFolder(owner, { name: 'Secret', sharedWithUserIds: [stranger.id] }, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.INVALID_SHARED_USER,
  })
  assert.equal(countRows(database, 'doc_folder'), 0)
})

test('listFolders shows the titles of the documents in the order they were added', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-28T12:00:00Z') })
  const database = await createDatabaseWithFriend()
  const folder = await createFolder(owner, { name: 'Andrew' }, database.event)
  await createDocument(owner, folder.id, { title: 'Passport' }, database.event)
  context.mock.timers.tick(1)
  await createDocument(owner, folder.id, { title: 'Insurance' }, database.event)

  const [listedFolder] = await listFolders(owner.id, database.event)

  assert.deepEqual(listedFolder?.documentTitles, ['Passport', 'Insurance'])
})

test('getFolderDetails refuses users without access and reports missing folders', async () => {
  const database = await createDatabaseWithFriend()
  const { folder } = await createSharedDocument(database)

  const details = await getFolderDetails(friend, folder.id, database.event)
  assert.equal(details.documents.length, 1)
  assert.equal(details.folder.isOwner, false)

  await assert.rejects(getFolderDetails(stranger, folder.id, database.event), {
    statusCode: 403,
    message: ERROR_KEYS.DOCS_NO_ACCESS,
  })
  await assert.rejects(getFolderDetails(owner, 'missing-folder', database.event), {
    statusCode: 404,
    message: ERROR_KEYS.DOCS_FOLDER_NOT_FOUND,
  })
})

test('updateFolder lets a participant rename the folder but not change its participants', async () => {
  const database = await createDatabaseWithFriend()
  const { folder } = await createSharedDocument(database)

  const renamed = await updateFolder(friend, folder.id, { name: 'Andrew Ivanov' }, database.event)
  assert.equal(renamed.name, 'Andrew Ivanov')
  assert.deepEqual(renamed.documentTitles, ['Passport'])

  await assert.rejects(updateFolder(friend, folder.id, { sharedWithUserIds: [] }, database.event), {
    statusCode: 403,
    message: ERROR_KEYS.CANNOT_MODIFY_SHARE_AS_NON_OWNER,
  })
})

test('updateFolder lets the owner stop sharing a folder', async () => {
  const database = await createDatabaseWithFriend()
  const { folder } = await createSharedDocument(database)

  const updated = await updateFolder(owner, folder.id, { sharedWithUserIds: [] }, database.event)

  assert.deepEqual(updated.sharedWith, [])
  assert.deepEqual(await listFolders(friend.id, database.event), [])
  await assert.rejects(getFolderDetails(friend, folder.id, database.event), { statusCode: 403 })
})

test('updateFolder keeps a participant who is no longer a connection until the owner removes them', async () => {
  const database = await createDatabaseWithFriend()
  const { folder } = await createSharedDocument(database)
  await useDatabase(database.event).delete(budgetShare)

  const renamed = await updateFolder(owner, folder.id, { name: 'Andrew Ivanov', sharedWithUserIds: [friend.id] }, database.event)
  assert.equal(renamed.name, 'Andrew Ivanov')
  assert.deepEqual(renamed.sharedWith, [{ id: friend.id, username: friend.username }])

  await assert.rejects(updateFolder(owner, folder.id, { sharedWithUserIds: [friend.id, stranger.id] }, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.INVALID_SHARED_USER,
  })

  const unshared = await updateFolder(owner, folder.id, { sharedWithUserIds: [] }, database.event)
  assert.deepEqual(unshared.sharedWith, [])

  await assert.rejects(updateFolder(owner, folder.id, { sharedWithUserIds: [friend.id] }, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.INVALID_SHARED_USER,
  })
})

test('createDocument refuses a document above the limit', async () => {
  const database = await createDatabaseWithFriend()
  const folder = await createFolder(owner, { name: 'Andrew' }, database.event)
  const insertDocument = database.sqlite.prepare('INSERT INTO doc_document (id, folder_id, title, fields, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
  Array.from({ length: DOC_MAX_DOCUMENTS }, (_, index) => insertDocument.run(`document-${index}`, folder.id, `Document ${index}`, '[]', index, index))

  await assert.rejects(createDocument(owner, folder.id, { title: 'One more' }, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_TOO_MANY_DOCUMENTS,
  })
})

test('updateDocument lets a participant replace the title and the fields', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const fields = [{ name: 'Surname', value: 'Ivanov' }, { name: 'Number', value: '45 12 345678' }]

  const updated = await updateDocument(friend, document.id, { title: 'Passport of Andrew', fields }, database.event)

  assert.equal(updated.title, 'Passport of Andrew')
  assert.deepEqual(updated.fields, fields)
  await assert.rejects(updateDocument(stranger, document.id, { fields: [] }, database.event), { statusCode: 403 })
})

test('addImage stores the three variants and numbers images in upload order', async () => {
  const database = await createDatabaseWithFriend()
  const { folder, document } = await createSharedDocument(database)
  const firstUpload = createUpload('page-1.png')
  const secondUpload = createUpload('page-2.jpg', JPEG_BYTES)

  await addImage(owner, document.id, firstUpload.query, firstUpload.body, database.event)
  const { document: updated, imageId } = await addImage(friend, document.id, secondUpload.query, secondUpload.body, database.event)

  assert.deepEqual(updated.images.map(image => [image.fileName, image.contentType, image.size, image.width, image.height]), [
    ['page-1.png', 'image/png', PNG_BYTES.byteLength, 1200, 800],
    ['page-2.jpg', 'image/jpeg', JPEG_BYTES.byteLength, 1200, 800],
  ])
  assert.deepEqual(readPositions(database, document.id).map(({ position }) => position), [0, 1])
  assert.equal(updated.images[1]?.id, imageId)
  const [firstImage] = updated.images
  assert.ok(firstImage)
  const keyPrefix = `docs/${folder.id}/${document.id}/${firstImage.id}/`
  assert.deepEqual(database.docsBucket.read(`${keyPrefix}original`), { data: PNG_BYTES, contentType: 'image/png' })
  assert.deepEqual(database.docsBucket.read(`${keyPrefix}preview`), { data: JPEG_BYTES, contentType: 'image/jpeg' })
  assert.deepEqual(database.docsBucket.read(`${keyPrefix}thumbnail`), { data: JPEG_BYTES, contentType: 'image/jpeg' })
  assert.equal(database.docsBucket.getKeys().length, 6)
})

test('addImage rejects a body that does not match the declared sizes', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const upload = createUpload()

  await assert.rejects(addImage(owner, document.id, { ...upload.query, previewSize: 1 }, upload.body, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_INVALID_UPLOAD,
  })
  assert.deepEqual(database.docsBucket.getKeys(), [])
})

test('addImage rejects files that are not images', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const svg = Uint8Array.from(Array.from('<svg onload="alert(1)"/>', character => character.charCodeAt(0)))

  const textUpload = createUpload('image.svg', svg)
  await assert.rejects(addImage(owner, document.id, textUpload.query, textUpload.body, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_UNSUPPORTED_IMAGE,
  })

  const pngPreviewUpload = createUpload('image.png', PNG_BYTES, PNG_BYTES)
  await assert.rejects(addImage(owner, document.id, pngPreviewUpload.query, pngPreviewUpload.body, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_UNSUPPORTED_IMAGE,
  })
  assert.equal(countRows(database, 'doc_image'), 0)
})

test('addImage refuses an image above the limit', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const insertImage = database.sqlite.prepare('INSERT INTO doc_image (id, document_id, position, file_name, content_type, size, stored_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  Array.from({ length: DOC_MAX_IMAGES }, (_, index) => insertImage.run(`image-${index}`, document.id, index, 'page.jpg', 'image/jpeg', 1, 3, index))
  const upload = createUpload()

  await assert.rejects(addImage(owner, document.id, upload.query, upload.body, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_TOO_MANY_IMAGES,
  })
})

test('participants read the stored variants of an image and other users do not find it', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const upload = createUpload()
  const { document: { images: [image] } } = await addImage(owner, document.id, upload.query, upload.body, database.event)
  assert.ok(image)

  const readableImage = await findReadableImage(image.id, friend.id, database.event)
  const original = await readStoredImage(database.event, readableImage, 'original')
  const preview = await readStoredImage(database.event, readableImage, 'preview')

  assert.equal(readableImage.imageRow.fileName, 'passport.png')
  assert.deepEqual(new Uint8Array(await new Response(original.body).arrayBuffer()), PNG_BYTES)
  assert.deepEqual(new Uint8Array(await new Response(preview.body).arrayBuffer()), JPEG_BYTES)
  await assert.rejects(findReadableImage(image.id, stranger.id, database.event), {
    statusCode: 404,
    message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
  })
})

test('deleteImage removes the image and its stored variants', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const firstUpload = createUpload('page-1.png')
  const secondUpload = createUpload('page-2.png')
  await addImage(owner, document.id, firstUpload.query, firstUpload.body, database.event)
  const { document: { images: [firstImage, secondImage] } } = await addImage(owner, document.id, secondUpload.query, secondUpload.body, database.event)
  assert.ok(firstImage && secondImage)

  const updated = await deleteImage(friend, firstImage.id, database.event)

  assert.deepEqual(updated.images.map(image => image.id), [secondImage.id])
  assert.equal(database.docsBucket.getKeys().length, 3)
  assert.ok(database.docsBucket.getKeys().every(key => key.includes(secondImage.id)))
})

test('reorderImages stores the new order and rejects a different set of images', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const firstUpload = createUpload('page-1.png')
  const secondUpload = createUpload('page-2.png')
  await addImage(owner, document.id, firstUpload.query, firstUpload.body, database.event)
  const { document: { images: [firstImage, secondImage] } } = await addImage(owner, document.id, secondUpload.query, secondUpload.body, database.event)
  assert.ok(firstImage && secondImage)

  const reordered = await reorderImages(owner, document.id, [secondImage.id, firstImage.id], database.event)

  assert.deepEqual(reordered.images.map(image => image.fileName), ['page-2.png', 'page-1.png'])
  await assert.rejects(reorderImages(owner, document.id, [secondImage.id], database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_INVALID_IMAGE_ORDER,
  })
  await assert.rejects(reorderImages(owner, document.id, [secondImage.id, secondImage.id], database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_INVALID_IMAGE_ORDER,
  })
})

test('deleteDocument removes its images and files and keeps other documents', async () => {
  const database = await createDatabaseWithFriend()
  const { folder, document } = await createSharedDocument(database)
  const otherDocument = await createDocument(owner, folder.id, { title: 'Insurance' }, database.event)
  const firstUpload = createUpload()
  const secondUpload = createUpload()
  await addImage(owner, document.id, firstUpload.query, firstUpload.body, database.event)
  await addImage(owner, otherDocument.id, secondUpload.query, secondUpload.body, database.event)

  await deleteDocument(friend, document.id, database.event)

  const details = await getFolderDetails(owner, folder.id, database.event)
  assert.deepEqual(details.documents.map(({ title }) => title), ['Insurance'])
  assert.equal(countRows(database, 'doc_image'), 1)
  assert.ok(database.docsBucket.getKeys().every(key => key.startsWith(`docs/${folder.id}/${otherDocument.id}/`)))
  assert.equal(database.docsBucket.getKeys().length, 3)
})

test('deleteFolder removes documents, images, shares and files', async () => {
  const database = await createDatabaseWithFriend()
  const { folder, document } = await createSharedDocument(database)
  const upload = createUpload()
  await addImage(owner, document.id, upload.query, upload.body, database.event)

  await deleteFolder(friend, folder.id, database.event)

  assert.deepEqual(['doc_folder', 'doc_folder_share', 'doc_document', 'doc_image'].map(table => countRows(database, table)), [0, 0, 0, 0])
  assert.deepEqual(database.docsBucket.getKeys(), [])
})

test('recognizeDocument keeps the user fields, adds recognized ones and names an untitled document', async (context) => {
  useTestMode(context)
  const database = await createDatabaseWithFriend()
  const folder = await createFolder(owner, { name: 'Andrew', sharedWithUserIds: [friend.id] }, database.event)
  const document = await createDocument(owner, folder.id, { title: '', fields: [{ name: 'Surname', value: 'Ivanov' }] }, database.event)
  const upload = createUpload()
  await addImage(owner, document.id, upload.query, upload.body, database.event)

  const result = await recognizeDocument(friend, document.id, { mode: 'merge', effort: 'low' }, 'en', database.event)

  assert.equal(result.addedFieldCount, 2)
  assert.equal(result.document.title, 'Test document')
  assert.deepEqual(result.document.fields, [
    { name: 'Test mode', value: 'ANTHROPIC_API_KEY is not set' },
    { name: 'Photos read', value: '1' },
    { name: 'Surname', value: 'Ivanov' },
  ])

  const repeated = await recognizeDocument(owner, document.id, { mode: 'merge', effort: 'low' }, 'en', database.event)
  assert.equal(repeated.addedFieldCount, 0)
  assert.equal(repeated.document.fields.length, 3)
})

test('recognizeDocument keeps a title the user gave and replaces fields on request', async (context) => {
  useTestMode(context)
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  await updateDocument(owner, document.id, { fields: [{ name: 'Surname', value: 'Ivanov' }] }, database.event)
  const upload = createUpload()
  await addImage(owner, document.id, upload.query, upload.body, database.event)

  const result = await recognizeDocument(owner, document.id, { mode: 'replace', effort: 'low' }, 'en', database.event)

  assert.equal(result.document.title, 'Passport')
  assert.equal(result.addedFieldCount, 2)
  assert.deepEqual(result.document.fields.map(({ name }) => name), ['Test mode', 'Photos read'])
})

test('recognizeDocument reads only the chosen images of the document', async (context) => {
  useTestMode(context)
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const firstUpload = createUpload()
  const secondUpload = createUpload()
  await addImage(owner, document.id, firstUpload.query, firstUpload.body, database.event)
  const { document: { images: [, secondImage] } } = await addImage(owner, document.id, secondUpload.query, secondUpload.body, database.event)
  assert.ok(secondImage)

  const result = await recognizeDocument(owner, document.id, { mode: 'merge', imageIds: [secondImage.id], effort: 'low' }, 'en', database.event)

  assert.deepEqual(result.document.fields.find(({ name }) => name === 'Photos read'), { name: 'Photos read', value: '1' })
  await assert.rejects(recognizeDocument(owner, document.id, { mode: 'merge', imageIds: ['other-image'], effort: 'low' }, 'en', database.event), {
    statusCode: 404,
    message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
  })
})

test('recognizeDocument needs at least one image', async (context) => {
  useTestMode(context)
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)

  await assert.rejects(recognizeDocument(owner, document.id, { mode: 'merge', effort: 'low' }, 'en', database.event), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_NO_IMAGES_TO_RECOGNIZE,
  })
})

test('recognizeDocument reports that recognition is not configured without a key outside test mode', async () => {
  const database = await createDatabaseWithFriend()
  const { document } = await createSharedDocument(database)
  const upload = createUpload()
  await addImage(owner, document.id, upload.query, upload.body, database.event)

  await assert.rejects(recognizeDocument(owner, document.id, { mode: 'merge', effort: 'low' }, 'en', database.event), {
    statusCode: 503,
    message: ERROR_KEYS.DOCS_RECOGNITION_NOT_CONFIGURED,
  })
})
