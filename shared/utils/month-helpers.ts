import type { MonthData } from '~~/shared/types/budget'

export const getNextMonth = (currentMonths: MonthData[]): { year: number, month: number } => {
  if (currentMonths.length === 0) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }

  const sortedMonths = [...currentMonths].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const latest = sortedMonths[0]!
  const nextMonth = latest.month === 11 ? 0 : latest.month + 1
  const nextYear = latest.month === 11 ? latest.year + 1 : latest.year

  return { year: nextYear, month: nextMonth }
}

export const getPreviousMonth = (currentMonths: MonthData[]): { year: number, month: number } => {
  if (currentMonths.length === 0) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }

  const sortedMonths = [...currentMonths].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  const earliest = sortedMonths[0]!
  const prevMonth = earliest.month === 0 ? 11 : earliest.month - 1
  const prevYear = earliest.month === 0 ? earliest.year - 1 : earliest.year

  return { year: prevYear, month: prevMonth }
}

export const findClosestMonthForCopy = (
  monthsData: MonthData[],
  targetYear: number,
  targetMonth: number,
  direction: 'next' | 'previous',
): string | undefined => {
  if (monthsData.length === 0) return undefined

  if (direction === 'next') {
    const sortedMonths = [...monthsData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })

    const targetMonthValue = targetYear * 12 + targetMonth
    let closestMonth: MonthData | undefined = undefined

    for (const month of sortedMonths) {
      const monthValue = month.year * 12 + month.month
      if (monthValue < targetMonthValue) {
        if (!closestMonth) {
          closestMonth = month
        }
        else {
          const closestValue = closestMonth.year * 12 + closestMonth.month
          if (monthValue > closestValue) {
            closestMonth = month
          }
        }
      }
    }

    return closestMonth?.id
  }
  else {
    const sortedMonths = [...monthsData].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    const targetMonthValue = targetYear * 12 + targetMonth
    let closestMonth: MonthData | undefined = undefined

    for (const month of sortedMonths) {
      const monthValue = month.year * 12 + month.month
      if (monthValue > targetMonthValue) {
        if (!closestMonth) {
          closestMonth = month
        }
        else {
          const closestValue = closestMonth.year * 12 + closestMonth.month
          if (monthValue < closestValue) {
            closestMonth = month
          }
        }
      }
    }

    return closestMonth?.id
  }
}

export const isFirstMonth = (monthData: MonthData, allMonths: MonthData[]): boolean => {
  if (allMonths.length <= 1) return false

  const sortedMonths = [...allMonths].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  const firstMonth = sortedMonths[0]
  return firstMonth?.id === monthData.id
}

export const isLastMonth = (monthData: MonthData, allMonths: MonthData[]): boolean => {
  if (allMonths.length <= 1) return false

  const sortedMonths = [...allMonths].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const lastMonth = sortedMonths[0]
  return lastMonth?.id === monthData.id
}
