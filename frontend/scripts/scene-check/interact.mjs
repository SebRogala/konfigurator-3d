// Resize and orbit-limit evidence for /scene-check.html: canvas aspect refit and the azimuth/zoom limits.
// Usage: PLAYWRIGHT_DIR=<dir with playwright@1.56.1> node interact.mjs <baseUrl> <outDir>
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, out] = process.argv.slice(2)
if (!base || !out) throw new Error('Usage: node interact.mjs <baseUrl> <outDir>')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const settle = () => page.waitForTimeout(2500)
const shot = async (name) => { await settle(); await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name) }

await page.goto(`${base}/scene-check.html?config=reference`)
await page.waitForSelector('body[data-scene-ready]', { timeout: 120000 })
await shot('resize-900')
await page.setViewportSize({ width: 300, height: 1000 })
await shot('resize-300')
await page.setViewportSize({ width: 1400, height: 500 })
await shot('resize-1400x500')
await page.setViewportSize({ width: 900, height: 1000 })

const drag = async (dx) => {
  await page.mouse.move(450, 500); await page.mouse.down()
  for (let i = 1; i <= 20; i++) await page.mouse.move(450 + (dx * i) / 20, 500)
  await page.mouse.up()
}
const wheel = async (dy) => { await page.mouse.move(450, 500); for (let i = 0; i < 30; i++) await page.mouse.wheel(0, dy) }
for (const [side, dx] of [['left', 3000], ['right', -3000]]) {
  await drag(dx)
  await wheel(-400)
  await shot(`orbit-${side}-zoom-in`)
  await wheel(400)
  await shot(`orbit-${side}-zoom-out`)
}
await browser.close()
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1) }
