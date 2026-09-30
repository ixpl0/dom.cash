import { eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { user, month, entry, plan } from '~~/server/db/schema'
import { loadMonths } from './months'
import { getUserPlans } from './plans'
import { convertPlansToCurrency } from './currency'
import { chunkArray, getRowsPerInsertStatement } from '~~/server/utils/d1-limits'
import { CURRENT_BUDGET_EXPORT_VERSION } from '~~/shared/schemas/export-import'
import type {
  BudgetExportData,
  BudgetExportMonth,
  BudgetExportPlan,
  BudgetExportEntry,
  BudgetImportOptions,
  BudgetImportResult,
} from '~~/shared/types/export-import'

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

  const monthsData = await loadMonths(userId, 'all', event)

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
        ...(entryData.isOptional ? { isOptional: true } : {}),
      })),
    ]

    return {
      year: monthData.year,
      month: monthData.month,
      entries,
      exchangeRates: monthData.exchangeRates,
    }
  })

  const userPlans = await getUserPlans(userId, event)
  const exportPlans: BudgetExportPlan[] = userPlans.map(planRow => ({
    year: planRow.year,
    month: planRow.month,
    plannedBalanceChange: planRow.plannedBalanceChange,
    comment: planRow.comment,
  }))

  return {
    version: CURRENT_BUDGET_EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    user: {
      username: userInfo.username,
      mainCurrency: userInfo.mainCurrency,
    },
    months: exportMonths,
    plans: exportPlans,
  }
}

interface MonthPosition {
  year: number
  month: number
}

const makeMonthKey = ({ year, month: monthIndex }: MonthPosition): string => `${year}-${monthIndex}`

const keepFirstOfEveryMonth = <T extends MonthPosition>(items: readonly T[]): T[] => {
  const firstIndexByMonth = items.reduceRight(
    (indexes, item, index) => indexes.set(makeMonthKey(item), index),
    new Map<string, number>(),
  )
  return items.filter((item, index) => firstIndexByMonth.get(makeMonthKey(item)) === index)
}

const monthsPerInsertStatement = getRowsPerInsertStatement(month)

const entriesPerInsertStatement = getRowsPerInsertStatement(entry)

const plansPerInsertStatement = getRowsPerInsertStatement(plan)

const planConflictTarget = [plan.userId, plan.year, plan.month]

export const importBudget = async (
  userId: string,
  importData: BudgetExportData,
  options: BudgetImportOptions,
  event: H3Event,
): Promise<BudgetImportResult> => {
  const db = useDatabase(event)
  const isOverwrite = options.strategy === 'overwrite'
  const fileCurrency = importData.user.mainCurrency

  const [[account], existingMonths] = await Promise.all([
    db.select({ mainCurrency: user.mainCurrency }).from(user).where(eq(user.id, userId)).limit(1),
    db.select({ id: month.id, year: month.year, month: month.month }).from(month).where(eq(month.userId, userId)),
  ])

  const importPlans = await convertPlansToCurrency(
    keepFirstOfEveryMonth(importData.plans ?? []),
    fileCurrency,
    account?.mainCurrency ?? fileCurrency,
    event,
  )

  const existingMonthIds = new Map(existingMonths.map(row => [makeMonthKey(row), row.id]))
  const importMonths = keepFirstOfEveryMonth(importData.months)
  const monthsToWrite = importMonths
    .filter(importMonth => isOverwrite || !existingMonthIds.has(makeMonthKey(importMonth)))
    .map((importMonth) => {
      const existingId = existingMonthIds.get(makeMonthKey(importMonth))
      return { importMonth, isNew: existingId === undefined, monthId: existingId ?? crypto.randomUUID() }
    })

  const overwrittenMonthIds = monthsToWrite
    .filter(({ isNew }) => !isNew)
    .map(({ monthId }) => monthId)

  const newMonths = monthsToWrite
    .filter(({ isNew }) => isNew)
    .map(({ importMonth, monthId }) => ({
      id: monthId,
      userId,
      year: importMonth.year,
      month: importMonth.month,
    }))

  const entriesToInsert = monthsToWrite.flatMap(({ importMonth, monthId }) => importMonth.entries.map(importEntry => ({
    id: crypto.randomUUID(),
    monthId,
    kind: importEntry.kind,
    description: importEntry.description,
    amount: importEntry.amount,
    currency: importEntry.currency,
    date: importEntry.date ?? null,
    isOptional: importEntry.kind === 'expense' && importEntry.isOptional === true,
  })))

  const plansToSave = importPlans.map(importPlan => ({
    id: crypto.randomUUID(),
    userId,
    year: importPlan.year,
    month: importPlan.month,
    plannedBalanceChange: importPlan.plannedBalanceChange,
    comment: importPlan.comment ?? null,
  }))

  await db.batch([
    db.delete(entry).where(sql`${entry.monthId} IN (SELECT value FROM json_each(${JSON.stringify(overwrittenMonthIds)}))`),
    ...chunkArray(newMonths, monthsPerInsertStatement).map(monthChunk => db.insert(month).values(monthChunk)),
    ...chunkArray(entriesToInsert, entriesPerInsertStatement).map(entryChunk => db.insert(entry).values(entryChunk)),
    ...chunkArray(plansToSave, plansPerInsertStatement).map(planChunk => isOverwrite
      ? db.insert(plan).values(planChunk).onConflictDoUpdate({
          target: planConflictTarget,
          set: {
            plannedBalanceChange: sql`excluded.planned_balance_change`,
            comment: sql`excluded.comment`,
          },
        })
      : db.insert(plan).values(planChunk).onConflictDoNothing({ target: planConflictTarget })),
  ])

  return {
    importedMonths: monthsToWrite.length,
    importedEntries: entriesToInsert.length,
    skippedMonths: importMonths.length - monthsToWrite.length,
  }
}
