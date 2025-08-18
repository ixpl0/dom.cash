import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { importBudget } from '~~/server/services/import-export'
import { budgetExportSchema, budgetImportOptionsSchema } from '~~/shared/types/export-import'
import { findUserByUsername, checkWritePermission } from '~~/server/services/months'
import { z } from 'zod'

const importRequestSchema = z.object({
  data: budgetExportSchema,
  options: budgetImportOptionsSchema,
  targetUsername: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { data, options, targetUsername } = await parseBody(event, importRequestSchema)

  let targetUserId = currentUser.id

  if (targetUsername) {
    const targetUser = await findUserByUsername(targetUsername)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Target user not found',
      })
    }

    if (targetUser.id !== currentUser.id) {
      const hasPermission = await checkWritePermission(targetUser.id, currentUser.id)
      if (!hasPermission) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Insufficient permissions to import budget',
        })
      }
    }

    targetUserId = targetUser.id
  }

  try {
    const result = await importBudget(targetUserId, data, options)

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
