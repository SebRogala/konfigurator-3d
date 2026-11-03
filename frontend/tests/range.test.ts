import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_CATALOG } from '../src/catalog/catalog.ts'
import type { Selection } from '../src/model/catalog.ts'
import { totalPrice } from '../src/model/pricing.ts'
import { rangeValue, snapToRange } from '../src/model/range.ts'

const { width, height } = MOCK_CATALOG.fields
const total = (patch: Partial<Selection>) => totalPrice(MOCK_CATALOG, { ...MOCK_CATALOG.defaultSelection, ...patch })
// Default total 4040 zł includes width 1100 (+400) and height 1600 (0); amounts below are literal.

describe('range pricing: 100 zł per 50 mm step above the minimum', () => {
  test('minimum width 900 carries no width surcharge', () => assert.equal(total({ width: '900' }), 3640))
  test('one step above minimum width adds 100 zł', () => assert.equal(total({ width: '950' }), 3740))
  test('default 1100 × 1600 stays 4040 zł', () => assert.equal(total({}), 4040))
  test('maximum 1300 × 1800 adds 800 + 400 zł', () => assert.equal(total({ width: '1300', height: '1800' }), 4840))
  test('one step above minimum height adds 100 zł', () => assert.equal(total({ height: '1650' }), 4140))
})

describe('snapToRange normalises user input', () => {
  const cases: [string, typeof width, number, number][] = [
    ['rounds down to the nearer step', width, 1124, 1100],
    ['rounds up to the nearer step', width, 1126, 1150],
    ['clamps above the maximum', width, 2000, 1300],
    ['clamps below the minimum', width, 100, 900],
    ['falls back to the minimum for non-numbers', width, Number.NaN, 900],
    ['keeps an on-step height', height, 1750, 1750],
    ['clamps height above the maximum', height, 1900, 1800],
  ]
  for (const [name, field, input, want] of cases) test(`${field.id}: ${name} (${input} → ${want})`, () => assert.equal(snapToRange(field, input), want))
})

describe('rangeValue rejects stored values that are not on a step in range', () => {
  for (const raw of ['1125', '1350', '850', '', 'abc', '1100.5']) {
    test(`width "${raw}" throws`, () => assert.throws(() => rangeValue(width, raw), /Invalid value/))
  }
  test('width "1150" is accepted', () => assert.equal(rangeValue(width, '1150'), 1150))
})
