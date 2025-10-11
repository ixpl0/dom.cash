export const useMonthNames = () => {
  const { t } = useI18n()

  const monthNames = computed(() => [
    t('month.january'),
    t('month.february'),
    t('month.march'),
    t('month.april'),
    t('month.may'),
    t('month.june'),
    t('month.july'),
    t('month.august'),
    t('month.september'),
    t('month.october'),
    t('month.november'),
    t('month.december'),
  ])

  return {
    monthNames,
  }
}
