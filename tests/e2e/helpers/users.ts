export const createUniqueId = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const createTestEmail = (label: string): string => `test_${label}_${createUniqueId()}@example.com`
