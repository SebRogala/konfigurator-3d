// Resize and orbit-limit evidence for /scene-check.html: canvas aspect refit and the azimuth/zoom limits.
// Usage: PLAYWRIGHT_DIR=<dir with playwright@1.56.1> node interact.mjs <baseUrl> <outDir>
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { capturePair, compareSettle, describeSettle, settlePasses } from './settle-compare.mjs'

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
// Zoom and orbit survive changes. Assertions read the destination camera state from window.cameraState().
const failures = []
const state = () => page.evaluate(() => window.cameraState())
const setConfig = (name) => page.evaluate((n) => window.setSceneConfig(n), name)
const RATIO_TOL = 0.01
const ANGLE_TOL = 0.005
await page.setViewportSize({ width: 900, height: 1000 })
await page.goto(`${base}/scene-check.html?config=reference`)
await page.waitForSelector('body[data-scene-ready]', { timeout: 120000 })
await settle()

// Wheel-only zoom (wheel emits no controlend), then a dimension change and a resize with no drag in between.
const wheelTo = async (ratio) => {
  await page.mouse.move(450, 500)
  for (let i = 0; i < 20 && (await state()).zoomRatio > ratio; i++) {
    await page.mouse.wheel(0, -60)
    await page.waitForTimeout(150)
  }
  await settle()
}
await wheelTo(0.8)
const wheelOnly = await state()
console.log('wheel-only state', wheelOnly)
if (wheelOnly.zoomRatio > 0.85) failures.push(`wheel-only: could not zoom away from 1 (ratio ${wheelOnly.zoomRatio})`)
await setConfig('height-1800')
await settle()
const wheelAfterHeight = await state()
console.log('wheel-only after height', wheelAfterHeight)
if (Math.abs(wheelAfterHeight.zoomRatio - wheelOnly.zoomRatio) > RATIO_TOL) failures.push(`wheel-only height change: ${wheelOnly.zoomRatio} -> ${wheelAfterHeight.zoomRatio}`)
await page.setViewportSize({ width: 600, height: 1000 })
await settle()
const wheelAfterResize = await state()
console.log('wheel-only after resize', wheelAfterResize)
if (Math.abs(wheelAfterResize.zoomRatio - wheelOnly.zoomRatio) > RATIO_TOL) failures.push(`wheel-only resize: ${wheelOnly.zoomRatio} -> ${wheelAfterResize.zoomRatio}`)
await page.setViewportSize({ width: 900, height: 1000 })
await setConfig('reference')
await settle()

// User input: zoom in until the ratio is clearly away from 1, then tilt the view up.
await page.mouse.move(450, 500)
for (let i = 0; i < 20 && (await state()).zoomRatio > 0.72; i++) {
  await page.mouse.wheel(0, -60)
  await page.waitForTimeout(150)
}
await page.mouse.move(450, 500); await page.mouse.down(); await page.mouse.move(450, 560, { steps: 10 }); await page.mouse.up()
await settle()
const user = await state()
console.log('user state', user)
if (user.zoomRatio > 0.75) failures.push(`could not set a user zoom away from 1 (ratio ${user.zoomRatio})`)

const expectKept = async (label, { angles = true } = {}) => {
  await settle()
  const now = await state()
  console.log(label, now)
  if (Math.abs(now.zoomRatio - user.zoomRatio) > RATIO_TOL) failures.push(`${label}: zoom ratio ${user.zoomRatio.toFixed(4)} -> ${now.zoomRatio.toFixed(4)}`)
  if (angles && Math.abs(now.azimuth - user.azimuth) > ANGLE_TOL) failures.push(`${label}: azimuth ${user.azimuth} -> ${now.azimuth}`)
  if (angles && Math.abs(now.polar - user.polar) > ANGLE_TOL) failures.push(`${label}: polar ${user.polar} -> ${now.polar}`)
}

await setConfig('white-steel')
await shot('zoom-after-front-handle')
await expectKept('front+handle change')
await setConfig('height-1800')
await shot('zoom-after-height')
await expectKept('height change')
await setConfig('widest-tallest')
await shot('zoom-after-width')
await expectKept('width change')
// Rapid consecutive dimension changes, no waiting for animations.
for (const c of ['reference', 'height-1800', 'narrowest', 'widest-tallest', 'reference']) {
  await setConfig(c)
  await page.waitForTimeout(40)
}
await expectKept('rapid dimension changes')
// Burst of resizes without waiting for the refit animations.
for (let w = 850; w >= 300; w -= 50) {
  await page.setViewportSize({ width: w, height: 1000 })
  await page.waitForTimeout(70)
}
await shot('zoom-after-resize-burst')
await expectKept('resize burst')

