const RUSSIAN_PLURAL_FORMS: Record<Intl.LDMLPluralRule, number> = {
  zero: 2,
  one: 0,
  two: 1,
  few: 1,
  many: 2,
  other: 1,
}

const russianPluralRules = new Intl.PluralRules('ru')

export const getRussianPluralForm = (count: number, formCount: number): number =>
  Math.min(RUSSIAN_PLURAL_FORMS[russianPluralRules.select(count)], formCount - 1)
