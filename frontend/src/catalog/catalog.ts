// The one mock price/catalog file (stages 0–1): a single Catalog value; stage 2 swaps the source.
// Shape per docs/3d-configurator/conventions.md § Pricing model:
// a base price, size ranges priced per step, plus option groups, each with one flat surcharge shared by all its options.
import type { FrontFinish, GlassKey, GlazedSection, HandleKey, SectionSplit, WoodKey } from '../contract/cabinet.ts'
import type { Catalog, CatalogOption, Field, RangeField } from '../model/catalog.ts'

const DEPTH_MM = 420

const wood = (id: WoodKey, name: string): CatalogOption<WoodKey> => ({ id, name, value: id, swatch: { kind: 'wood', wood: id } })

const colourFront = (id: string, name: string, hex: string): CatalogOption<FrontFinish> => ({
  id,
  name,
  value: { kind: 'colour', hex },
  swatch: { kind: 'colour', hex },
})

const veneerFront = (w: WoodKey, name: string): CatalogOption<FrontFinish> => ({
  id: `veneer-${w}`,
  name,
  value: { kind: 'wood', wood: w },
  swatch: { kind: 'wood', wood: w },
})

// Sizes: 50 mm steps, priced per step above the minimum.
const width: RangeField = { id: 'width', label: 'Szerokość', minMm: 900, maxMm: 1300, stepMm: 50, ratePerStepZl: 100 }

const height: RangeField = { id: 'height', label: 'Wysokość', minMm: 1600, maxMm: 1800, stepMm: 50, ratePerStepZl: 100 }

const body: Field<WoodKey> = {
  id: 'body',
  label: 'Korpus',
  display: 'tiles',
  groups: [
    { id: 'oak', name: 'Dąb', surchargeZl: 0, options: [wood('oak-rustic', 'Dąb rustykalny'), wood('oak-light', 'Dąb jasny')] },
    { id: 'walnut', name: 'Orzech amerykański', surchargeZl: 900, options: [wood('walnut', 'Orzech amerykański')] },
  ],
}

const front: Field<FrontFinish> = {
  id: 'front',
  label: 'Fronty',
  display: 'tiles',
  groups: [
    {
      id: 'standard',
      name: 'Kolory standardowe',
      surchargeZl: 0,
      options: [
        colourFront('black', 'Czarny mat', '#1e1e1e'),
        colourFront('graphite', 'Grafit', '#3b3d3f'),
        colourFront('white', 'Biały ciepły', '#ebe7df'),
        colourFront('cashmere', 'Kaszmir', '#c7b8a2'),
      ],
    },
    {
      id: 'premium',
      name: 'Kolory premium',
      surchargeZl: 600,
      options: [
        colourFront('navy', 'Granat', '#25304a'),
        colourFront('bottle-green', 'Butelkowa zieleń', '#2f4a3c'),
        colourFront('terracotta', 'Terakota', '#a3563e'),
      ],
    },
    {
      id: 'veneer',
      name: 'Okleiny drewnopodobne',
      surchargeZl: 1200,
      options: [veneerFront('oak-light', 'Dąb jasny'), veneerFront('oak-rustic', 'Dąb rustykalny'), veneerFront('walnut', 'Orzech')],
    },
  ],
}

const glazedSection: Field<GlazedSection> = {
  id: 'glazedSection',
  label: 'Witryna',
  display: 'tiles',
  groups: [
    {
      id: 'glazed',
      name: 'Z witryną',
      surchargeZl: 400,
      options: [
        { id: 'left', name: 'Witryna po lewej', value: 'left', swatch: { kind: 'label', text: 'L' } },
        { id: 'right', name: 'Witryna po prawej', value: 'right', swatch: { kind: 'label', text: 'P' } },
      ],
    },
    {
      id: 'solid',
      name: 'Bez witryny',
      surchargeZl: 0,
      options: [{ id: 'none', name: 'Drzwi pełne', value: 'none', swatch: { kind: 'label', text: '—' } }],
    },
  ],
}

const glass: Field<GlassKey> = {
  id: 'glass',
  label: 'Szkło',
  display: 'tiles',
  groups: [
    { id: 'clear', name: 'Szkło bezbarwne', surchargeZl: 0, options: [{ id: 'clear', name: 'Bezbarwne', value: 'clear', swatch: { kind: 'colour', hex: '#dfe9ec' } }] },
    { id: 'smoked', name: 'Szkło przydymione', surchargeZl: 250, options: [{ id: 'smoked', name: 'Przydymione', value: 'smoked', swatch: { kind: 'colour', hex: '#5d6366' } }] },
  ],
}

const sectionSplit: Field<SectionSplit> = {
  id: 'sectionSplit',
  label: 'Podział segmentów',
  display: 'chips',
  groups: [
    {
      id: 'split',
      name: 'Podział segmentów',
      surchargeZl: 0,
      options: [
        { id: 'wide', name: 'Szeroki segment z witryną', value: 'wide', swatch: { kind: 'label', text: 'wide' } },
        { id: 'equal', name: 'Równe segmenty', value: 'equal', swatch: { kind: 'label', text: 'equal' } },
      ],
    },
  ],
}

const handle: Field<HandleKey> = {
  id: 'handle',
  label: 'Uchwyty',
  display: 'tiles',
  groups: [
    {
      id: 'bar',
      name: 'Uchwyty listwowe',
      surchargeZl: 0,
      options: [
        { id: 'bar-black', name: 'Listwa czarna', value: 'bar-black', swatch: { kind: 'colour', hex: '#1c1c1c' } },
        { id: 'bar-steel', name: 'Listwa stalowa szczotkowana', value: 'bar-steel', swatch: { kind: 'colour', hex: '#a9adb0' } },
      ],
    },
    {
      id: 'push',
      name: 'Bezuchwytowe (push-to-open)',
      surchargeZl: 290,
      options: [{ id: 'push', name: 'Push-to-open', value: 'push', swatch: { kind: 'label', text: 'push' } }],
    },
  ],
}

export const MOCK_CATALOG: Catalog = {
  basePriceZl: 3240,
  description: `Szafka 2-segmentowa, gł. ${DEPTH_MM} mm`,
  depthMm: DEPTH_MM,
  fields: { width, height, sectionSplit, body, front, glazedSection, glass, handle },
  // Resolves to REFERENCE_CABINET (guarded by tests/resolve.test.ts).
  defaultSelection: {
    width: '1100',
    height: '1600',
    sectionSplit: 'wide',
    body: 'oak-rustic',
    front: 'black',
    glazedSection: 'left',
    glass: 'clear',
    handle: 'bar-black',
  },
}
