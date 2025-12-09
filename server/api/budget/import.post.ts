import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { importBudget } from '~~/server/services/import-export'
import { budgetExportSchema, budgetImportOptionsSchema } from '~~/shared/types/export-import'
import { findUserByUsername } from '~~/server/services/months'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { z } from 'zod'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const importRequestSchema = z.object({
  data: budgetExportSchema,
  options: budgetImportOptionsSchema,
  targetUsername: z.string().optional(),
}).refine((data) => {
  const jsonSize = JSON.stringify(data).length
  if (jsonSize > 1 * 1024 * 1024) {
    throw new Error(ERROR_KEYS.IMPORT_FILE_TOO_LARGE)
  }
  return true
}, {
  message: ERROR_KEYS.IMPORT_VALIDATION_FAILED,
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { data, options, targetUsername } = await parseBody(event, importRequestSchema)

  let targetUserId = currentUser.id

  if (targetUsername) {
    const targetUser = await findUserByUsername(targetUsername, event)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: ERROR_KEYS.TARGET_USER_NOT_FOUND,
      })
    }

    if (targetUser.id !== currentUser.id) {
      const hasPermission = await checkBudgetWritePermission(targetUser.id, currentUser.id, event)
      if (!hasPermission) {
        throw createError({
          statusCode: 403,
          message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_IMPORT,
        })
      }
    }

    targetUserId = targetUser.id
  }

  try {
    const result = await importBudget(targetUserId, data, options, event)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.IMPORT_FAILED,
        data: result,
      })
    }

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: targetUserId,
        type: 'budget_imported',
        params: {
          username: currentUser.username,
          monthsCount: result.importedMonths,
          entriesCount: result.importedEntries,
        },
      })
    }
    catch (error) {
      secureLog.error('Error creating notification:', error)
    }

    return result
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_IMPORT_BUDGET,
    })
  }
})
