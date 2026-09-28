import type { EntryKind } from '~~/shared/types'
import XLSX from 'xlsx-js-style'
import type { BudgetExportData, BudgetExportEntry, BudgetExportMonth } from '~~/shared/types/export-import'
import { calculateTotalBalance } from '~~/shared/utils/budget/budget'
import { sortMonthsNewestFirst } from '~~/shared/utils/budget/month-helpers'
import { capitalizeFirstLetter } from '~~/shared/utils/shared/text'
import type { Translate } from '~~/shared/types/i18n'

export interface ExcelTexts {
  t: Translate
  monthNames: readonly string[]
}

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

const EXPORTED_KINDS: readonly EntryKind[] = ['balance', 'income', 'expense']

const AMOUNT_FORMAT = '#,##0.00'

type CellStyle = XLSX.CellStyle

const createFill = (color: string): CellStyle['fill'] => ({
  patternType: 'solid',
  fgColor: { rgb: color },
})

const createBorder = (style: 'thin' | 'medium' = 'thin'): CellStyle['border'] => ({
  top: { style, color: { rgb: '000000' } },
  bottom: { style, color: { rgb: '000000' } },
  left: { style, color: { rgb: '000000' } },
  right: { style, color: { rgb: '000000' } },
})

const createHeaderStyle = (bgColor: string, textColor: string): CellStyle => ({
  fill: createFill(bgColor),
  font: { bold: true, color: { rgb: textColor } },
  border: createBorder(),
  alignment: { vertical: 'center', horizontal: 'center' },
})

const createDataStyle = (bgColor: string, textColor: string, isAmount = false): CellStyle => ({
  fill: createFill(bgColor),
  font: { color: { rgb: textColor } },
  border: createBorder(),
  alignment: isAmount ? { horizontal: 'right' } : undefined,
  numFmt: isAmount ? AMOUNT_FORMAT : undefined,
})

const createTotalStyle = (bgColor: string, textColor: string, borderStyle: 'thin' | 'medium'): CellStyle => ({
  fill: createFill(bgColor),
  font: { bold: true, color: { rgb: textColor } },
  border: createBorder(borderStyle),
  alignment: { horizontal: 'right' },
})

type CellValue = {
  v: string | number
  t: 's' | 'n'
  s: CellStyle
}

type Cells = (CellValue | null)[]

interface SheetRow {
  cells: Cells
  mergedUntilColumn?: number
}

interface MonthTotals {
  balance: number
  income: number
  expense: number
}

interface MonthWithTotals {
  monthData: BudgetExportMonth
  totals: MonthTotals
}

const createCell = (value: string | number, style: CellStyle): CellValue => ({
  v: value,
  t: typeof value === 'number' ? 'n' : 's',
  s: style,
})

const createEmptyRow = (): SheetRow => ({ cells: [null, null, null, null, null] })

const createTitleRow = (title: string, style: CellStyle): SheetRow => ({
  cells: [createCell(title, style), null, null, null, null],
  mergedUntilColumn: 4,
})

const createTotalRow = (label: string, amount: number, style: CellStyle): SheetRow => ({
  cells: [createCell(label, style), null, createCell(amount, { ...style, numFmt: AMOUNT_FORMAT }), null, null],
  mergedUntilColumn: 1,
})

const getEntriesOfKind = (monthData: BudgetExportMonth, kind: EntryKind): BudgetExportEntry[] =>
  monthData.entries.filter(entryData => entryData.kind === kind)

const getMonthTotals = (monthData: BudgetExportMonth, mainCurrency: string): MonthTotals => {
  const getTotal = (kind: EntryKind): number =>
    calculateTotalBalance(getEntriesOfKind(monthData, kind), mainCurrency, monthData.exchangeRates ?? {})

  return {
    balance: getTotal('balance'),
    income: getTotal('income'),
    expense: getTotal('expense'),
  }
}

const sumOf = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0)

const createEntryRow = (entryData: BudgetExportEntry, t: Translate): SheetRow => {
  const colors = COLORS[entryData.kind]
  const typeLabel = capitalizeFirstLetter(t(`entryKind.${entryData.kind}`))
  const style = createDataStyle(colors.bg, colors.text)
  const amountStyle = createDataStyle(colors.bg, colors.text, true)

  return {
    cells: [
      createCell(typeLabel, style),
      createCell(entryData.description, style),
      createCell(entryData.amount, amountStyle),
      createCell(entryData.currency, style),
      createCell(entryData.date || '', style),
    ],
  }
}

