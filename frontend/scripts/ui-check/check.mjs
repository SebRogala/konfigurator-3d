// Headless UI check: every step opens, every option sets the expected total, summary lists the choices.
// Run: npx -y playwright@1.56.1 ... see README line in wi-ui report; usage: node check.mjs <baseUrl> <shotDir>
import { chromium } from 'playwright'

const [base, shots] = process.argv.slice(2)
const DEFAULT = 4040
// [step, field, option, expected total] — expected amounts written from the mock price table, not computed by the app.
const CASES = [
  ['dimensions', 'width', '900', 3690], ['dimensions', 'width', '1300', 4390], ['dimensions', 'height', '1800', 4490],
  ['body', 'body', 'oak-light', 4040], ['body', 'body', 'walnut', 4940],
  ['fronts', 'front', 'graphite', 4040], ['fronts', 'front', 'white', 4040], ['fronts', 'front', 'cashmere', 4040],
  ['fronts', 'front', 'navy', 4640], ['fronts', 'front', 'bottle-green', 4640], ['fronts', 'front', 'terracotta', 4640],
  ['fronts', 'front', 'veneer-oak-light', 5240], ['fronts', 'front', 'veneer-oak-rustic', 5240], ['fronts', 'front', 'veneer-walnut', 5240],
  ['glazing', 'glazedSection', 'right', 4040], ['glazing', 'glazedSection', 'none', 3640], ['glazing', 'glass', 'smoked', 4290],
  ['handles', 'handle', 'bar-steel', 4040], ['handles', 'handle', 'push', 4330],
]
const zl = (n) => `${n} zł`
const fails = []
const expect = (cond, msg) => { if (!cond) fails.push(msg) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const total = () => page.getByTestId('total').innerText()
const openStep = async (id) => {
  const head = page.locator(`[data-step="${id}"] .step__head`)
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
}

await page.goto(base)
expect((await total()) === zl(DEFAULT), `default total ${await total()}`)
for (const id of ['dimensions', 'body', 'fronts', 'glazing', 'handles']) {
  await openStep(id)
  expect(await page.locator(`[data-step="${id}"] .step__body`).isVisible(), `step ${id} did not open`)
}
for (const [step, field, option, want] of CASES) {
  await page.reload()
  await openStep(step)
  await page.locator(`[data-step="${step}"] [data-field="${field}"] [data-option="${option}"]`).click()
  const got = await total()
  expect(got === zl(want), `${field}=${option}: total ${got}, want ${zl(want)}`)
}
// Glass is not charged and hidden once no section is glazed.
await page.reload(); await openStep('glazing')
await page.locator('[data-field="glass"] [data-option="smoked"]').click()
await page.locator('[data-field="glazedSection"] [data-option="none"]').click()
expect((await total()) === zl(3640), `smoked then none: ${await total()}`)
expect((await page.locator('[data-field="glass"]').count()) === 0, 'glass field visible with no glazing')

// Summary after a mixed configuration.
await page.reload()
await openStep('dimensions'); await page.locator('[data-field="width"] [data-option="1300"]').click()
await openStep('fronts'); await page.locator('[data-option="navy"]').click()
await openStep('handles'); await page.locator('[data-option="push"]').click()
await openStep('fronts')
await page.screenshot({ path: `${shots}/desktop-fronts.png` })
await page.getByRole('button', { name: 'Podsumowanie' }).click()
await page.locator('dialog.summary[open]').waitFor()
const text = await page.getByRole('dialog').innerText()
for (const s of ['1300 mm', '1600 mm', 'Dąb rustykalny', 'Granat', 'Witryna po lewej', 'Bezbarwne', 'Push-to-open', '+700 zł', '+600 zł', '+290 zł', '5280 zł'])
  expect(text.includes(s), `summary missing "${s}"`)
expect((await total()) === zl(5280), `mixed total ${await total()}`)
await page.screenshot({ path: `${shots}/desktop-summary.png` })

// Keyboard: Enter opens, focus starts on close and Tab stays inside; every dismissal restores focus to the trigger.
const trigger = page.getByRole('button', { name: 'Podsumowanie' })
const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim())
const openByKeyboard = async () => {
  await trigger.focus(); await page.keyboard.press('Enter')
  await page.locator('dialog.summary[open]').waitFor()
}
const expectClosedWithFocus = async (how) => {
  await page.locator('dialog.summary').waitFor({ state: 'detached', timeout: 2000 }).catch(() => expect(false, `${how} did not close the summary`))
  expect((await focusedLabel()) === 'Podsumowanie', `focus after ${how}: ${await focusedLabel()}`)
}
await page.reload()
await openByKeyboard()
expect((await focusedLabel()) === 'Zamknij', `focus on open: ${await focusedLabel()}`)
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Tab')
  const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog.summary') || document.activeElement === document.body)
  expect(inside, `Tab ${i + 1} left the dialog: ${await focusedLabel()}`)
}
await page.keyboard.press('Escape')
await expectClosedWithFocus('Escape')
await openByKeyboard()
await page.keyboard.press('Enter') // focus is on × after opening
await expectClosedWithFocus('keyboard ×')
await openByKeyboard()
await page.mouse.click(20, 400) // left of the 440 px panel: the backdrop
await expectClosedWithFocus('backdrop click')

// Resize across the 820 px breakpoint with the Canvas mounted: steps stay fully on-screen, no horizontal scroll.
await page.reload()
await page.locator('.viewport canvas').waitFor({ timeout: 15000 }).catch(() => expect(false, 'no canvas mounted for the resize case'))
for (const w of [1440, 830, 390]) {
  await page.setViewportSize({ width: w, height: 900 })
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const b = document.querySelector('.steps').getBoundingClientRect()
    return { left: b.left, right: b.right, vw: window.innerWidth, scroll: document.documentElement.scrollWidth }
  })
  expect(r.left >= 0 && r.right <= r.vw + 0.5, `${w}px: steps at ${r.left}..${r.right}, viewport ${r.vw}`)
  expect(r.scroll <= r.vw, `${w}px: horizontal scroll (${r.scroll} > ${r.vw})`)
}
await page.screenshot({ path: `${shots}/resize-1440-830-390.png` })

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await phone.goto(base)
await phone.locator('[data-step="fronts"] .step__head').click()
await phone.screenshot({ path: `${shots}/phone-390.png` })
await phone.locator('[data-step="fronts"]').scrollIntoViewIfNeeded()
await phone.screenshot({ path: `${shots}/phone-390-fronts.png` })
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
expect(!overflow, 'horizontal overflow at 390 px')
await phone.getByRole('button', { name: 'Podsumowanie' }).click()
await phone.screenshot({ path: `${shots}/phone-390-summary.png` })

await browser.close()
fails.push(...errors.map((e) => `page error: ${e}`))
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : `PASS: ${CASES.length} option cases, 5 steps, summary, keyboard, resize 1440→830→390, 390 px`)
process.exit(fails.length ? 1 : 0)
