export interface BudgetShare {
  id: number
  username: string
  access: 'read' | 'write'
}

export const useBudgetSharing = () => {
  const shares = useState<BudgetShare[]>('budget-shares', () => [])
  const sharedBudgets = useState<BudgetShare[]>('shared-budgets', () => [])

  return {
    shares,
    sharedBudgets,
  }
}
