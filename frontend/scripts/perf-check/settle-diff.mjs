// Strict identity: a frame rendered while the camera moves equals the settled frame at the same camera, at full
// quality on /scene-check.html (the app's CabinetScene), DPR 1 and 2. Headless SwiftShader can hide GPU-only
// differences; tests/renderConsistency.test.ts guards the source for camera-motion branches as well.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node settle-diff.mjs <baseUrl> <shotDir>
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { capturePair, compareSettle, describeSettle, settlePasses } from '../scene-check/settle-compare.mjs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, out] = process.argv.slice(2)
if (!base || !out) throw new Error('Usage: node settle-diff.mjs <baseUrl> <shotDir>')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
// The default 3/4 view and the open interior (vitrine and black fronts in frame).
const VIEWS = [
  { name: 'three-quarter', query: 'reference', eye: [2.2, 1.3, 3.4], target: [0, 0.52, 0] },
  { name: 'interior-open', query: 'reference&doors=open', eye: [0.4, 0.95, 2.6], target: [0, 0.6, 0] },
]
let failed = false
for (const dpr of [1, 2]) {
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr })
    await page.goto(`${base}/scene-check.html?config=${v.query}`)
    await page.waitForSelector('body[data-scene-ready]', { timeout: 180000 })
    await page.waitForTimeout(2000)
    const [moving, settled] = await capturePair(page, v.eye, v.target)
    const tag = `${v.name}-dpr${dpr}`
    writeFileSync(`${out}/settle-moving-${tag}.png`, Buffer.from(moving, 'base64'))
    writeFileSync(`${out}/settle-settled-${tag}.png`, Buffer.from(settled, 'base64'))
    const st = await compareSettle(page, moving, settled)
    writeFileSync(`${out}/settle-diff-${tag}.png`, Buffer.from(st.diffPng, 'base64'))
    console.log(`${tag}: ${describeSettle(st)}`)
    if (!settlePasses(st)) failed = true
    await page.close()
  }
}
await browser.close()
if (failed) { console.error('FAIL: the settled frame differs from the moving frame'); process.exit(1) }
console.log('PASS')
