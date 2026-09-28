import { ERROR_KEYS, type ErrorKey } from '~~/shared/utils/shared/error-keys'

const errorKeys: ReadonlySet<string> = new Set(Object.values(ERROR_KEYS))

const isErrorKey = (value: unknown): value is ErrorKey => typeof value === 'string' && errorKeys.has(value)

const readMessage = (value: unknown): unknown =>
  typeof value === 'object' && value !== null && 'message' in value ? value.message : undefined

const readData = (value: unknown): unknown =>
  typeof value === 'object' && value !== null && 'data' in value ? value.data : undefined

export const readServerErrorKey = (error: unknown): ErrorKey | null =>
  [readMessage(readData(error)), readMessage(error)].find(isErrorKey) ?? null

export const readServerErrorData = (error: unknown): unknown => readData(readData(error))
