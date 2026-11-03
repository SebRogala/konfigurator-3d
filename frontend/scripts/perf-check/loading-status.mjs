// Checks that the loading status clears once a newly picked wood's full maps are on screen.
// Scenario "after full": the default reaches full quality, full walnut maps are held, Korpus → Orzech is picked:
//   the status must show while held and disappear after release.
// Scenario "early": full maps of every wood are held from the start, Orzech is picked as soon as the first frame
//   shows (background preloading still pending): the status must disappear after release.
// Usage: PLAYWRIGHT_DIR=<dir holding node_modules/playwright@1.56.1> node loading-status.mjs <baseUrl>
import { createRequire } from 'node:module'

if (!process.env.PLAYWRIGHT_DIR) throw new Error('Set PLAYWRIGHT_DIR')
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/`)('playwright')
const [base] = process.argv.slice(2)
if (!base) throw new Error('Usage: node loading-status.mjs <baseUrl>')

const FULL_WALNUT = /\/textures\/walnut\/(color|color-1k|normal|roughness)\.webp$/
const FULL_ANY = /\/textures\/[^/]+\/(color|color-1k|normal|roughness)\.webp$|studio_small_09_(1k|512)\.hdr$/
const CLEAR_TIMEOUT_MS = 60_000

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const fails = []

async function scenario(name, heldPattern, pickWhen) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let release
  const held = new Promise((r) => (release = r))
  await page.route(heldPattern, async (route) => {
    await held
    await route.continue()
  })
  await page.goto(base)
  await page.waitForFunction((mark) => performance.getEntriesByName(mark).length > 0, pickWhen, { timeout: 120000 })
  const head = page.locator('[data-step="body"] .step__head')
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
  await page.locator('[data-field="body"] [data-option="walnut"]').click()
  await page.waitForTimeout(1500)
  const whileHeld = await page.locator('.viewport__loading').count()
  release()
  const cleared = await page
    .locator('.viewport__loading')
    .waitFor({ state: 'detached', timeout: CLEAR_TIMEOUT_MS })
    .then(() => true, () => false)
  const status = cleared ? 'cleared' : `still "${await page.locator('.viewport__loading').innerText()}"`
  console.log(`${name}: status while held ${whileHeld ? 'shown' : 'absent'}; after release ${status}`)
  if (!whileHeld) fails.push(`${name}: no status while walnut maps were held`)
  if (!cleared) fails.push(`${name}: status did not clear within ${CLEAR_TIMEOUT_MS / 1000} s after release`)
  if (errors.length) fails.push(`${name}: page errors ${errors.join('; ')}`)
  await page.close()
}

await scenario('after full', FULL_WALNUT, 'scene:full')
await scenario('early', FULL_ANY, 'scene:first-frame')
await browser.close()
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS: status clears in both scenarios')
process.exit(fails.length ? 1 : 0)
