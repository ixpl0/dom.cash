import type { H3Event } from 'h3'
import type { BudgetData } from '~~/shared/types/budget'
import type { User } from '~~/shared/types'
import { resolveBudget } from '~~/server/services/budget/access'
import { loadBudgetMonths } from '~~/server/services/budget/months'

export const getBudgetView = async (
  event: H3Event,
  currentUser: User,
  username: string | undefined,
  yearsParam: string | undefined,
): Promise<BudgetData> => {
  const { owner, access } = await resolveBudget(event, currentUser, username, 'read')
  const months = await loadBudgetMonths(owner.id, yearsParam, event)

  return {
    user: {
      username: owner.username,
      mainCurrency: owner.mainCurrency,
    },
    access,
    months,
  }
}