const createMonthRows = ({ monthData, totals }: MonthWithTotals, mainCurrency: string, { t, monthNames }: ExcelTexts): SheetRow[] => {
  const monthHeaderStyle = createHeaderStyle(COLORS.monthHeader.bg, COLORS.monthHeader.text)
  const tableHeaderStyle = createHeaderStyle(COLORS.header.bg, COLORS.header.text)
  const subtotalStyle = createTotalStyle(COLORS.subtotal.bg, COLORS.subtotal.text, 'thin')

  return [
    createTitleRow(
      `${monthNames[monthData.month] ?? ''} ${monthData.year}`,
      { ...monthHeaderStyle, font: { ...monthHeaderStyle.font, sz: 12 }, alignment: { horizontal: 'left', vertical: 'center' } },
    ),
    {
      cells: [
        createCell(t('excel.type'), tableHeaderStyle),
        createCell(t('excel.description'), tableHeaderStyle),
        createCell(t('excel.amount'), tableHeaderStyle),
        createCell(t('excel.currency'), tableHeaderStyle),
        createCell(t('excel.date'), tableHeaderStyle),
      ],
    },
    ...EXPORTED_KINDS.flatMap(kind => getEntriesOfKind(monthData, kind).map(entryData => createEntryRow(entryData, t))),
    createTotalRow(`${t('excel.balanceTotal', { currency: mainCurrency })}:`, totals.balance, subtotalStyle),
    createTotalRow(`${t('excel.incomeTotal', { currency: mainCurrency })}:`, totals.income, subtotalStyle),
    createTotalRow(`${t('excel.expensesTotal', { currency: mainCurrency })}:`, totals.expense, subtotalStyle),
    createEmptyRow(),
  ]
}

const createYearRows = (year: number, months: MonthWithTotals[], mainCurrency: string, texts: ExcelTexts): SheetRow[] => {
  const { t } = texts
  const yearHeaderStyle = createHeaderStyle(COLORS.yearHeader.bg, COLORS.yearHeader.text)
  const totalStyle = createTotalStyle(COLORS.total.bg, COLORS.total.text, 'medium')

  return [
    createTitleRow(`📅 ${year}`, { ...yearHeaderStyle, font: { ...yearHeaderStyle.font, sz: 14 } }),
    ...months.flatMap(monthWithTotals => createMonthRows(monthWithTotals, mainCurrency, texts)),
    createTotalRow(
      `${t('excel.yearIncomeTotal', { year, currency: mainCurrency })}:`,
      sumOf(months.map(({ totals }) => totals.income)),
      totalStyle,
    ),
    createTotalRow(
      `${t('excel.yearExpensesTotal', { year, currency: mainCurrency })}:`,
      sumOf(months.map(({ totals }) => totals.expense)),
      totalStyle,
    ),
    createEmptyRow(),
    createEmptyRow(),
  ]
}

const getMerges = (rows: readonly SheetRow[]): XLSX.Range[] =>
  rows.flatMap(({ mergedUntilColumn }, rowIndex) => mergedUntilColumn === undefined
    ? []
    : [{ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: mergedUntilColumn } }])

const createSummaryRows = (months: readonly MonthWithTotals[], mainCurrency: string, { t, monthNames }: ExcelTexts): Cells[] => {
  const headerStyle = createHeaderStyle(COLORS.header.bg, COLORS.header.text)
  const dataStyle: CellStyle = { border: createBorder() }
  const amountStyle: CellStyle = { border: createBorder(), numFmt: AMOUNT_FORMAT, alignment: { horizontal: 'right' } }

  return [
    [
      createCell(t('excel.year'), headerStyle),
      createCell(t('excel.month'), headerStyle),
      createCell(t('excel.balanceTotal', { currency: mainCurrency }), headerStyle),
      createCell(t('excel.incomeTotal', { currency: mainCurrency }), headerStyle),
      createCell(t('excel.expensesTotal', { currency: mainCurrency }), headerStyle),
    ],
    ...months.map(({ monthData, totals }) => [
      createCell(monthData.year, dataStyle),
      createCell(monthNames[monthData.month] ?? '', dataStyle),
      createCell(totals.balance, amountStyle),
      createCell(totals.income, amountStyle),
      createCell(totals.expense, amountStyle),
    ]),
  ]
}

export const generateExcelFromBudgetData = (exportData: BudgetExportData, texts: ExcelTexts): Blob => {
  const { t } = texts
  const mainCurrency = exportData.user.mainCurrency
  const months = sortMonthsNewestFirst(exportData.months)
    .map(monthData => ({ monthData, totals: getMonthTotals(monthData, mainCurrency) }))
  const years = [...new Set(months.map(({ monthData }) => monthData.year))]
  const budgetRows = years.flatMap(year =>
    createYearRows(year, months.filter(({ monthData }) => monthData.year === year), mainCurrency, texts),
  )

  const workbook = XLSX.utils.book_new()

  const worksheet = XLSX.utils.aoa_to_sheet(budgetRows.map(({ cells }) => cells))
  worksheet['!merges'] = getMerges(budgetRows)
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 45 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, t('excel.budgetSheet'))

  const summarySheet = XLSX.utils.aoa_to_sheet(createSummaryRows(months, mainCurrency, texts))
  summarySheet['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ]

  XLSX.utils.book_append_sheet(workbook, summarySheet, t('excel.summarySheet'))

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
