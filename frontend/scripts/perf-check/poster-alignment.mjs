// Checks that the poster, the low-tier first frame and the full-quality frame put the cabinet in the same place.
// For each viewport: full-tier textures/HDRI are held until the low frame is captured; the poster is captured with
// the canvas hidden. Compares the bounding box of dark (cabinet) pixels in the 3D area across the three stages.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node poster-alignment.mjs <baseUrl> [shotDir]
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, shotDir] = process.argv.slice(2)
if (!base) throw new Error('Usage: node poster-alignment.mjs <baseUrl> [shotDir]')
if (shotDir) mkdirSync(shotDir, { recursive: true })

const SIZES = [[1920, 1080], [820, 1180], [1440, 900], [390, 844]]
/** Allowed edge difference, px: perspective differs slightly when the fitted distance differs from the poster's. */
const TOLERANCE_PX = 4
const DARK_LUMA = 110
const FULL_ASSET = /\/textures\/(?!.*\/low\/)(.*\.webp|studio_small_09_(1k|512)\.hdr)$/
const HIDE_OVERLAYS = '.viewer, .viewport__loading { display: none !important; }'

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const analyser = await browser.newPage()
const bounds = (png) =>
  analyser.evaluate(async ([b64, luma]) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(img.width, img.height)
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, img.width, img.height).data
    let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1]
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4
        if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < luma) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
        }
      }
    return [x0, y0, x1, y1]
  }, [png.toString('base64'), DARK_LUMA])

const fails = []
for (const [width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height } })
  let release
  const held = new Promise((r) => (release = r))
  await page.route(FULL_ASSET, async (route) => {
    await held
    await route.continue()
  })
  await page.goto(base)
  await page.addStyleTag({ content: HIDE_OVERLAYS })
  const vp = page.locator('.viewport')
  const shot = async (stage) => {
    const png = await vp.screenshot()
    if (shotDir) await vp.screenshot({ path: `${shotDir}/${width}-${stage}.png` })
    return bounds(png)
  }
  // Poster: canvas hidden, poster forced visible and sized.
  await page.waitForFunction(() => document.querySelector('.viewport__poster img')?.style.height)
  const posterStyle = await page.addStyleTag({ content: '.viewport canvas { visibility: hidden !important; } .viewport__poster { opacity: 1 !important; transition: none !important; }' })
  await page.waitForTimeout(300)
  const poster = await shot('poster')
  await posterStyle.evaluate((el) => el.remove())
  await page.addStyleTag({ content: '.viewport__poster { display: none !important; }' })
  await page.waitForFunction(() => performance.getEntriesByName('scene:first-frame').length > 0, null, { timeout: 120000 })
  await page.waitForTimeout(1500)
  const low = await shot('low')
  release()
  await page.waitForFunction(() => performance.getEntriesByName('scene:full').length > 0, null, { timeout: 120000 })
  await page.waitForTimeout(1500)
  const full = await shot('full')
  const worst = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])))
  const line = `${width}x${height} poster ${poster} low ${low} full ${full} | poster↔full ${worst(poster, full)} px, low↔full ${worst(low, full)} px`
  console.log(line)
  if (worst(poster, full) > TOLERANCE_PX || worst(low, full) > TOLERANCE_PX) fails.push(line)
  await page.close()
}
await browser.close()
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : `PASS: ${SIZES.length} viewports within ${TOLERANCE_PX} px`)
process.exit(fails.length ? 1 : 0)
