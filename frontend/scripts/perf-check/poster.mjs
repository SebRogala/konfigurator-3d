// Regenerates public/poster-phone.webp and public/poster-desktop.webp: the default cabinet at full texture quality,
// cropped to the 3D area, which App shows until the first WebGL frame. Rerun after a change to the default
// configuration, the camera framing, lighting or materials.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node poster.mjs <baseUrl> <publicDir>
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base, pub] = process.argv.slice(2)
if (!base || !pub) throw new Error('Usage: node poster.mjs <baseUrl> <publicDir>')

// Phone: a 412 px wide portrait phone at 2× (the 3D area is 52vh there); desktop: 1440×900 at 1×.
const TARGETS = [
  { file: 'poster-phone.webp', viewport: { width: 412, height: 839 }, dpr: 2, mobile: true },
  { file: 'poster-desktop.webp', viewport: { width: 1440, height: 900 }, dpr: 1, mobile: false },
]
const QUALITY = 0.8

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const encoder = await browser.newPage()
for (const t of TARGETS) {
  const page = await browser.newPage({ viewport: t.viewport, deviceScaleFactor: t.dpr, isMobile: t.mobile, hasTouch: t.mobile })
  await page.goto(base)
  await page.waitForFunction(() => performance.getEntriesByName('scene:full').length > 0, null, { timeout: 120000 })
  // Overlays are not part of the scene.
  await page.addStyleTag({ content: '.viewer, .viewport__loading, .viewport__poster { display: none !important; }' })
  await page.waitForTimeout(2000) // camera fit settled, env map baked
  const png = await page.locator('.viewport').screenshot()
  const webp = await encoder.evaluate(async ([b64, q]) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(img.width, img.height)
    c.getContext('2d').drawImage(img, 0, 0)
    const blob = await c.convertToBlob({ type: 'image/webp', quality: q })
    if (blob.type !== 'image/webp') throw new Error(`encoder produced ${blob.type}`)
    return [...new Uint8Array(await blob.arrayBuffer())]
  }, [png.toString('base64'), QUALITY])
  writeFileSync(`${pub}/${t.file}`, Buffer.from(webp))
  console.log(`${t.file} ${Math.round(webp.length / 1024)} KB`)
  await page.close()
}
await browser.close()