// Viewer controls: presets keep the user's zoom ratio; snapshot returns a non-empty PNG.
const PRESETS = { front: [0, 85], 'three-quarter': [20, 80], side: [90, 85] }
await page.setViewportSize({ width: 900, height: 1000 })
await setConfig('reference')
await settle()
await wheelTo(0.8)
const beforePresets = await state()
for (const [preset, [az, polar]] of Object.entries(PRESETS)) {
  await page.evaluate((p) => window.sceneControls().setView(p), preset)
  await settle()
  const now = await state()
  console.log('preset', preset, now)
  if (Math.abs(now.zoomRatio - beforePresets.zoomRatio) > RATIO_TOL) failures.push(`preset ${preset}: zoom ratio ${beforePresets.zoomRatio} -> ${now.zoomRatio}`)
  if (Math.abs(now.azimuth - (az * Math.PI) / 180) > ANGLE_TOL || Math.abs(now.polar - (polar * Math.PI) / 180) > ANGLE_TOL) failures.push(`preset ${preset}: angles ${now.azimuth}, ${now.polar}`)
  await shot(`preset-${preset}`)
}
const snap = await page.evaluate(async () => {
  const blob = await window.sceneControls().snapshot()
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  return { type: blob.type, size: blob.size, pngSignature: [...head].join(',') === '137,80,78,71,13,10,26,10' }
})
console.log('snapshot', snap)
if (snap.type !== 'image/png' || !snap.pngSignature || snap.size < 10000) failures.push(`snapshot not a usable PNG: ${JSON.stringify(snap)}`)
// Preset distances stay inside the orbit limits on narrow and wide canvases, so the next wheel event can't jump.
const EPS = 1e-6
for (const [vw, vh] of [[300, 1000], [1400, 500]]) {
  await page.setViewportSize({ width: vw, height: vh })
  await settle()
  await page.mouse.move(vw / 2, vh / 2)
  for (const [label, wheelDy, preset, nextDy] of [['min', -120, 'side', 60], ['max', 120, 'front', -60]]) {
    for (let i = 0; i < 25; i++) await page.mouse.wheel(0, wheelDy)
    await settle()
    await page.evaluate((p) => window.sceneControls().setView(p), preset)
    await settle()
    const at = await state()
    console.log(`limits ${vw}x${vh} ${label} ${preset}`, at)
    if (at.distance < at.minDistance - EPS || at.distance > at.maxDistance + EPS) failures.push(`${vw}x${vh} ${preset} at ${label} zoom: distance ${at.distance} outside [${at.minDistance}, ${at.maxDistance}]`)
    await page.mouse.wheel(0, nextDy)
    await settle()
    const next = await state()
    // A wheel step away from the limit must move the camera in its own direction, never snap the other way.
    const moved = next.distance - at.distance
    if (Math.sign(moved) !== Math.sign(nextDy) && Math.abs(moved) > EPS) failures.push(`${vw}x${vh} ${preset}: next wheel jumped ${at.distance} -> ${next.distance}`)
  }
}
await page.setViewportSize({ width: 900, height: 1000 })
await settle()

