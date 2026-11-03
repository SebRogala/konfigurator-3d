// Close-ups of the cabinet's top edge (top gap and corner metal inserts) for each split and glazed side.
// Usage: PLAYWRIGHT_DIR=<dir with playwright@1.56.1> node trim.mjs <baseUrl> <outDir>
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, out] = process.argv.slice(2)
if (!base || !out) throw new Error('Usage: node trim.mjs <baseUrl> <outDir>')
mkdirSync(out, { recursive: true })
const configs = ['reference', 'glazed-right-smoked', 'split-equal', 'glazed-right-equal']
const views = { side: [Math.PI / 2, Math.PI / 2 - 0.05], above: [-0.4, 0.5], below: [-0.4, Math.PI - 0.4], 'base-three-quarter': [-0.5, Math.PI / 2 - 0.05], front: [0, Math.PI / 2 - 0.05], 'three-quarter': [-0.6, Math.PI / 2 - 0.2] }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
for (const c of configs) {
  await page.goto(`${base}/scene-check.html?config=${c}`)
  await page.waitForSelector(`body[data-scene-ready="${c}"]`, { timeout: 120000 })
  for (const [view, [az, polar]] of Object.entries(views)) {
    await page.evaluate(([a, p]) => window.setCameraAngles(a, p), [az, polar])
    await page.waitForTimeout(2500)
    // The top edge of a fitted cabinet lands in the upper part of the frame.
    await page.screenshot({ path: `${out}/${c}-${view}.png`, clip: { x: 0, y: 80, width: 900, height: 300 } })
    console.log('shot', c, view)
    // Same framing as the Operator's crop of the photo's top-left corner (.private/reference/top-reveal-crop.png).
    // Full frames, for the glazed-section crop and its 3/4 look.
    await page.screenshot({ path: `${out}/${c}-${view}-full.png` })
    if (c === 'reference' && view === 'front') await page.screenshot({ path: `${out}/crop-ours.png`, clip: { x: 150, y: 70, width: 200, height: 112 } })
  }
}
await browser.close()
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1) }
