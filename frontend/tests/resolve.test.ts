import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { REFERENCE_CABINET, type ResolvedCabinet } from '../src/contract/cabinet.ts'
import { MOCK_CATALOG } from '../src/catalog/catalog.ts'
import type { FieldId, Selection } from '../src/model/catalog.ts'
import { resolveCabinet as resolveWith } from '../src/model/resolve.ts'

const DEFAULT_SELECTION = MOCK_CATALOG.defaultSelection
const resolveCabinet = (sel: Selection) => resolveWith(MOCK_CATALOG, sel)

test('default selection resolves to the reference cabinet', () => {
  assert.deepEqual(resolveCabinet(DEFAULT_SELECTION), REFERENCE_CABINET)
})

// Every catalog option → its contract value, written literally (one named case per option).
const CASES: { field: FieldId; key: keyof ResolvedCabinet; options: [string, unknown][] }[] = [
  { field: 'width', key: 'widthMm', options: [['900', 900], ['950', 950], ['1100', 1100], ['1300', 1300]] },
  { field: 'height', key: 'heightMm', options: [['1600', 1600], ['1750', 1750], ['1800', 1800]] },
  { field: 'sectionSplit', key: 'sectionSplit', options: [['wide', 'wide'], ['equal', 'equal']] },
  { field: 'body', key: 'body', options: [['oak-rustic', 'oak-rustic'], ['oak-light', 'oak-light'], ['walnut', 'walnut']] },
  {
    field: 'front',
    key: 'front',
    options: [
      ['black', { kind: 'colour', hex: '#1e1e1e' }],
      ['graphite', { kind: 'colour', hex: '#3b3d3f' }],
      ['white', { kind: 'colour', hex: '#ebe7df' }],
      ['cashmere', { kind: 'colour', hex: '#c7b8a2' }],
      ['navy', { kind: 'colour', hex: '#25304a' }],
      ['bottle-green', { kind: 'colour', hex: '#2f4a3c' }],
      ['terracotta', { kind: 'colour', hex: '#a3563e' }],
      ['veneer-oak-light', { kind: 'wood', wood: 'oak-light' }],
      ['veneer-oak-rustic', { kind: 'wood', wood: 'oak-rustic' }],
      ['veneer-walnut', { kind: 'wood', wood: 'walnut' }],
    ],
  },
  { field: 'glazedSection', key: 'glazedSection', options: [['left', 'left'], ['right', 'right'], ['none', 'none']] },
  { field: 'glass', key: 'glass', options: [['clear', 'clear'], ['smoked', 'smoked']] },
  { field: 'handle', key: 'handle', options: [['bar-black', 'bar-black'], ['bar-steel', 'bar-steel'], ['push', 'push']] },
]

for (const { field, key, options } of CASES) {
  describe(`${field} options resolve to ${key}`, () => {
    for (const [optionId, expected] of options) {
      test(`${field}=${optionId} → ${JSON.stringify(expected)}`, () => {
        assert.deepEqual(resolveCabinet({ ...DEFAULT_SELECTION, [field]: optionId })[key], expected)
      })
    }
  })
}

test('depth stays 420 mm whatever the size', () => {
  assert.equal(resolveCabinet({ ...DEFAULT_SELECTION, width: '1300', height: '1800' }).depthMm, 420)
})

test('an unknown option id throws, naming the field', () => {
  assert.throws(() => resolveCabinet({ ...DEFAULT_SELECTION, front: 'pink' }), /Unknown option "pink" in field "front"/)
})

test('an off-step width throws instead of resolving', () => {
  assert.throws(() => resolveCabinet({ ...DEFAULT_SELECTION, width: '1125' }), /Invalid value "1125" for range field "width"/)
})
