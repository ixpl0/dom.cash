export const useT = () => {
  const { $i18n } = useNuxtApp()

  return $i18n.t
}
