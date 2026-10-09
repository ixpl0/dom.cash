import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Page } from '@playwright/test'

interface LogoColors {
  contours: string
  face: string
  cheeks: string
  roof: string
  pipe: string
}

interface IconSpec {
  file: string
  size: number
  logoShare: number
  background: string
  radiusShare: number
  colors: LogoColors | 'silhouette'
}

const ICONS_DIRECTORY = join('public', 'icons')
const BACKGROUND = '#FFD866'
const SILHOUETTE_COLOR = '#ffffff'
const LOGO_SOURCE_COLORS: LogoColors = { contours: '#3f1410', face: '#fde5d5', cheeks: '#ff7676', roof: '#e6a77a', pipe: '#fac9a5' }
const JUICY_COLORS: LogoColors = { contours: '#2c2d30', face: '#ffffff', cheeks: '#FF6661', roof: '#FF6661', pipe: '#A9DC76' }
const APP_ICON_LOGO_SHARE = 0.72
const MASKABLE_LOGO_SHARE = 336 / 512

const ICONS: readonly IconSpec[] = [
  { file: 'icon-192.png', size: 192, logoShare: APP_ICON_LOGO_SHARE, background: BACKGROUND, radiusShare: 0.22, colors: JUICY_COLORS },
  { file: 'icon-512.png', size: 512, logoShare: APP_ICON_LOGO_SHARE, background: BACKGROUND, radiusShare: 0.22, colors: JUICY_COLORS },
  { file: 'icon-maskable-512.png', size: 512, logoShare: MASKABLE_LOGO_SHARE, background: BACKGROUND, radiusShare: 0, colors: JUICY_COLORS },
  { file: 'apple-touch-icon.png', size: 180, logoShare: APP_ICON_LOGO_SHARE, background: BACKGROUND, radiusShare: 0, colors: JUICY_COLORS },
  { file: 'badge-96.png', size: 96, logoShare: 88 / 96, background: 'transparent', radiusShare: 0, colors: 'silhouette' },
]

const logoSvg = readFileSync(join('public', 'logo.svg'), 'utf8')

const paintLogo = (colors: LogoColors): string =>
  (Object.keys(LOGO_SOURCE_COLORS) as Array<keyof LogoColors>).reduce(
    (svg, part) => svg.replaceAll(LOGO_SOURCE_COLORS[part], colors[part]),
    logoSvg,
  )

const drawSilhouette = (): string => {
  const outline = logoSvg.match(/<path[^>]*\/>/)?.[0] ?? ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${outline.replace(/fill="[^"]*"/, `fill="${SILHOUETTE_COLOR}"`)}</svg>`
}

const renderIcon = async (page: Page, { file, size, logoShare, background, radiusShare, colors }: IconSpec): Promise<void> => {
  const logoSize = Math.round(size * logoShare)
  const svg = (colors === 'silhouette' ? drawSilhouette() : paintLogo(colors)).replace('<svg ', `<svg width="${logoSize}" height="${logoSize}" `)

  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${background};border-radius:${Math.round(size * radiusShare)}px">${svg}</div>
  </body></html>`)
  await page.screenshot({ path: join(ICONS_DIRECTORY, file), omitBackground: true })
  console.log(`Saved ${file}`)
}

mkdirSync(ICONS_DIRECTORY, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

await ICONS.reduce((previous, icon) => previous.then(() => renderIcon(page, icon)), Promise.resolve())
await browser.close()
