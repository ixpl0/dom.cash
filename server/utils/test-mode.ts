export const isTestMode = (): boolean => import.meta.dev || process.env.E2E_TEST_MODE === 'true'
