import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { docDocument, docFolder } from '~~/server/db/schema'
import { isFolderVisibleTo } from '~~/server/services/docs/access'
import { listFolders } from '~~/server/services/docs/folders'
import { defineMcpTool, toolResult, type McpContext } from '~~/server/services/mcp/tool-definition'
import { matchesAllWords, toSearchWords } from '~~/server/services/mcp/text-search'
import type { DocField } from '~~/shared/types/docs'

const MAX_DOCUMENTS = 20

const listVisibleDocuments = ({ event, user }: McpContext) => {
  const db = useDatabase(event)

  return db
    .select({ folderName: docFolder.name, title: docDocument.title, fields: docDocument.fields })
    .from(docDocument)
    .innerJoin(docFolder, eq(docDocument.folderId, docFolder.id))
    .where(isFolderVisibleTo(db, user.id))
    .orderBy(asc(docFolder.createdAt), asc(docFolder.id), asc(docDocument.createdAt), asc(docDocument.id))
}

const toSearchTexts = (folderName: string, title: string, fields: readonly DocField[]): string[] =>
  [folderName, title, ...fields.flatMap(({ name, value }) => [name, value])]

export const listDocFoldersTool = defineMcpTool({
  name: 'list_doc_folders',
  title: 'Document folders',
  description: 'Folders of dom.cash documents (a person, a car, a home) with the titles of their documents. '
    + 'search_documents returns the fields of the documents.',
  scope: 'docs',
  input: z.object({}),
  run: async (_input, { event, user }) => {
    const folders = await listFolders(user.id, event)

    return toolResult({
      folders: folders.map(({ name, isOwner, ownerUsername, sharedWith, documentTitles }) => ({
        name,
        ...(isOwner ? {} : { owner: ownerUsername }),
        ...(sharedWith.length > 0 ? { sharedWith: sharedWith.map(({ username }) => username) } : {}),
        documents: documentTitles,
      })),
    })
  },
})

export const searchDocumentsTool = defineMcpTool({
  name: 'search_documents',
  title: 'Search documents',
  description: 'Documents (passports, insurance, car papers and so on) whose folder name, title, field names or values contain '
    + 'every word of the query, with all their fields. Words match inside other words, so short stems find every form.',
  scope: 'docs',
  input: z.object({
    query: z.string().trim().min(1).max(200),
  }),
  run: async ({ query }, context) => {
    const words = toSearchWords(query)
    const documents = (await listVisibleDocuments(context))
      .filter(({ folderName, title, fields }) => matchesAllWords(toSearchTexts(folderName, title, fields), words))

    return toolResult({
      count: documents.length,
      documents: documents.slice(0, MAX_DOCUMENTS).map(({ folderName, title, fields }) => ({
        folder: folderName,
        title,
        fields: fields.map(({ name, value }) => `${name}: ${value}`),
      })),
      ...(documents.length > MAX_DOCUMENTS ? { truncated: true } : {}),
    })
  },
})
