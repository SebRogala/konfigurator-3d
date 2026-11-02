// Regenerates public/og-image.jpg (1200×630, default cabinet from the real app) and public/apple-touch-icon.png (180×180 from favicon.svg).
// Usage: node share-assets.mjs <baseUrl> <publicDir>
// apple-touch-icon is opaque (iOS fills transparency with black and applies its own mask).
import { chromium } from 'playwright'
import { readFileSync, statSync } from 'node:fs'

const [base, pub] = process.argv.slice(2)
const PANEL_W = 420, BAR_H = 64 // desktop layout: steps column and header (index.css)
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

const page = await browser.newPage({ viewport: { width: 1200 + PANEL_W, height: 630 + BAR_H } })
await page.goto(base)
await page.locator('.viewport canvas').waitFor({ timeout: 20000 })
await page.waitForLoadState('networkidle')
await page.waitForTimeout(2500) // textures decoded and camera fit settled
const box = await page.locator('.viewport').boundingBox()
await page.screenshot({ path: `${pub}/og-image.jpg`, type: 'jpeg', quality: 82, clip: { x: box.x, y: box.y, width: 1200, height: 630 } })

const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
await icon.setContent(`<body style="margin:0;background:#f3efe8">${readFileSync(`${pub}/favicon.svg`, 'utf8').replace('<svg ', '<svg width="180" height="180" ')}</body>`)
await icon.screenshot({ path: `${pub}/apple-touch-icon.png` })

await browser.close()
const kb = statSync(`${pub}/og-image.jpg`).size / 1024
console.log(`og-image.jpg ${kb.toFixed(0)} KB${kb > 200 ? ' — OVER 200 KB' : ''}; apple-touch-icon.png written`)
process.exit(kb > 200 ? 1 : 0)
