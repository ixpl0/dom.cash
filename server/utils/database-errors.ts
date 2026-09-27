const UNIQUE_CONSTRAINT_MESSAGE = 'UNIQUE constraint failed'

const collectMessages = (error: unknown): string[] =>
  error instanceof Error ? [error.message, ...collectMessages(error.cause)] : []

export const isUniqueConstraintError = (error: unknown): boolean =>
  collectMessages(error).some(message => message.includes(UNIQUE_CONSTRAINT_MESSAGE))
