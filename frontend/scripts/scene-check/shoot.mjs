// Headless screenshots of /scene-check.html for each config.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node shoot.mjs <baseUrl> <outDir>
// Playwright stays out of package.json; install it in a scratch dir: npm i playwright@1.56.1 && npx playwright install chromium
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')

const [base, out] = process.argv.slice(2)
const configs = ['reference', 'widest-tallest', 'narrowest', 'glazed-right-smoked', 'glazed-none-steel', 'walnut-wood-fronts', 'oak-light-white', 'push', 'split-equal', 'reference&doors=open', 'glazed-right-smoked&doors=open', 'glazed-none-steel&doors=open']
if (!base || !out) throw new Error('Usage: node shoot.mjs <baseUrl> <outDir>')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, ignoreHTTPSErrors: true })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
for (const c of configs) {
  await page.goto(`${base}/scene-check.html?config=${c}`)
  const name = c.split('&')[0]
  await page.waitForSelector(`body[data-scene-ready="${name}"]`, { timeout: 120000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/${c.replace('&doors=open', '-doors-open')}.png` })
  console.log('shot', c)
}
await browser.close()
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1) }
