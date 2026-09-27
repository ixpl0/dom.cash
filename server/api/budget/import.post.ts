import { z } from 'zod'
import { createError, isError } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { importBudget } from '~~/server/services/budget/import-export'
import { resolveBudget } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { budgetExportSchema, budgetImportOptionsSchema } from '~~/shared/schemas/export-import'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const maxImportPayloadBytes = 1 * 1024 * 1024

const importRequestSchema = z.object({
  data: budgetExportSchema,
  options: budgetImportOptionsSchema,
  username: z.string().optional(),
}).refine(
  payload => JSON.stringify(payload).length <= maxImportPayloadBytes,
  { message: ERROR_KEYS.IMPORT_FILE_TOO_LARGE },
)

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { data, options, username } = await parseBody(event, importRequestSchema)

  const { owner } = await resolveBudget(event, currentUser, username, 'write', ERROR_KEYS.INSUFFICIENT_PERMISSIONS_IMPORT)

  try {
    const result = await importBudget(owner.id, data, options, event)

    if (result.importedMonths > 0 || result.importedEntries > 0) {
      await sendNotification(event, {
        sourceUserId: currentUser.id,
        budgetOwnerId: owner.id,
        type: 'budget_imported',
        params: {
          username: currentUser.username,
          monthsCount: result.importedMonths,
          entriesCount: result.importedEntries,
        },
      })
    }

    if (!result.success) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.IMPORT_FAILED,
        data: result,
      })
    }

    return result
  }
  catch (error) {
    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_IMPORT_BUDGET,
    })
  }
})
