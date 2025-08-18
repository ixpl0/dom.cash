import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { importBudget } from '~~/server/services/import-export'
import { budgetExportSchema, budgetImportOptionsSchema } from '~~/shared/types/export-import'
import { z } from 'zod'

const importRequestSchema = z.object({
  data: budgetExportSchema,
  options: budgetImportOptionsSchema,
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { data, options } = await parseBody(event, importRequestSchema)

  try {
    const result = await importBudget(user.id, data, options)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Import failed',
        data: result,
      })
    }

    return result
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import budget',
    })
  }
})
