import assert from 'node:assert/strict'
import { test } from 'node:test'
import XLSX from 'xlsx-js-style'
import { generateExcelFromBudgetData } from '../../app/utils/excel-export'
import type { BudgetExportData } from '../../shared/types/export-import'

const MESSAGES: Record<string, string> = {
  'excel.budgetSheet': 'Бюджет',
  'excel.summarySheet': 'Итоги',
  'excel.type': 'Тип',
  'excel.description': 'Описание',
  'excel.amount': 'Сумма',
  'excel.currency': 'Валюта',
  'excel.date': 'Дата',
  'excel.year': 'Год',
  'excel.month': 'Месяц',
  'excel.balanceTotal': 'Баланс ({currency})',
  'entryKind.income': 'доход',
}

const translate = (key: string, params: Record<string, string | number> = {}): string =>
  Object.entries(params).reduce((message, [name, value]) => message.replace(`{${name}}`, String(value)), MESSAGES[key] ?? key)

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

const exportData: BudgetExportData = {
  version: '1.0',
  exportDate: '2026-09-28T10:00:00.000Z',
  user: { username: 'anna@example.com', mainCurrency: 'USD' },
  months: [{
    year: 2026,
    month: 8,
    exchangeRates: { USD: 1 },
    entries: [{ kind: 'income', description: 'Salary', amount: 1000, currency: 'USD', date: '2026-09-10' }],
  }],
}

const readRows = (workbook: XLSX.WorkBook, sheetName: string): unknown[][] => {
  const sheet = workbook.Sheets[sheetName]
  assert.ok(sheet)
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
}

test('generateExcelFromBudgetData writes the texts in the interface language', async () => {
  const file = generateExcelFromBudgetData(exportData, { t: translate, monthNames: MONTH_NAMES })
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })

  assert.deepEqual(workbook.SheetNames, ['Бюджет', 'Итоги'])

  const budgetRows = readRows(workbook, 'Бюджет')
  assert.equal(budgetRows[1]?.[0], 'Сентябрь 2026')
  assert.deepEqual(budgetRows[2], ['Тип', 'Описание', 'Сумма', 'Валюта', 'Дата'])
  assert.deepEqual(budgetRows[3], ['Доход', 'Salary', 1000, 'USD', '2026-09-10'])
  assert.equal(budgetRows[4]?.[0], 'Баланс (USD):')

  assert.deepEqual(readRows(workbook, 'Итоги')[0]?.slice(0, 3), ['Год', 'Месяц', 'Баланс (USD)'])
})
