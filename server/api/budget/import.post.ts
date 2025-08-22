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
    const targetUser = await findUserByUsername(targetUsername, event)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: 'Target user not found',
      })
    }

    if (targetUser.id !== currentUser.id) {
      const hasPermission = await checkWritePermission(targetUser.id, currentUser.id, event)
      if (!hasPermission) {
        throw createError({
          statusCode: 403,
          message: 'Insufficient permissions to import budget',
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
        message: 'Import failed',
        data: result,
      })
    }

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: targetUserId,
        type: 'budget_imported',
        message: `${currentUser.username} импортировал бюджет (месяцев: ${result.importedMonths}, записей: ${result.importedEntries})`,
      })
    }
    catch (error) {
      console.error('Error creating notification:', error)
    }

    return result
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to import budget',
    })
  }
})
