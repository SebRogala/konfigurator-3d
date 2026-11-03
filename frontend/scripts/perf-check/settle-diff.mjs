// Settled (AO) frame vs moving (direct) frame at the same camera, in the real app at full quality.
// `?ao=off` makes every frame the direct render the app draws while the camera moves.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node settle-diff.mjs <baseUrl> <shotDir>
// Fails when pixels away from occluded areas differ: AO only darkens, so a pixel that got brighter, or one that
// changed hue, is a sharpness/colour defect, not occlusion.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { SETTLE_LIMITS, compareSettle } from '../scene-check/settle-compare.mjs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, out] = process.argv.slice(2)
if (!base || !out) throw new Error('Usage: node settle-diff.mjs <baseUrl> <shotDir>')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

async function shoot(dpr, query) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr })
  await page.goto(`${base}/${query}`)
  await page.waitForFunction(() => performance.getEntriesByName('scene:full').length > 0, null, { timeout: 180000 })
  await page.waitForTimeout(3000)
  const png = await page.locator('.viewport canvas').screenshot()
  await page.close()
  return png
}

const analyser = await browser.newPage()
let failed = false
for (const dpr of [1, 2]) {
  const moving = await shoot(dpr, '?ao=off')
  const settled = await shoot(dpr, '')
  writeFileSync(`${out}/settle-moving-dpr${dpr}.png`, moving)
  writeFileSync(`${out}/settle-settled-dpr${dpr}.png`, settled)
  const stats = await compareSettle(analyser, moving, settled)
  writeFileSync(`${out}/settle-diff-dpr${dpr}.png`, Buffer.from(stats.diffPng, 'base64'))
  const pct = (x) => `${(x * 100).toFixed(2)} %`
  console.log(`dpr ${dpr}: unchanged ${pct(stats.same)}, darker ${pct(stats.darker)}, brighter ${pct(stats.brighter)} (max +${stats.maxBright.toFixed(0)}), hue drift ${pct(stats.hue)}`)
  if (stats.brighter > SETTLE_LIMITS.brighter || stats.hue > SETTLE_LIMITS.hue) failed = true
}
await browser.close()
if (failed) { console.error('FAIL: the settled frame changes more than occlusion'); process.exit(1) }
console.log('PASS')
