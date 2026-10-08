const normalizeText = (text: string): string => text.toLowerCase().replaceAll('ё', 'е')

export const toSearchWords = (query: string): string[] =>
  normalizeText(query).split(/\s+/).filter(word => word.length > 0)

export const matchesAllWords = (texts: readonly string[], words: readonly string[]): boolean => {
  const haystack = normalizeText(texts.join('\n'))
  return words.every(word => haystack.includes(word))
}
