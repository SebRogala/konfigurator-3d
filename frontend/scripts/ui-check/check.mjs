// Headless UI check: every step opens, every option sets the expected total, summary lists the choices.
// Run: npx -y playwright@1.56.1 ... see README line in wi-ui report; usage: node check.mjs <baseUrl> <shotDir>
import { chromium } from 'playwright'

const [base, shots] = process.argv.slice(2)
const DEFAULT = 4040
// Range fields: [field, typed value, expected stored mm, expected total] — 100 zł per 50 mm above 900 / 1600.
const RANGE_CASES = [
  ['width', '900', 900, 3640], ['width', '1300', 1300, 4440], ['width', '1125', 1150, 4140], ['width', '5000', 1300, 4440],
  ['height', '1800', 1800, 4440], ['height', '1700', 1700, 4240], ['height', '1590', 1600, 4040],
]
// [step, field, option, expected total] — expected amounts written from the mock price table, not computed by the app.
const CASES = [
  ['dimensions', 'sectionSplit', 'equal', 4040],
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

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
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

for (const [field, typed, mm, want] of RANGE_CASES) {
  await page.reload()
  await openStep('dimensions')
  const box = page.locator(`[data-field="${field}"] .range__box`)
  await box.fill(typed); await box.press('Enter')
  const shown = await box.inputValue()
  const slider = await page.locator(`[data-field="${field}"] .range__slider`).inputValue()
  expect(shown === String(mm) && slider === String(mm), `${field} typed ${typed}: box ${shown}, slider ${slider}, want ${mm}`)
  expect((await total()) === zl(want), `${field} typed ${typed}: total ${await total()}, want ${zl(want)}`)
}
// Slider by keyboard: one ArrowRight is one 50 mm step (+100 zł).
await page.reload(); await openStep('dimensions')
await page.locator('[data-field="width"] .range__slider').focus(); await page.keyboard.press('ArrowRight')
expect((await page.locator('[data-field="width"] .range__box').inputValue()) === '1150', 'slider ArrowRight did not step width to 1150')
expect((await total()) === zl(4140), `slider step total ${await total()}`)
// Glass is not charged and hidden once no section is glazed.
await page.reload(); await openStep('glazing')
await page.locator('[data-field="glass"] [data-option="smoked"]').click()
await page.locator('[data-field="glazedSection"] [data-option="none"]').click()
expect((await total()) === zl(3640), `smoked then none: ${await total()}`)
expect((await page.locator('[data-field="glass"]').count()) === 0, 'glass field visible with no glazing')

// Summary after a mixed configuration.
await page.reload()
await openStep('dimensions'); await page.locator('[data-field="width"] .range__box').fill('1300'); await page.locator('[data-field="width"] .range__box').press('Enter')
await openStep('fronts'); await page.locator('[data-option="navy"]').click()
await openStep('handles'); await page.locator('[data-option="push"]').click()
await openStep('fronts')
await page.screenshot({ path: `${shots}/desktop-fronts.png` })
await page.getByRole('button', { name: 'Podsumowanie' }).click()
await page.locator('dialog.summary[open]').waitFor()
const text = await page.getByRole('dialog').innerText()
for (const s of ['1300 mm', '1600 mm', 'Szeroki segment z witryną', 'Dąb rustykalny', 'Granat', 'Witryna po lewej', 'Bezbarwne', 'Push-to-open', '+800 zł', '+600 zł', '+290 zł', '5330 zł'])
  expect(text.includes(s), `summary missing "${s}"`)
expect((await total()) === zl(5330), `mixed total ${await total()}`)
await page.screenshot({ path: `${shots}/desktop-summary.png` })

// Keyboard: Enter opens, focus starts on close and Tab stays inside; every dismissal restores focus to the trigger.
const trigger = page.getByRole('button', { name: 'Podsumowanie' })
const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim())
const openByKeyboard = async () => {
  await trigger.focus(); await page.keyboard.press('Enter')
  await page.locator('dialog.summary[open]').waitFor()
}
const expectClosedWithFocus = async (how) => {
  await page.locator('dialog.summary').waitFor({ state: 'detached', timeout: 8000 }).catch(() => expect(false, `${how} did not close the summary`))
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

// Sterowanie panel: collapsed by default; Escape and outside click close it; every action has an observable effect.
await page.reload()
await page.locator('.viewport canvas').waitFor({ timeout: 15000 }).catch(() => expect(false, 'no canvas for the panel case'))
await page.waitForTimeout(1500)
const panelToggle = page.getByRole('button', { name: 'Sterowanie' })
expect((await page.locator('#viewer-menu').count()) === 0, 'Sterowanie menu open by default')
await panelToggle.focus(); await page.keyboard.press('Enter')
expect(await page.locator('#viewer-menu').isVisible(), 'Enter did not open Sterowanie')
await page.keyboard.press('Escape')
expect((await page.locator('#viewer-menu').count()) === 0, 'Escape did not close Sterowanie')
expect((await focusedLabel()) === 'Sterowanie', `focus after Escape: ${await focusedLabel()}`)
await panelToggle.click(); await page.mouse.click(700, 600)
expect((await page.locator('#viewer-menu').count()) === 0, 'outside click did not close Sterowanie')
// Every menu item carries one aria-hidden icon before its label.
await panelToggle.click()
const icons = await page.evaluate(() => [...document.querySelectorAll('#viewer-menu .viewer__btn')].map((b) => ({ t: b.textContent.trim(), ok: b.firstElementChild?.matches('svg.icon[aria-hidden="true"]') && b.querySelectorAll('svg').length === 1 })))
expect(icons.length === 6 && icons.every((i) => i.ok), `menu icons: ${JSON.stringify(icons)}`)
expect((await page.locator('#viewer-menu .viewer__label svg').count()) === 0, 'section header has an icon')
await page.locator('#viewer-menu').screenshot({ path: `${shots}/viewer-menu.png` })
await panelToggle.click()
const viewShot = () => page.locator('.viewport canvas').screenshot()
await panelToggle.click()
for (const preset of ['front', 'side', 'three-quarter']) {
  const before = await viewShot()
  await page.locator(`[data-view="${preset}"]`).click()
  await page.waitForTimeout(1500)
  expect(!before.equals(await viewShot()), `camera ${preset}: the view did not change`)
}
const doors = page.locator('[data-action="doors"]')
const closedShot = await viewShot()
await doors.click(); await page.waitForTimeout(1500)
expect((await doors.innerText()) === 'Zamknij drzwi', `doors label after open: ${await doors.innerText()}`)
expect(!closedShot.equals(await viewShot()), 'doors: the view did not change when opening')
await page.screenshot({ path: `${shots}/viewer-doors-open.png` })
await doors.click()
expect((await doors.innerText()) === 'Otwórz drzwi', `doors label after close: ${await doors.innerText()}`)
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.locator('[data-action="snapshot"]').click()])
expect(dl?.suggestedFilename() === 'szafka-1100x1600.png', `snapshot download: ${dl?.suggestedFilename() ?? 'none'}`)
if (dl) {
  const head = (await import('node:fs')).readFileSync(await dl.path()).subarray(0, 8)
  expect(head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'snapshot is not a PNG')
}
const fsBtn = page.locator('[data-action="fullscreen"]')
const fsCheck = async (label) => {
  await fsBtn.click(); await page.waitForTimeout(400)
  expect(await page.evaluate(() => document.fullscreenElement?.classList.contains('app') ?? false), `${label}: app root is not fullscreen`)
  expect((await fsBtn.innerText()) === 'Zamknij pełny ekran', `${label}: fullscreen label ${await fsBtn.innerText()}`)
  const vis = await page.evaluate(() => {
    const inView = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return !!r && r.width > 0 && r.top < innerHeight && r.left >= 0 && r.right <= innerWidth + 0.5 }
    return { header: inView('.topbar'), viewport: inView('.viewport'), steps: inView('.steps'), scroll: document.documentElement.scrollWidth <= innerWidth }
  })
  for (const [k, ok] of Object.entries(vis)) expect(ok, `${label}: ${k} not usable in fullscreen`)
  await page.screenshot({ path: `${shots}/fullscreen-${label}.png` })
  // Summary dialog opens on top of the fullscreen app.
  await page.getByRole('button', { name: 'Podsumowanie' }).click()
  await page.locator('dialog.summary[open]').waitFor()
  const onTop = await page.evaluate(() => {
    const r = document.querySelector('dialog.summary').getBoundingClientRect()
    return !!document.elementFromPoint(r.left + r.width / 2, r.top + 40)?.closest('dialog.summary')
  })
  expect(onTop, `${label}: summary dialog not on top in fullscreen`)
  await page.screenshot({ path: `${shots}/fullscreen-${label}-summary.png` })
  await page.keyboard.press('Escape')
  await page.locator('dialog.summary').waitFor({ state: 'detached', timeout: 8000 }).catch(() => expect(false, `${label}: summary did not close in fullscreen`))
  expect(await page.evaluate(() => !!document.fullscreenElement), `${label}: closing the summary left fullscreen`)
  // Exit the way Escape does in a real browser (document.exitFullscreen), then check the label and layout restore.
  await page.evaluate(() => document.exitFullscreen()); await page.waitForTimeout(400)
  expect(await page.evaluate(() => document.fullscreenElement === null), `${label}: did not exit fullscreen`)
  if (!(await page.locator('#viewer-menu').count())) await panelToggle.click()
  expect((await fsBtn.innerText()) === 'Pełny ekran', `${label}: label after exit ${await fsBtn.innerText()}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal scroll after exit`)
}
await page.setViewportSize({ width: 1920, height: 1080 }); await fsCheck('1920')
await page.setViewportSize({ width: 390, height: 844 }); await fsCheck('390')
// Exit through the menu button too.
await fsBtn.click(); await page.waitForTimeout(300); await fsBtn.click(); await page.waitForTimeout(300)
expect(await page.evaluate(() => document.fullscreenElement === null), 'fullscreen: menu button did not exit')

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
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : `PASS: ${CASES.length} option cases, ${RANGE_CASES.length} range cases + slider, Sterowanie panel, 5 steps, summary, keyboard, resize 1440→830→390, 390 px`)
process.exit(fails.length ? 1 : 0)
