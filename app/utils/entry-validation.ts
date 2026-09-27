import type { EntryKind } from '~~/shared/types'
import { descriptionSchema } from '~~/shared/schemas/common'
import { getEntryAmountSchema } from '~~/shared/schemas/budget'

interface EntryFormValues {
  description: string
  amount: number | null | undefined
}

export const getEntryErrorKey = ({ description, amount }: EntryFormValues, kind: EntryKind): string | null => {
  const descriptionResult = descriptionSchema.safeParse(description)
  if (!descriptionResult.success) {
    return descriptionResult.error.issues[0]?.code === 'too_big'
      ? 'entry.errors.descriptionTooLong'
      : 'entry.errors.descriptionRequired'
  }

  if (amount === null || amount === undefined) {
    return 'entry.errors.amountRequired'
  }

  const amountResult = getEntryAmountSchema(kind).safeParse(amount)
  if (amountResult.success) {
    return null
  }
  if (amountResult.error.issues[0]?.code === 'too_big') {
    return 'entry.errors.amountTooLarge'
  }
  return kind === 'balance' ? 'entry.errors.amountNonNegative' : 'entry.errors.amountPositive'
}
