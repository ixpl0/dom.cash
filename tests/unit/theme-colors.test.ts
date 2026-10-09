import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { AUTO_DARK_THEME, AUTO_LIGHT_THEME, DAISY_THEMES, getThemeColorMetas, THEME_HEADER_COLORS } from '../../app/utils/theme-colors'

interface CssTheme {
  name: string
  headerColor: string
  isDefault: boolean
  isPreferredDark: boolean
}

const themesCss = readFileSync(new URL('../../app/assets/themes.css', import.meta.url), 'utf8')

const cssThemes: CssTheme[] = themesCss
  .split('@plugin "daisyui/theme"')
  .slice(1)
  .map(block => ({
    name: block.match(/name: "([^"]+)"/)?.[1] ?? '',
    headerColor: block.match(/--color-base-200: ([^;]+);/)?.[1]?.trim() ?? '',
    isDefault: /default: true/.test(block),
    isPreferredDark: /prefersdark: true/.test(block),
  }))

test('THEME_HEADER_COLORS repeats the base-200 colour of every theme in themes.css', () => {
  assert.deepEqual(
    Object.fromEntries(cssThemes.map(({ name, headerColor }) => [name, headerColor])),
    THEME_HEADER_COLORS,
  )
  assert.deepEqual([...DAISY_THEMES].sort(), cssThemes.map(({ name }) => name).sort())
})

test('getThemeColorMetas follows the default and the preferred dark theme in the auto mode', () => {
  assert.equal(cssThemes.find(({ isDefault }) => isDefault)?.name, AUTO_LIGHT_THEME)
  assert.equal(cssThemes.find(({ isPreferredDark }) => isPreferredDark)?.name, AUTO_DARK_THEME)
  assert.deepEqual(getThemeColorMetas(undefined), [
    { key: 'theme-color-light', name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#fff9ee' },
    { key: 'theme-color-dark', name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#282b2f' },
  ])
  assert.deepEqual(getThemeColorMetas('summerhaze'), [{ key: 'theme-color', name: 'theme-color', content: '#ffe0e4' }])
})
