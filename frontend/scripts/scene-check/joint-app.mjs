// Front-view screenshot of the real app at full texture quality (the door joint and front edges).
// Usage: PLAYWRIGHT_DIR=<dir with playwright@1.56.1> node joint-app.mjs <baseUrl> <outPng> [frontOptionId]
import { createRequire } from 'node:module'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, out, frontOption] = process.argv.slice(2)
if (!base || !out) throw new Error('Usage: node joint-app.mjs <baseUrl> <outPng>')
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(base)
await page.waitForFunction(() => performance.getEntriesByName('scene:full').length > 0, null, { timeout: 180000 })
if (frontOption) {
  // Open steps until the fronts field shows, then pick the option and wait for its full maps.
  for (const head of await page.locator('.step__head').all()) {
    if (await page.locator('[data-field="front"]').count()) break
    await head.click()
  }
  await page.click(`[data-field="front"] [data-option="${frontOption}"]`)
  await page.waitForTimeout(8000)
}
await page.click('.viewer__toggle')
await page.click('[data-view="front"]')
await page.click('.viewer__toggle')
await page.waitForTimeout(3000)
const canvas = await page.locator('canvas').boundingBox()
await page.screenshot({ path: out, clip: canvas })
// Top-left corner at the framing of .private/reference/top-reveal-crop.png, at 2x via a zoomed clip.
await page.screenshot({ path: out.replace(/\.png$/, '-top-corner.png'), clip: { x: canvas.x + 170, y: canvas.y + 40, width: 120, height: 67 } })
await page.screenshot({ path: out.replace(/\.png$/, '-glass.png'), clip: { x: canvas.x + 215, y: canvas.y + 150, width: 260, height: 280 } })
await browser.close()
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1) }
