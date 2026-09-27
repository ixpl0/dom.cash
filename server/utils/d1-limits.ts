import { getTableColumns } from 'drizzle-orm'
import type { Table } from 'drizzle-orm'

export const D1_MAX_VARIABLES_PER_STATEMENT = 100

export const chunkArray = <T>(items: readonly T[], chunkSize: number): T[][] => {
  if (items.length === 0) {
    return []
  }
  return Array.from(
    { length: Math.ceil(items.length / chunkSize) },
    (_, chunkIndex) => items.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize),
  )
}

export const getRowsPerInsertStatement = (table: Table): number => {
  const columnCount = Object.keys(getTableColumns(table)).length

  if (columnCount < 1 || columnCount > D1_MAX_VARIABLES_PER_STATEMENT) {
    throw new Error(`Cannot chunk inserts into a table with ${columnCount} columns against the D1 ${D1_MAX_VARIABLES_PER_STATEMENT}-variable limit`)
  }

  return Math.floor(D1_MAX_VARIABLES_PER_STATEMENT / columnCount)
}
