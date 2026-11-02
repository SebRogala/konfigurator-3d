import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SELECTION, type Selection } from '../src/catalog/catalog.ts'
import { formatZl, totalPrice } from '../src/pricing/total.ts'

// Expected amounts are written from the mock price table (base 3290 zł), not recomputed from the catalog.
const total = (patch: Partial<Selection> = {}) => totalPrice({ ...DEFAULT_SELECTION, ...patch })

test('default total is base plus the 1100 mm width and glazed-section surcharges', () => {
  assert.equal(total(), 3290 + 350 + 400)
})

test('every selected group surcharge adds to the base', () => {
  const t = total({ width: '1300', height: '1800', body: 'walnut', front: 'veneer-oak-light', glass: 'smoked', handle: 'push' })
  assert.equal(t, 3290 + 700 + 450 + 900 + 1200 + 400 + 250 + 290)
})

test('options in the same group cost the same', () => {
  assert.equal(total({ front: 'navy' }), total({ front: 'terracotta' }))
})

test('glass surcharge is dropped when no section is glazed', () => {
  assert.equal(total({ glazedSection: 'none', glass: 'smoked' }), 3290 + 350)
})

test('glass surcharge applies when a section is glazed', () => {
  assert.equal(total({ glazedSection: 'right', glass: 'smoked' }) - total({ glazedSection: 'right' }), 250)
})

test('formatZl prints pl-PL digits with a zł suffix', () => {
  assert.equal(formatZl(4040).replace(/\s/g, ' '), '4040 zł')
})
