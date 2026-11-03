// Lighting evidence shots of /scene-check.html: default 3/4, interior with doors open, base contact, 3/4 close-up.
// Usage: PLAYWRIGHT_DIR=<dir with playwright@1.56.1> [PHONE=1] node lighting.mjs <baseUrl> <outDir> [prefix]
// PHONE=1 shoots at 390×844, below the 820 px breakpoint: the phone path (no AO pass, smaller shadow map).
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, out, prefix = ''] = process.argv.slice(2)
if (!base || !out) throw new Error('Usage: node lighting.mjs <baseUrl> <outDir> [prefix]')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: process.env.PHONE ? { width: 390, height: 844 } : { width: 900, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
// The reference cabinet is 1200 × 1100 × 450 mm, centred on x/z, standing on y = 0.
const shots = [
  { name: 'three-quarter', config: 'reference' },
  { name: 'interior-open', config: 'reference&doors=open', eye: [0.4, 0.95, 2.6], target: [0, 0.6, 0] },
  { name: 'base-contact', config: 'reference', eye: [0.9, 0.18, 1.1], target: [0.2, 0.08, 0] },
  { name: 'close-up', config: 'reference', eye: [0.75, 1.05, 1.35], target: [-0.2, 0.75, 0.2] },
]
for (const s of shots) {
  await page.goto(`${base}/scene-check.html?config=${s.config}`)
  await page.waitForSelector('body[data-scene-ready]', { timeout: 180000 })
  if (s.eye) await page.evaluate(([e, t]) => window.setCameraLookAt(e, t), [s.eye, s.target])
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${out}/${prefix}${s.name}.png` })
  console.log('shot', s.name)
}
await browser.close()
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1) }
