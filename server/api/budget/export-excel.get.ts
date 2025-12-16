import { requireAuth } from '~~/server/utils/session'
import { exportBudgetToExcel } from '~~/server/services/budget/import-export'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  try {
    const excelBuffer = await exportBudgetToExcel(user.id, event)
    const filename = `budget-${new Date().toISOString().split('T')[0]}.xlsx`

    setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return new Uint8Array(excelBuffer)
  }
  catch {
    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_EXPORT_BUDGET,
    })
  }
})
