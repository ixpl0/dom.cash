export const useHeaderControls = <T = unknown>() =>
  useState<T[]>('header-controls', () => [])
