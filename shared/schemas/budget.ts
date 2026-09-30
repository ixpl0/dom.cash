import { z } from 'zod'
import { amountSchema, currencySchema, descriptionSchema, entryKindSchema, MAX_AMOUNT } from '~~/shared/schemas/common'

type EntryKind = z.infer<typeof entryKindSchema>

export const MIN_BUDGET_YEAR = 2000
export const MAX_BUDGET_YEAR = 2100
export const PLAN_COMMENT_MAX_LENGTH = 2000

export const yearSchema = z.number().int().min(MIN_BUDGET_YEAR).max(MAX_BUDGET_YEAR)

export const monthIndexSchema = z.number().int().min(0).max(11)

export const plannedBalanceChangeSchema = z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT)

export const planCommentSchema = z.string().max(PLAN_COMMENT_MAX_LENGTH)

const positiveAmountSchema = amountSchema.positive()

export const getEntryAmountSchema = (kind: EntryKind) => kind === 'balance' ? amountSchema : positiveAmountSchema

export const hasAmountAllowedForKind = ({ kind, amount }: { kind: EntryKind, amount: number }): boolean =>
  getEntryAmountSchema(kind).safeParse(amount).success

export const amountForKindRule = {
  path: ['amount'],
  message: 'Income and expense amounts must be greater than zero',
}

export const entryAmountForKindSchema = z.object({
  kind: entryKindSchema,
  amount: amountSchema,
}).refine(hasAmountAllowedForKind, amountForKindRule)

export const entryDateSchema = z.union([z.iso.date(), z.literal('')])

export const updateEntrySchema = z.object({
  description: descriptionSchema,
  amount: amountSchema,
  currency: currencySchema,
  date: entryDateSchema.optional(),
  isOptional: z.boolean().optional(),
})

export const createEntrySchema = updateEntrySchema.extend({
  id: z.uuid().optional(),
  monthId: z.uuid(),
  kind: entryKindSchema,
}).refine(hasAmountAllowedForKind, amountForKindRule)
