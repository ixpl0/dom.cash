import type { BudgetExportData } from '~~/shared/types/export-import'
import { toLocalIsoDate } from '~~/shared/utils/shared/dates'
import { downloadFile } from '~/utils/download'

export type BudgetExportFormat = 'json' | 'excel'

export const useBudgetExport = () => {
  const budgetStore = useBudgetStore()

  const fetchExportData = () => $fetch<BudgetExportData>('/api/budget/export', {
    query: { username: budgetStore.targetUsernameForApi },
  })

  const exportBudget = async (format: BudgetExportFormat): Promise<void> => {
    const fileName = `budget-${toLocalIsoDate(new Date())}`

    if (format === 'excel') {
      const [exportData, { generateExcelFromBudgetData }] = await Promise.all([
        fetchExportData(),
        import('~/utils/excel-export'),
      ])
      downloadFile(generateExcelFromBudgetData(exportData), `${fileName}.xlsx`)
      return
    }

    const exportData = await fetchExportData()
    downloadFile(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), `${fileName}.json`)
  }

  return { exportBudget }
}
