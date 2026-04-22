import { eq, getTableColumns } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { user, month, entry, plan } from '~~/server/db/schema'
import { getUserMonths } from './months'
import { getUserPlans, upsertPlan } from './plans'
import { secureLog } from '~~/server/utils/secure-logger'
import type {
  BudgetExportData,
  BudgetExportMonth,
  BudgetExportPlan,
  BudgetExportEntry,
  BudgetImportOptions,
  BudgetImportResult,
  BudgetImportError,
  BudgetExportSchema,
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
    version: '1.0',
    exportDate: new Date().toISOString(),
    user: {
      username: userInfo.username,
      mainCurrency: userInfo.mainCurrency,
    },
    months: exportMonths,
    plans: exportPlans,
  }
}

type MonthImportOutcome
  = | { status: 'skipped' }
    | { status: 'imported', monthId: string, createdMonth: boolean, insertedEntries: number }
    | { status: 'failed', errorKind: BudgetImportError['kind'] }

const d1MaxVariablesPerStatement = 100
const maxStatementsPerMonthBatch = 100

const entryColumnCount = Object.keys(getTableColumns(entry)).length

if (entryColumnCount < 1 || entryColumnCount > d1MaxVariablesPerStatement) {
  throw new Error(`Budget import cannot chunk entry table with ${entryColumnCount} columns against D1 ${d1MaxVariablesPerStatement}-variable limit`)
}

const entriesPerInsertStatement = Math.floor(d1MaxVariablesPerStatement / entryColumnCount)

type ExistingMonthKey = `${number}-${number}`

const makeMonthKey = (year: number, monthIndex: number): ExistingMonthKey => `${year}-${monthIndex}`

const chunkArray = <T>(items: readonly T[], chunkSize: number): T[][] => {
  if (items.length === 0) {
    return []
  }
  return Array.from(
    { length: Math.ceil(items.length / chunkSize) },
    (_, chunkIndex) => items.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize),
  )
}

const loadExistingMonthIds = async (
  db: ReturnType<typeof useDatabase>,
  userId: string,
): Promise<Map<ExistingMonthKey, string>> => {
  const existingRows = await db
    .select({ id: month.id, year: month.year, month: month.month })
    .from(month)
    .where(eq(month.userId, userId))

  return new Map(existingRows.map(row => [makeMonthKey(row.year, row.month), row.id]))
}

const loadExistingPlanKeys = async (
  db: ReturnType<typeof useDatabase>,
  userId: string,
): Promise<Set<ExistingMonthKey>> => {
  const existingRows = await db
    .select({ year: plan.year, month: plan.month })
    .from(plan)
    .where(eq(plan.userId, userId))

  return new Set(existingRows.map(row => makeMonthKey(row.year, row.month)))
}

const importSingleMonth = async (
  db: ReturnType<typeof useDatabase>,
  userId: string,
  importMonth: BudgetExportSchema['months'][number],
  strategy: BudgetImportOptions['strategy'],
  existingMonthId: string | undefined,
): Promise<MonthImportOutcome> => {
  const monthAlreadyExists = existingMonthId !== undefined

  if (monthAlreadyExists && strategy === 'skip') {
    return { status: 'skipped' }
  }

  const insertStatementCount = Math.ceil(importMonth.entries.length / entriesPerInsertStatement)
  const totalStatementCount = 1 + insertStatementCount
  if (totalStatementCount > maxStatementsPerMonthBatch) {
    return { status: 'failed', errorKind: 'tooLarge' }
  }

  const monthId = existingMonthId ?? crypto.randomUUID()

  const monthSetupStatement = monthAlreadyExists
    ? db.delete(entry).where(eq(entry.monthId, monthId))
    : db
        .insert(month)
        .values({
          id: monthId,
          userId,
          year: importMonth.year,
          month: importMonth.month,
        })

  const entriesToInsert = importMonth.entries.map(importEntry => ({
    id: crypto.randomUUID(),
    monthId,
    kind: importEntry.kind,
    description: importEntry.description,
    amount: importEntry.amount,
    currency: importEntry.currency,
    date: importEntry.date ?? null,
    isOptional: false,
  }))

  const entryInsertStatements = chunkArray(entriesToInsert, entriesPerInsertStatement)
    .map(entryChunk => db.insert(entry).values(entryChunk))

  await db.batch([monthSetupStatement, ...entryInsertStatements])

  return {
    status: 'imported',
    monthId,
    createdMonth: !monthAlreadyExists,
    insertedEntries: entriesToInsert.length,
  }
}

