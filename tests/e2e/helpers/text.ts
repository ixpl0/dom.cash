import type { Locator } from '@playwright/test'

const readText = async (locator: Locator): Promise<string> => {
  const text = await locator.textContent()
  return text ?? ''
}

export const readDigits = async (locator: Locator): Promise<number> => {
  const text = await readText(locator)
  return parseInt(text.replace(/\D/g, ''), 10)
}

export const readSignedInteger = async (locator: Locator): Promise<number> => {
  const text = await readText(locator)
  return parseInt(text.replace(/[^-\d]/g, ''), 10)
}

export const readDecimal = async (locator: Locator): Promise<number> => {
  const text = await readText(locator)
  return parseFloat(text.replace(/[^\d.]/g, ''))
}

export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
