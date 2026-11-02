// The one mock price/catalog file (stages 0–1). Shape per docs/3d-configurator/conventions.md § Pricing model:
// a base price plus option groups, each with one flat surcharge shared by all its options.
import type { FrontFinish, GlassKey, GlazedSection, HandleKey, WoodKey } from '../contract/cabinet.ts'

/** How a tile is painted: a flat colour, a wood finish (CSS-rendered swatch) or a text label. */
export type Swatch = { kind: 'colour'; hex: string } | { kind: 'wood'; wood: WoodKey } | { kind: 'label'; text: string }

export interface CatalogOption<V> {
  id: string
  name: string
  value: V
  swatch: Swatch
}

export interface OptionGroup<V> {
  id: string
  name: string
  surchargeZl: number
  options: CatalogOption<V>[]
}

export interface Field<V> {
  id: string
  label: string
  groups: OptionGroup<V>[]
}

export const BASE_PRICE_ZL = 3290

export const DEPTH_MM = 420

const sizeGroup = (mm: number, surchargeZl: number): OptionGroup<number> => ({
  id: `${mm}`,
  name: `${mm} mm`,
  surchargeZl,
  options: [{ id: `${mm}`, name: `${mm} mm`, value: mm, swatch: { kind: 'label', text: `${mm}` } }],
})

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

export const width: Field<number> = {
  id: 'width',
  label: 'Szerokość',
  groups: [sizeGroup(900, 0), sizeGroup(1100, 350), sizeGroup(1300, 700)],
}

export const height: Field<number> = {
  id: 'height',
  label: 'Wysokość',
  groups: [sizeGroup(1600, 0), sizeGroup(1800, 450)],
}

export const body: Field<WoodKey> = {
  id: 'body',
  label: 'Korpus',
  groups: [
    { id: 'oak', name: 'Dąb', surchargeZl: 0, options: [wood('oak-rustic', 'Dąb rustykalny'), wood('oak-light', 'Dąb jasny')] },
    { id: 'walnut', name: 'Orzech amerykański', surchargeZl: 900, options: [wood('walnut', 'Orzech amerykański')] },
  ],
}

export const front: Field<FrontFinish> = {
  id: 'front',
  label: 'Fronty',
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

export const glazedSection: Field<GlazedSection> = {
  id: 'glazedSection',
  label: 'Witryna',
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

export const glass: Field<GlassKey> = {
  id: 'glass',
  label: 'Szkło',
  groups: [
    { id: 'clear', name: 'Szkło bezbarwne', surchargeZl: 0, options: [{ id: 'clear', name: 'Bezbarwne', value: 'clear', swatch: { kind: 'colour', hex: '#dfe9ec' } }] },
    { id: 'smoked', name: 'Szkło przydymione', surchargeZl: 250, options: [{ id: 'smoked', name: 'Przydymione', value: 'smoked', swatch: { kind: 'colour', hex: '#5d6366' } }] },
  ],
}

export const handle: Field<HandleKey> = {
  id: 'handle',
  label: 'Uchwyty',
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

export const fields = { width, height, body, front, glazedSection, glass, handle }

export type FieldId = keyof typeof fields

/** The user's choice: one option id per field. */
export type Selection = Record<FieldId, string>

export interface Step {
  id: string
  title: string
  fields: FieldId[]
}

export const STEPS: Step[] = [
  { id: 'dimensions', title: 'Wymiary', fields: ['width', 'height'] },
  { id: 'body', title: 'Korpus', fields: ['body'] },
  { id: 'fronts', title: 'Fronty', fields: ['front'] },
  { id: 'glazing', title: 'Przeszklenie', fields: ['glazedSection', 'glass'] },
  { id: 'handles', title: 'Uchwyty', fields: ['handle'] },
]

/** The glass choice applies (and is priced) only when a section is glazed. */
export const isFieldActive = (id: FieldId, selection: Selection): boolean =>
  id !== 'glass' || selection.glazedSection !== 'none'

/** Resolves to REFERENCE_CABINET. */
export const DEFAULT_SELECTION: Selection = {
  width: '1100',
  height: '1600',
  body: 'oak-rustic',
  front: 'black',
  glazedSection: 'left',
  glass: 'clear',
  handle: 'bar-black',
}
