export const isValidRates = (rates: unknown): rates is Record<string, number> => {
  if (!rates || typeof rates !== 'object' || Array.isArray(rates)) {
    return false
  }

  const values = Object.values(rates)
  return values.length > 0 && values.every(rate => typeof rate === 'number' && Number.isFinite(rate) && rate > 0)
}
