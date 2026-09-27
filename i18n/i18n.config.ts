import { getRussianPluralForm } from './plural-rules'

export default defineI18nConfig(() => ({
  pluralRules: {
    ru: getRussianPluralForm,
  },
}))
