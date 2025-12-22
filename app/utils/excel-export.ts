import XLSX from 'xlsx-js-style'
import type { BudgetExportData, BudgetExportEntry, BudgetExportMonth } from '~~/shared/types/export-import'

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
  numFmt: isAmount ? '#,##0.00' : undefined,
})

const convertEntriesToMainCurrency = (
  entries: BudgetExportEntry[],
  mainCurrency: string,
  exchangeRates: Record<string, number>,
): number => {
  return entries.reduce((total, entryData) => {
    if (entryData.currency === mainCurrency) {
      return total + entryData.amount
    }

    const fromRate = exchangeRates[entryData.currency] || 1
    const toRate = exchangeRates[mainCurrency] || 1

    return total + (entryData.amount / fromRate) * toRate
  }, 0)
}

type CellValue = {
  v: string | number
  t: 's' | 'n'
  s: CellStyle
}

const createCell = (value: string | number, style: CellStyle): CellValue => ({
  v: value,
  t: typeof value === 'number' ? 'n' : 's',
  s: style,
})

export const generateExcelFromBudgetData = (exportData: BudgetExportData): Blob => {
  const workbook = XLSX.utils.book_new()

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
  const mainCurrency = exportData.user.mainCurrency

  const budgetData: (CellValue | null)[][] = []
  const merges: XLSX.Range[] = []

  for (const year of years) {
    const yearHeaderStyle = createHeaderStyle(COLORS.yearHeader.bg, COLORS.yearHeader.text)
    const yearRow: (CellValue | null)[] = [
      createCell(`📅 ${year}`, { ...yearHeaderStyle, font: { ...yearHeaderStyle.font, sz: 14 } }),
      null, null, null, null,
    ]
    const yearRowIndex = budgetData.length
    budgetData.push(yearRow)
    merges.push({ s: { r: yearRowIndex, c: 0 }, e: { r: yearRowIndex, c: 4 } })

    const yearMonths = monthsByYear[year] || []
    let yearIncomeTotal = 0
    let yearExpenseTotal = 0

    for (const monthData of yearMonths) {
      const monthName = `${MONTH_NAMES[monthData.month] || ''} ${monthData.year}`
      const monthHeaderStyle = createHeaderStyle(COLORS.monthHeader.bg, COLORS.monthHeader.text)
      const monthRow: (CellValue | null)[] = [
        createCell(monthName, { ...monthHeaderStyle, font: { ...monthHeaderStyle.font, sz: 12 }, alignment: { horizontal: 'left', vertical: 'center' } }),
        null, null, null, null,
      ]
      const monthRowIndex = budgetData.length
      budgetData.push(monthRow)
      merges.push({ s: { r: monthRowIndex, c: 0 }, e: { r: monthRowIndex, c: 4 } })

      const tableHeaderStyle = createHeaderStyle(COLORS.header.bg, COLORS.header.text)
      budgetData.push([
        createCell('Type', tableHeaderStyle),
        createCell('Description', tableHeaderStyle),
        createCell('Amount', tableHeaderStyle),
        createCell('Currency', tableHeaderStyle),
        createCell('Date', tableHeaderStyle),
      ])

      const balanceEntries = monthData.entries.filter(e => e.kind === 'balance')
      const incomeEntries = monthData.entries.filter(e => e.kind === 'income')
      const expenseEntries = monthData.entries.filter(e => e.kind === 'expense')

      const addEntryRows = (entries: BudgetExportEntry[], colorKey: 'balance' | 'income' | 'expense') => {
        const colors = COLORS[colorKey]
        for (const entryData of entries) {
          const typeLabel = entryData.kind.charAt(0).toUpperCase() + entryData.kind.slice(1)
          const style = createDataStyle(colors.bg, colors.text)
          const amountStyle = createDataStyle(colors.bg, colors.text, true)
          budgetData.push([
            createCell(typeLabel, style),
            createCell(entryData.description, style),
            createCell(entryData.amount, amountStyle),
            createCell(entryData.currency, style),
            createCell(entryData.date || '', style),
          ])
        }
      }

      addEntryRows(balanceEntries, 'balance')
      addEntryRows(incomeEntries, 'income')
      addEntryRows(expenseEntries, 'expense')

      const balanceTotal = convertEntriesToMainCurrency(balanceEntries, mainCurrency, monthData.exchangeRates)
      const incomeTotal = convertEntriesToMainCurrency(incomeEntries, mainCurrency, monthData.exchangeRates)
      const expenseTotal = convertEntriesToMainCurrency(expenseEntries, mainCurrency, monthData.exchangeRates)

      yearIncomeTotal += incomeTotal
      yearExpenseTotal += expenseTotal

      const subtotalStyle: CellStyle = {
        fill: createFill(COLORS.subtotal.bg),
        font: { bold: true, color: { rgb: COLORS.subtotal.text } },
        border: createBorder(),
        alignment: { horizontal: 'right' },
      }
      const subtotalAmountStyle: CellStyle = { ...subtotalStyle, numFmt: '#,##0.00' }

      const addSubtotalRow = (label: string, amount: number) => {
        const rowIndex = budgetData.length
        budgetData.push([
          createCell(label, subtotalStyle),
          null,
          createCell(amount, subtotalAmountStyle),
          null,
          null,
        ])
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } })
      }

      addSubtotalRow(`Balance (${mainCurrency}):`, balanceTotal)
      addSubtotalRow(`Income (${mainCurrency}):`, incomeTotal)
      addSubtotalRow(`Expenses (${mainCurrency}):`, expenseTotal)

      budgetData.push([null, null, null, null, null])
    }

    const totalStyle: CellStyle = {
      fill: createFill(COLORS.total.bg),
      font: { bold: true, color: { rgb: COLORS.total.text } },
      border: createBorder('medium'),
      alignment: { horizontal: 'right' },
    }
    const totalAmountStyle: CellStyle = { ...totalStyle, numFmt: '#,##0.00' }

    const addTotalRow = (label: string, amount: number) => {
      const rowIndex = budgetData.length
      budgetData.push([
        createCell(label, totalStyle),
        null,
        createCell(amount, totalAmountStyle),
        null,
        null,
      ])
      merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } })
    }

    addTotalRow(`Year ${year} Total Income (${mainCurrency}):`, yearIncomeTotal)
    addTotalRow(`Year ${year} Total Expenses (${mainCurrency}):`, yearExpenseTotal)

    budgetData.push([null, null, null, null, null])
    budgetData.push([null, null, null, null, null])
  }

  const worksheet = XLSX.utils.aoa_to_sheet(budgetData)
  worksheet['!merges'] = merges
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 45 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget')

  const summaryData: (CellValue | null)[][] = []
  const summaryHeaderStyle = createHeaderStyle(COLORS.header.bg, COLORS.header.text)

  summaryData.push([
    createCell('Year', summaryHeaderStyle),
    createCell('Month', summaryHeaderStyle),
    createCell(`Balance (${mainCurrency})`, summaryHeaderStyle),
    createCell(`Income (${mainCurrency})`, summaryHeaderStyle),
    createCell(`Expenses (${mainCurrency})`, summaryHeaderStyle),
  ])

  const dataStyle: CellStyle = { border: createBorder() }
  const amountStyle: CellStyle = { border: createBorder(), numFmt: '#,##0.00', alignment: { horizontal: 'right' } }

  for (const year of years) {
    const yearMonths = monthsByYear[year] || []
    for (const monthData of yearMonths) {
      const balanceEntries = monthData.entries.filter(e => e.kind === 'balance')
      const incomeEntries = monthData.entries.filter(e => e.kind === 'income')
      const expenseEntries = monthData.entries.filter(e => e.kind === 'expense')

      const balanceTotal = convertEntriesToMainCurrency(balanceEntries, mainCurrency, monthData.exchangeRates)
      const incomeTotal = convertEntriesToMainCurrency(incomeEntries, mainCurrency, monthData.exchangeRates)
      const expenseTotal = convertEntriesToMainCurrency(expenseEntries, mainCurrency, monthData.exchangeRates)

      summaryData.push([
        createCell(monthData.year, dataStyle),
        createCell(MONTH_NAMES[monthData.month] || '', dataStyle),
        createCell(balanceTotal, amountStyle),
        createCell(incomeTotal, amountStyle),
        createCell(expenseTotal, amountStyle),
      ])
    }
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ]

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