const runImportSafely = async (
  db: ReturnType<typeof useDatabase>,
  userId: string,
  importMonth: BudgetExportSchema['months'][number],
  strategy: BudgetImportOptions['strategy'],
  existingMonthId: string | undefined,
): Promise<MonthImportOutcome> => {
  try {
    return await importSingleMonth(db, userId, importMonth, strategy, existingMonthId)
  }
  catch (error) {
    const errorName = error instanceof Error ? error.name : 'NonErrorThrown'
    const rawMessage = error instanceof Error ? error.message : String(error)
    const truncatedMessage = rawMessage.length > 200 ? `${rawMessage.slice(0, 200)}…` : rawMessage
    secureLog.error('Budget import month failed', {
      userId,
      year: importMonth.year,
      month: importMonth.month,
      errorName,
      errorMessage: truncatedMessage,
    })
    return { status: 'failed', errorKind: 'failed' }
  }
}

export const importBudget = async (
  userId: string,
  importData: BudgetExportSchema,
  options: BudgetImportOptions,
  event: H3Event,
): Promise<BudgetImportResult> => {
  const db = useDatabase(event)
  const knownMonthIds = await loadExistingMonthIds(db, userId)

  const deduplicatedMonths = new Map<ExistingMonthKey, BudgetExportSchema['months'][number]>()
  for (const candidate of importData.months) {
    const key = makeMonthKey(candidate.year, candidate.month)
    if (!deduplicatedMonths.has(key)) {
      deduplicatedMonths.set(key, candidate)
    }
  }
  const uniqueImportMonths = Array.from(deduplicatedMonths.values())

  const emptyResult: BudgetImportResult = {
    success: true,
    importedMonths: 0,
    importedEntries: 0,
    skippedMonths: 0,
    errors: [],
  }

  const monthsResult = await uniqueImportMonths.reduce<Promise<BudgetImportResult>>(
    async (previousResultPromise, importMonth) => {
      const previousResult = await previousResultPromise
      const existingMonthId = knownMonthIds.get(makeMonthKey(importMonth.year, importMonth.month))
      const outcome = await runImportSafely(db, userId, importMonth, options.strategy, existingMonthId)

      if (outcome.status === 'skipped') {
        return { ...previousResult, skippedMonths: previousResult.skippedMonths + 1 }
      }

      if (outcome.status === 'imported') {
        if (outcome.createdMonth) {
          knownMonthIds.set(makeMonthKey(importMonth.year, importMonth.month), outcome.monthId)
        }
        return {
          ...previousResult,
          importedMonths: previousResult.importedMonths + (outcome.createdMonth ? 1 : 0),
          importedEntries: previousResult.importedEntries + outcome.insertedEntries,
        }
      }

      return {
        ...previousResult,
        success: false,
        errors: [
          ...previousResult.errors,
          { year: importMonth.year, month: importMonth.month, kind: outcome.errorKind },
        ],
      }
    },
    Promise.resolve(emptyResult),
  )

  const existingPlanKeys = await loadExistingPlanKeys(db, userId)

  type ImportPlan = NonNullable<BudgetExportSchema['plans']>[number]
  const deduplicatedPlans = new Map<ExistingMonthKey, ImportPlan>()
  for (const candidate of importData.plans ?? []) {
    const key = makeMonthKey(candidate.year, candidate.month)
    if (!deduplicatedPlans.has(key)) {
      deduplicatedPlans.set(key, candidate)
    }
  }
  const uniqueImportPlans = Array.from(deduplicatedPlans.values())

  return uniqueImportPlans.reduce<Promise<BudgetImportResult>>(
    async (previousResultPromise, importPlan) => {
      const previousResult = await previousResultPromise
      const planKey = makeMonthKey(importPlan.year, importPlan.month)
      const planAlreadyExists = existingPlanKeys.has(planKey)

      if (planAlreadyExists && options.strategy === 'skip') {
        return previousResult
      }

      try {
        await upsertPlan(userId, importPlan.year, importPlan.month, importPlan.plannedBalanceChange, importPlan.comment ?? null, event)
        existingPlanKeys.add(planKey)
        return previousResult
      }
      catch (error) {
        const errorName = error instanceof Error ? error.name : 'NonErrorThrown'
        const rawMessage = error instanceof Error ? error.message : String(error)
        const truncatedMessage = rawMessage.length > 200 ? `${rawMessage.slice(0, 200)}…` : rawMessage
        secureLog.error('Budget import plan failed', {
          userId,
          year: importPlan.year,
          month: importPlan.month,
          errorName,
          errorMessage: truncatedMessage,
        })
        return {
          ...previousResult,
          success: false,
          errors: [
            ...previousResult.errors,
            { year: importPlan.year, month: importPlan.month, kind: 'failed' },
          ],
        }
      }
    },
    Promise.resolve(monthsResult),
  )
}