// Door swing: after an idle period the swing still animates (an intermediate angle is seen) and ends near 0.6 s.
const swing = async (open) => {
  await page.waitForTimeout(1500) // idle: no frames pending
  return page.evaluate(async (o) => {
    const longTasks = []
    const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(Math.round(e.duration))))
    obs.observe({ type: 'longtask' })
    const t0 = performance.now()
    window.setDoorsOpen(o)
    const samples = []
    while (performance.now() - t0 < 3000) {
      await new Promise((r) => setTimeout(r, 20))
      const a = Math.max(...Object.values(window.doorAngles()).map(Math.abs))
      samples.push([performance.now() - t0, a])
      if (o ? a >= 99.9 : a <= 0.1) break
    }
    obs.disconnect()
    return { samples, longTasks }
  }, open)
}
for (const open of [true, false]) {
  const { samples, longTasks } = await swing(open)
  const mid = samples.filter(([, a]) => a > 10 && a < 90).length
  // Swing duration runs from the first moved sample to the end; the command → first frame latency is reported apart.
  const first = samples.find(([, a]) => (open ? a > 0.1 : a < 99.9))
  const [end] = samples[samples.length - 1]
  const done = end - first[0]
  // The last in-flight sample: the eased swing itself must run its ~0.6 s schedule.
  const lastMid = samples.filter(([, a]) => a > 0.1 && a < 99.9).pop()[0] - first[0]
  console.log('long tasks ms', longTasks.join(','))
  const distinct = samples.filter(([, a], i) => i === 0 || a !== samples[i - 1][1]).map(([t, a]) => `${Math.round(t)}:${a.toFixed(1)}`)
  console.log('trace', distinct.join(' '))
  console.log(open ? 'open' : 'close', 'intermediate samples', mid, 'first movement at ms', Math.round(first[0]), 'last in-flight ms', Math.round(lastMid), 'reached end ms', Math.round(done))
  if (mid === 0) failures.push(`${open ? 'open' : 'close'}: no intermediate angle observed (snapped)`)
  // In-flight frames must stop by ≈0.6 s (+ one frame); SwiftShader's long tasks can delay the final frame, reported above.
  if (lastMid > 700) failures.push(`${open ? 'open' : 'close'}: last in-flight frame at ${lastMid} ms, expected the swing to end ≈600 ms`)
}
await shot('doors-closed')

// Full sphere: four horizontal quarters, straight down, from below, and the new presets.
await setConfig('reference')
await page.evaluate(() => window.sceneControls().setView('three-quarter'))
await settle()
await page.mouse.move(450, 500)
for (let i = 0; i < 30 && (await state()).zoomRatio > 1.05; i++) {
  await page.mouse.wheel(0, -60)
  await page.waitForTimeout(100)
}
await settle()
for (const [label, az, polar] of [['az0', 0, 80], ['az90', 90, 80], ['az180', 180, 80], ['az270', 270, 80], ['straight-down', 0, 0], ['from-below', 30, 180]]) {
  await page.evaluate(([a, p]) => window.setCameraAngles((a * Math.PI) / 180, (p * Math.PI) / 180), [az, polar])
  await shot(`orbit360-${label}`)
  const st = await state()
  if (!Number.isFinite(st.distance) || !Number.isFinite(st.polar)) failures.push(`orbit360 ${label}: camera state not finite`)
}
for (const [preset, az, polar] of [['back', 180, 85], ['top', 0, 0]]) {
  await page.evaluate((p) => window.sceneControls().setView(p), preset)
  await settle()
  const st = await state()
  // Azimuth may wrap by whole turns after free orbiting.
  const dAz = Math.abs(Math.atan2(Math.sin(st.azimuth - (az * Math.PI) / 180), Math.cos(st.azimuth - (az * Math.PI) / 180)))
  // At the pole camera-controls keeps a tiny epsilon off 0.
  if (Math.abs(st.polar - (polar * Math.PI) / 180) > 0.01 || (polar !== 0 && dAz > ANGLE_TOL)) failures.push(`preset ${preset}: angles ${st.azimuth}, ${st.polar}`)
  await shot(`preset-${preset}`)
}

// Handles on the lower doors, front view: wide and equal splits.
for (const c of ['reference', 'split-equal', 'glazed-right-smoked']) {
  await setConfig(c)
  await page.evaluate(() => window.sceneControls().setView('front'))
  await settle()
  await page.screenshot({ path: `${out}/handles-${c}.png`, clip: { x: 0, y: 380, width: 900, height: 420 } })
  console.log('shot', `handles-${c}`)
}

// Strict identity: a frame rendered while the camera moves equals the settled frame at the same camera.
{
  await page.goto(`${base}/scene-check.html?config=reference`)
  await page.waitForSelector('body[data-scene-ready]', { timeout: 120000 })
  await settle()
  const [moving, settled] = await capturePair(page, [2.2, 1.3, 3.4], [0, 0.52, 0])
  const st = await compareSettle(page, moving, settled)
  console.log(`settle pair: ${describeSettle(st)}`)
  if (!settlePasses(st)) failures.push('settle pair: the settled frame differs from the moving frame')
}

await browser.close()
if (errors.length) failures.push('page errors:\n' + errors.join('\n'))
if (failures.length) { console.error('failures:\n' + failures.join('\n')); process.exit(1) }
