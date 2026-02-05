import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { user, month, entry } from '~~/server/db/schema'
import { getUserMonths } from './months'
import type {
  BudgetExportData,
  BudgetExportMonth,
  BudgetExportEntry,
  BudgetImportOptions,
  BudgetImportResult,
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
  const db = useDatabase(event)
  const result: BudgetImportResult = {
    success: true,
    importedMonths: 0,
    importedEntries: 0,
    skippedMonths: 0,
    errors: [],
  }

  const entryInsertBatchSize = 100

  for (const importMonth of importData.months) {
    try {
      const existingMonth = await db
        .select({ id: month.id })
        .from(month)
        .where(and(
          eq(month.userId, userId),
          eq(month.year, importMonth.year),
          eq(month.month, importMonth.month),
        ))
        .limit(1)

      if (existingMonth.length > 0 && options.strategy === 'skip') {
        result.skippedMonths += 1
        continue
      }

      const monthId = existingMonth[0]?.id ?? crypto.randomUUID()
      const importedMonths = existingMonth.length === 0 ? 1 : 0

      const monthBaseStatement = existingMonth.length > 0
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

      const entryBatchStartIndexes = entriesToInsert
        .map((_, entryIndex) => entryIndex)
        .filter(entryIndex => entryIndex % entryInsertBatchSize === 0)

      const entryInsertStatements = entryBatchStartIndexes
        .map(entryIndex => entriesToInsert.slice(entryIndex, entryIndex + entryInsertBatchSize))
        .map(entryBatch => db.insert(entry).values(entryBatch))

      await db.batch([monthBaseStatement, ...entryInsertStatements])

      result.importedMonths += importedMonths
      result.importedEntries += entriesToInsert.length
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Error importing month ${importMonth.year}-${importMonth.month + 1}: ${errorMessage}`)
      result.success = false
    }
  }

  return result
}
