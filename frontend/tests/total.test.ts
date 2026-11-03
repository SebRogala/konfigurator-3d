import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_CATALOG } from '../src/catalog/catalog.ts'
import type { Selection } from '../src/model/catalog.ts'
import { totalPrice } from '../src/model/pricing.ts'
import { formatZl } from '../src/ui/format.ts'

// Expected amounts are written from the mock price table (base 3240 zł; width/height 100 zł per 50 mm above 900/1600), not recomputed from the catalog.
const total = (patch: Partial<Selection> = {}) => totalPrice(MOCK_CATALOG, { ...MOCK_CATALOG.defaultSelection, ...patch })

test('default total is base plus the 1100 mm width and glazed-section surcharges', () => {
  assert.equal(total(), 3240 + 400 + 400)
})

test('every range and group surcharge adds to the base', () => {
  const t = total({ width: '1300', height: '1800', body: 'walnut', front: 'veneer-oak-light', glass: 'smoked', handle: 'push' })
  assert.equal(t, 3240 + 800 + 400 + 900 + 1200 + 400 + 250 + 290)
})

test('options in the same group cost the same', () => {
  assert.equal(total({ front: 'navy' }), total({ front: 'terracotta' }))
})

test('glass surcharge is dropped when no section is glazed', () => {
  assert.equal(total({ glazedSection: 'none', glass: 'smoked' }), 3240 + 400)
})

test('glass surcharge applies when a section is glazed', () => {
  assert.equal(total({ glazedSection: 'right', glass: 'smoked' }) - total({ glazedSection: 'right' }), 250)
})

test('formatZl prints pl-PL digits with a zł suffix', () => {
  assert.equal(formatZl(4040).replace(/\s/g, ' '), '4040 zł')
})
