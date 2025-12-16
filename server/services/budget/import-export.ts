import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import ExcelJS from 'exceljs'
import { useDatabase } from '~~/server/db'
import { user, month, entry } from '~~/server/db/schema'
import { getUserMonths, createMonth } from './months'
import { createEntry } from './entries'
import type {
  BudgetExportData,
  BudgetExportMonth,
  BudgetExportEntry,
  BudgetImportOptions,
  BudgetImportResult,
  BudgetExportSchema,
} from '~~/shared/types/export-import'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const COLORS = {
  yearHeader: { bg: '2D3748', text: 'FFFFFF' },
  monthHeader: { bg: '4A5568', text: 'FFFFFF' },
  balance: { bg: 'EBF8FF', text: '2B6CB0' },
  income: { bg: 'F0FFF4', text: '276749' },
  expense: { bg: 'FFF5F5', text: 'C53030' },
  subtotal: { bg: 'EDF2F7', text: '1A202C' },
  total: { bg: 'CBD5E0', text: '1A202C' },
  header: { bg: 'E2E8F0', text: '1A202C' },
}

export const exportBudget = async (userId: string, event: H3Event): Promise<BudgetExportData> => {
  const db = useDatabase(event)
  const userData = await db
    .select({
      username: user.username,
      mainCurrency: user.mainCurrency,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const userInfo = userData[0]
  if (!userInfo) {
    throw new Error('User not found')
  }

  const monthsData = await getUserMonths(userId, event)

  const exportMonths: BudgetExportMonth[] = monthsData.map((monthData) => {
    const entries: BudgetExportEntry[] = [
      ...monthData.balanceSources.map(entryData => ({
        kind: 'balance' as const,
        description: entryData.description,
        amount: entryData.amount,
        currency: entryData.currency,
      })),
      ...monthData.incomeEntries.map(entryData => ({
        kind: 'income' as const,
        description: entryData.description,
        amount: entryData.amount,
        currency: entryData.currency,
        date: entryData.date || undefined,
      })),
      ...monthData.expenseEntries.map(entryData => ({
        kind: 'expense' as const,
        description: entryData.description,
        amount: entryData.amount,
        currency: entryData.currency,
        date: entryData.date || undefined,
      })),
    ]

    return {
      year: monthData.year,
      month: monthData.month,
      entries,
    }
  })

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    user: {
      username: userInfo.username,
      mainCurrency: userInfo.mainCurrency,
    },
    months: exportMonths,
  }
}

export const importBudget = async (
  userId: string,
  importData: BudgetExportSchema,
  options: BudgetImportOptions,
  event: H3Event,
): Promise<BudgetImportResult> => {
  const result: BudgetImportResult = {
    success: true,
    importedMonths: 0,
    importedEntries: 0,
    skippedMonths: 0,
    errors: [],
  }

  for (const importMonth of importData.months) {
    try {
      const db = useDatabase(event)
      const existingMonth = await db
        .select()
        .from(month)
        .where(and(
          eq(month.userId, userId),
          eq(month.year, importMonth.year),
          eq(month.month, importMonth.month),
        ))
        .limit(1)

      let monthId: string

      if (existingMonth.length > 0) {
        if (options.strategy === 'skip') {
          result.skippedMonths++
          continue
        }

        monthId = existingMonth[0]!.id

        await db
          .delete(entry)
          .where(eq(entry.monthId, monthId))
      }
      else {
        const createdMonth = await createMonth({
          year: importMonth.year,
          month: importMonth.month,
          targetUserId: userId,
        }, event)
        monthId = createdMonth.id
        result.importedMonths++
      }

      for (const importEntry of importMonth.entries) {
        await createEntry({
          monthId,
          kind: importEntry.kind,
          description: importEntry.description,
          amount: importEntry.amount,
          currency: importEntry.currency,
          date: importEntry.date,
        }, event)
        result.importedEntries++
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Error importing month ${importMonth.year}-${importMonth.month + 1}: ${errorMessage}`)
      result.success = false
    }
  }

  return result
}

const applyFill = (cell: ExcelJS.Cell, color: string) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color },
  }
}

const applyBorder = (cell: ExcelJS.Cell, style: 'thin' | 'medium' = 'thin') => {
  cell.border = {
    top: { style },
    left: { style },
    bottom: { style },
    right: { style },
  }
}

const styleHeaderRow = (row: ExcelJS.Row, bgColor: string, textColor: string) => {
  row.eachCell((cell) => {
    applyFill(cell, bgColor)
    cell.font = { bold: true, color: { argb: textColor } }
    applyBorder(cell)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 24
}

const styleDataRow = (row: ExcelJS.Row, bgColor: string, textColor: string) => {
  row.eachCell((cell, colNumber) => {
    applyFill(cell, bgColor)
    cell.font = { color: { argb: textColor } }
    applyBorder(cell)
    if (colNumber === 3) {
      cell.alignment = { horizontal: 'right' }
      cell.numFmt = '#,##0.00'
    }
  })
}

const addYearHeader = (worksheet: ExcelJS.Worksheet, year: number, rowNum: number): number => {
  const row = worksheet.getRow(rowNum)
  worksheet.mergeCells(rowNum, 1, rowNum, 5)
  const cell = row.getCell(1)
  cell.value = `📅 ${year}`
  cell.font = { bold: true, size: 14, color: { argb: COLORS.yearHeader.text } }
  applyFill(cell, COLORS.yearHeader.bg)
  cell.alignment = { vertical: 'middle', horizontal: 'center' }
  row.height = 28
  return rowNum + 1
}

const addMonthHeader = (worksheet: ExcelJS.Worksheet, monthName: string, rowNum: number): number => {
  const row = worksheet.getRow(rowNum)
  worksheet.mergeCells(rowNum, 1, rowNum, 5)
  const cell = row.getCell(1)
  cell.value = monthName
  cell.font = { bold: true, size: 12, color: { argb: COLORS.monthHeader.text } }
  applyFill(cell, COLORS.monthHeader.bg)
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  row.height = 22
  return rowNum + 1
}

const addTableHeader = (worksheet: ExcelJS.Worksheet, rowNum: number): number => {
  const row = worksheet.getRow(rowNum)
  row.values = ['Type', 'Description', 'Amount', 'Currency', 'Date']
  styleHeaderRow(row, COLORS.header.bg, COLORS.header.text)
  return rowNum + 1
}

const addEntryRow = (
  worksheet: ExcelJS.Worksheet,
  entryData: BudgetExportEntry,
  rowNum: number,
): number => {
  const row = worksheet.getRow(rowNum)
  const typeLabel = entryData.kind.charAt(0).toUpperCase() + entryData.kind.slice(1)
  row.values = [typeLabel, entryData.description, entryData.amount, entryData.currency, entryData.date || '']

  const colorKey = entryData.kind as keyof typeof COLORS
  const colors = COLORS[colorKey]
  styleDataRow(row, colors.bg, colors.text)

  return rowNum + 1
}

const addSubtotalRow = (
  worksheet: ExcelJS.Worksheet,
  label: string,
  amount: number,
  rowNum: number,
): number => {
  const row = worksheet.getRow(rowNum)
  worksheet.mergeCells(rowNum, 1, rowNum, 2)
  row.getCell(1).value = label
  row.getCell(3).value = amount
  row.getCell(3).numFmt = '#,##0.00'

  row.eachCell((cell) => {
    applyFill(cell, COLORS.subtotal.bg)
    cell.font = { bold: true, color: { argb: COLORS.subtotal.text } }
    applyBorder(cell)
  })
  row.getCell(1).alignment = { horizontal: 'right' }
  row.getCell(3).alignment = { horizontal: 'right' }

  return rowNum + 1
}

const addEmptyRow = (worksheet: ExcelJS.Worksheet, rowNum: number): number => {
  worksheet.getRow(rowNum).height = 10
  return rowNum + 1
}

export const exportBudgetToExcel = async (userId: string, event: H3Event): Promise<Buffer> => {
  const exportData = await exportBudget(userId, event)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'dom.cash'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Budget', {
    views: [{ state: 'frozen', ySplit: 0, xSplit: 0 }],
  })

  worksheet.columns = [
    { key: 'type', width: 12 },
    { key: 'description', width: 45 },
    { key: 'amount', width: 15 },
    { key: 'currency', width: 12 },
    { key: 'date', width: 14 },
  ]

  const sortedMonths = [...exportData.months].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year
    }
    return b.month - a.month
  })

  const monthsByYear = sortedMonths.reduce((acc, monthData) => {
    const existing = acc[monthData.year] || []
    return {
      ...acc,
      [monthData.year]: [...existing, monthData],
    }
  }, {} as Record<number, BudgetExportMonth[]>)

  const years = Object.keys(monthsByYear).map(Number).sort((a, b) => b - a)

  let currentRow = 1

  for (const year of years) {
    currentRow = addYearHeader(worksheet, year, currentRow)

    const yearMonths = monthsByYear[year] || []

    let yearIncomeTotal = 0
    let yearExpenseTotal = 0

    for (const monthData of yearMonths) {
      const monthName = MONTH_NAMES[monthData.month] || ''
      currentRow = addMonthHeader(worksheet, monthName, currentRow)
      currentRow = addTableHeader(worksheet, currentRow)

      const balanceEntries = monthData.entries.filter(e => e.kind === 'balance')
      const incomeEntries = monthData.entries.filter(e => e.kind === 'income')
      const expenseEntries = monthData.entries.filter(e => e.kind === 'expense')

      for (const entryData of balanceEntries) {
        currentRow = addEntryRow(worksheet, entryData, currentRow)
      }
      for (const entryData of incomeEntries) {
        currentRow = addEntryRow(worksheet, entryData, currentRow)
      }
      for (const entryData of expenseEntries) {
        currentRow = addEntryRow(worksheet, entryData, currentRow)
      }

      const balanceTotal = balanceEntries.reduce((sum, e) => sum + e.amount, 0)
      const incomeTotal = incomeEntries.reduce((sum, e) => sum + e.amount, 0)
      const expenseTotal = expenseEntries.reduce((sum, e) => sum + e.amount, 0)

      yearIncomeTotal += incomeTotal
      yearExpenseTotal += expenseTotal

      currentRow = addSubtotalRow(worksheet, 'Balance:', balanceTotal, currentRow)
      currentRow = addSubtotalRow(worksheet, 'Income:', incomeTotal, currentRow)
      currentRow = addSubtotalRow(worksheet, 'Expenses:', expenseTotal, currentRow)
      currentRow = addSubtotalRow(worksheet, 'Net:', incomeTotal - expenseTotal, currentRow)

      currentRow = addEmptyRow(worksheet, currentRow)
    }

    const yearTotalRow = worksheet.getRow(currentRow)
    worksheet.mergeCells(currentRow, 1, currentRow, 2)
    yearTotalRow.getCell(1).value = `Year ${year} Total Income:`
    yearTotalRow.getCell(3).value = yearIncomeTotal
    yearTotalRow.getCell(3).numFmt = '#,##0.00'
    yearTotalRow.eachCell((cell) => {
      applyFill(cell, COLORS.total.bg)
      cell.font = { bold: true, color: { argb: COLORS.total.text } }
      applyBorder(cell, 'medium')
    })
    yearTotalRow.getCell(1).alignment = { horizontal: 'right' }
    yearTotalRow.getCell(3).alignment = { horizontal: 'right' }
    currentRow++

    const yearExpenseRow = worksheet.getRow(currentRow)
    worksheet.mergeCells(currentRow, 1, currentRow, 2)
    yearExpenseRow.getCell(1).value = `Year ${year} Total Expenses:`
    yearExpenseRow.getCell(3).value = yearExpenseTotal
    yearExpenseRow.getCell(3).numFmt = '#,##0.00'
    yearExpenseRow.eachCell((cell) => {
      applyFill(cell, COLORS.total.bg)
      cell.font = { bold: true, color: { argb: COLORS.total.text } }
      applyBorder(cell, 'medium')
    })
    yearExpenseRow.getCell(1).alignment = { horizontal: 'right' }
    yearExpenseRow.getCell(3).alignment = { horizontal: 'right' }
    currentRow++

    currentRow = addEmptyRow(worksheet, currentRow)
    currentRow = addEmptyRow(worksheet, currentRow)
  }

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { key: 'year', width: 10 },
    { key: 'month', width: 15 },
    { key: 'balance', width: 15 },
    { key: 'income', width: 15 },
    { key: 'expenses', width: 15 },
    { key: 'net', width: 15 },
  ]

  const summaryHeaderRow = summarySheet.getRow(1)
  summaryHeaderRow.values = ['Year', 'Month', 'Balance', 'Income', 'Expenses', 'Net']
  styleHeaderRow(summaryHeaderRow, COLORS.header.bg, COLORS.header.text)

  let summaryRowNum = 2
  for (const year of years) {
    const yearMonths = monthsByYear[year] || []
    for (const monthData of yearMonths) {
      const row = summarySheet.getRow(summaryRowNum)
      const balanceTotal = monthData.entries.filter(e => e.kind === 'balance').reduce((sum, e) => sum + e.amount, 0)
      const incomeTotal = monthData.entries.filter(e => e.kind === 'income').reduce((sum, e) => sum + e.amount, 0)
      const expenseTotal = monthData.entries.filter(e => e.kind === 'expense').reduce((sum, e) => sum + e.amount, 0)

      row.values = [
        monthData.year,
        MONTH_NAMES[monthData.month],
        balanceTotal,
        incomeTotal,
        expenseTotal,
        incomeTotal - expenseTotal,
      ]

      row.eachCell((cell, colNumber) => {
        applyBorder(cell)
        if (colNumber >= 3) {
          cell.numFmt = '#,##0.00'
          cell.alignment = { horizontal: 'right' }
        }
      })

      const netCell = row.getCell(6)
      const netValue = incomeTotal - expenseTotal
      if (netValue > 0) {
        netCell.font = { color: { argb: COLORS.income.text } }
      }
      else if (netValue < 0) {
        netCell.font = { color: { argb: COLORS.expense.text } }
      }

      summaryRowNum++
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
