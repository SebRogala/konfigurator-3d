// Frame time while orbiting, and draw calls while idle, on the production app.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node orbit-frames.mjs <baseUrl> <phone|desktop> [runs=3]
// Serve the production build first: npm run build && node scripts/perf-check/serve.mjs dist 4180
// phone: Pixel 7 emulation, CPU ×4 slower; desktop: 1440×900, no throttling. Both on SwiftShader (software GL), so
// compare before/after on the same machine, not against real-device numbers.
//   frame p50/p95  intervals between rendered frames during a 3 s drag orbit (ms)
//   idle draws     WebGL draw calls in the 2 s after the orbit has settled; must be 0 under frameloop="demand"
import { createRequire } from 'node:module'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium, devices } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, profile, runsArg = '3'] = process.argv.slice(2)
if (!base || !['phone', 'desktop'].includes(profile)) throw new Error('Usage: node orbit-frames.mjs <baseUrl> <phone|desktop> [runs]')
const CONTEXT = profile === 'phone' ? { ...devices['Pixel 7'] } : { viewport: { width: 1440, height: 900 } }

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

// Counts draw calls and stamps every frame that drew anything.
const INSTRUMENT = () => {
  window.__draws = 0
  window.__frames = []
  let drewThisTask = false
  for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const orig = proto[fn]
      if (!orig) continue
      proto[fn] = function (...a) {
        window.__draws++
        if (!drewThisTask) {
          drewThisTask = true
          window.__frames.push(performance.now())
          queueMicrotask(() => setTimeout(() => (drewThisTask = false)))
        }
        return orig.apply(this, a)
      }
    }
  }
}

async function run() {
  const context = await browser.newContext(CONTEXT)
  const page = await context.newPage()
  await page.addInitScript(INSTRUMENT)
  if (profile === 'phone') {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base)
  await page.waitForFunction(() => performance.getEntriesByName('scene:full').length > 0, null, { timeout: 180000 })
  await page.waitForTimeout(3000)
  const box = await page.locator('.viewport canvas').boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.evaluate(() => (window.__frames = []))
  const t0 = Date.now()
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 0; Date.now() - t0 < 3000; i++) {
    await page.mouse.move(cx + Math.sin(i / 10) * box.width * 0.3, cy + Math.cos(i / 13) * box.height * 0.1)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  const frames = await page.evaluate(() => window.__frames.slice())
  // Damping settles within ~1–2 s; then nothing may draw.
  await page.waitForTimeout(4000)
  const before = await page.evaluate(() => window.__draws)
  await page.waitForTimeout(2000)
  const idleDraws = (await page.evaluate(() => window.__draws)) - before
  await context.close()
  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  const gaps = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b)
  if (gaps.length < 5) throw new Error(`only ${frames.length} frames drawn during the orbit`)
  const q = (p) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))]
  return { frames: frames.length, p50: q(0.5), p95: q(0.95), idleDraws }
}

const results = []
for (let i = 0; i < Number(runsArg); i++) {
  const r = await run()
  results.push(r)
  console.log(`run ${i + 1}:`, JSON.stringify(r))
}
await browser.close()
const median = (k) => results.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(results.length / 2)]
console.log(`\n| ${profile} (median of ${results.length}) | value |\n|---|---|`)
console.log(`| frames drawn in 3 s orbit | ${median('frames')} |`)
console.log(`| frame interval p50 | ${median('p50').toFixed(1)} ms |`)
console.log(`| frame interval p95 | ${median('p95').toFixed(1)} ms |`)
console.log(`| draw calls while idle (2 s) | ${Math.max(...results.map((r) => r.idleDraws))} |`)
if (results.some((r) => r.idleDraws > 0)) { console.error('FAIL: the scene draws while idle'); process.exit(1) }
