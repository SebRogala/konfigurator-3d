// First-load timings on an emulated phone: Pixel 7, CPU ×4 slower, DevTools "Fast 3G" network (via CDP).
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node measure.mjs <baseUrl> [runs=3] [shotDir]
// Serve the production build first: npm run build && node scripts/perf-check/serve.mjs dist 4180
// Reports the median of the runs:
//   fcp           first-contentful-paint (Paint Timing API)
//   cabinet       first screenshot whose 3D area shows the cabinet (poster or canvas): >2 % dark pixels
//   firstFrame    performance mark 'scene:first-frame' (first WebGL frame); falls back to `cabinet` when the build has no marks
//   full          performance mark 'scene:full' (full-resolution maps on screen); falls back to the later of the last texture/HDR response and `cabinet`
//   bytes@full    bytes transferred (encoded, on the wire) up to `full`
//   bytes@idle    bytes transferred once the network has been idle 3 s
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium, devices } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, runsArg = '3', shotDir] = process.argv.slice(2)
if (!base) throw new Error('Usage: node measure.mjs <baseUrl> [runs] [shotDir]')

// Chrome DevTools' "Fast 3G" preset.
const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1e6 / 8) * 0.9, uploadThroughput: (750 * 1e3 / 8) * 0.9 }
const CPU_SLOWDOWN = 4
const DARK_LUMA = 110
const CABINET_DARK_SHARE = 0.02
const TIMEOUT_MS = 180_000
const ASSET = /\/textures\/|\.hdr$/

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
// Unthrottled page that decodes screenshots, so the analysis does not compete with the throttled page's CPU.
const analyser = await browser.newPage()

async function darkShare(png) {
  return analyser.evaluate(async ([b64, luma]) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(img.width, img.height)
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, img.width, img.height).data
    let dark = 0
    for (let i = 0; i < d.length; i += 4) if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < luma) dark++
    return dark / (d.length / 4)
  }, [png.toString('base64'), DARK_LUMA])
}

async function run(i) {
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', FAST_3G)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })

  const urls = new Map()
  const finished = [] // { t, bytes, url }
  let lastActivity = Date.now()
  let inflight = 0
  cdp.on('Network.requestWillBeSent', (e) => { urls.set(e.requestId, e.request.url); inflight++; lastActivity = Date.now() })
  cdp.on('Network.loadingFinished', (e) => { finished.push({ t: Date.now(), bytes: e.encodedDataLength, url: urls.get(e.requestId) }); inflight--; lastActivity = Date.now() })
  cdp.on('Network.loadingFailed', () => { inflight--; lastActivity = Date.now() })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  const t0 = Date.now()
  await page.goto(base, { waitUntil: 'commit' })
  let cabinet = null
  const shots = []
  while (Date.now() - t0 < TIMEOUT_MS) {
    const vp = await page.$('.viewport')
    if (vp && cabinet === null) {
      const png = await vp.screenshot({ timeout: 5000 }).catch(() => null)
      if (png && (await darkShare(png)) > CABINET_DARK_SHARE) cabinet = Date.now() - t0
    }
    const marks = await page.evaluate(() => performance.getEntriesByType('mark').map((m) => m.name)).catch(() => [])
    const settled = cabinet !== null && inflight <= 0 && Date.now() - lastActivity > 3000
    if (shotDir && i === 0) {
      for (const stage of ['scene:first-frame', 'scene:full']) {
        if (marks.includes(stage) && !shots.includes(stage)) {
          shots.push(stage)
          await page.locator('.viewport').screenshot({ path: `${shotDir}/${stage.replace('scene:', '')}.png` })
        }
      }
      if (cabinet !== null && !shots.includes('cabinet')) {
        shots.push('cabinet')
        await page.locator('.viewport').screenshot({ path: `${shotDir}/first-cabinet.png` })
      }
    }
    if (settled && (marks.includes('scene:full') || !marks.length)) break
    await page.waitForTimeout(150)
  }
  const perf = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    nav: performance.timeOrigin,
    marks: Object.fromEntries(performance.getEntriesByType('mark').map((m) => [m.name, m.startTime])),
  }))
  // Page-clock marks map onto the wall clock through timeOrigin; t0 is within a few ms of it.
  const offset = perf.nav - t0
  const lastAsset = Math.max(...finished.filter((f) => ASSET.test(f.url ?? '')).map((f) => f.t)) - t0
  const firstFrame = perf.marks['scene:first-frame'] !== undefined ? perf.marks['scene:first-frame'] + offset : cabinet
  const full = perf.marks['scene:full'] !== undefined ? perf.marks['scene:full'] + offset : Math.max(lastAsset, cabinet)
  const bytesUntil = (ms) => finished.filter((f) => f.t - t0 <= ms).reduce((s, f) => s + f.bytes, 0)
  await context.close()
  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  if (cabinet === null) throw new Error('cabinet never appeared in the 3D area')
  return { fcp: perf.fcp + offset, cabinet, firstFrame, full, bytesAtFull: bytesUntil(full), bytesAtIdle: bytesUntil(Infinity) }
}

if (shotDir) mkdirSync(shotDir, { recursive: true })
const results = []
for (let i = 0; i < Number(runsArg); i++) {
  const r = await run(i)
  results.push(r)
  console.log(`run ${i + 1}:`, JSON.stringify(r))
}
await browser.close()
const median = (k) => results.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(results.length / 2)]
const s = (ms) => `${(ms / 1000).toFixed(1)} s`
const kb = (b) => `${Math.round(b / 1024)} KB`
console.log(`\n| metric (median of ${results.length}) | value |\n|---|---|`)
console.log(`| first contentful paint | ${s(median('fcp'))} |`)
console.log(`| cabinet visible in 3D area | ${s(median('cabinet'))} |`)
console.log(`| first WebGL frame | ${s(median('firstFrame'))} |`)
console.log(`| full-quality textures | ${s(median('full'))} |`)
console.log(`| bytes transferred to full quality | ${kb(median('bytesAtFull'))} |`)
console.log(`| bytes transferred at idle | ${kb(median('bytesAtIdle'))} |`)
