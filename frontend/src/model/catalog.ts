// The configurator's data model: the shape every catalog source (mock now, Medusa later) delivers.
import type { FrontFinish, GlassKey, GlazedSection, HandleKey, SectionSplit, WoodKey } from '../contract/cabinet.ts'

export const RANGE_FIELD_IDS = ['width', 'height'] as const
export const OPTION_FIELD_IDS = ['sectionSplit', 'body', 'front', 'glazedSection', 'glass', 'handle'] as const
export const FIELD_IDS = [...RANGE_FIELD_IDS, ...OPTION_FIELD_IDS] as const

export type RangeFieldId = (typeof RANGE_FIELD_IDS)[number]
export type OptionFieldId = (typeof OPTION_FIELD_IDS)[number]
export type FieldId = RangeFieldId | OptionFieldId

/** The user's choice: a millimetre value (decimal string) per range field, an option id per option field. */
export type Selection = Record<FieldId, string>

/** How a tile is painted: a flat colour, a wood finish (CSS-rendered swatch) or a text label. */
export type Swatch = { kind: 'colour'; hex: string } | { kind: 'wood'; wood: WoodKey } | { kind: 'label'; text: string }

export interface CatalogOption<V> {
  id: string
  name: string
  value: V
  swatch: Swatch
}

/** One flat surcharge shared by every option in the group. */
export interface OptionGroup<V> {
  id: string
  name: string
  surchargeZl: number
  options: CatalogOption<V>[]
}

/** A dimension chosen in fixed steps; priced at a flat rate per step above the minimum. */
export interface RangeField {
  id: RangeFieldId
  label: string
  minMm: number
  maxMm: number
  stepMm: number
  ratePerStepZl: number
}

export interface Field<V> {
  id: OptionFieldId
  label: string
  /** chips: every option as a chip with its group's surcharge; tiles: swatch tiles under group headings. */
  display: 'chips' | 'tiles'
  groups: OptionGroup<V>[]
}

/** The contract value each field resolves to. */
export interface FieldValues {
  sectionSplit: SectionSplit
  body: WoodKey
  front: FrontFinish
  glazedSection: GlazedSection
  glass: GlassKey
  handle: HandleKey
}

export interface Catalog {
  basePriceZl: number
  /** Base product line shown in the summary. */
  description: string
  depthMm: number
  fields: { [K in RangeFieldId]: RangeField } & { [K in OptionFieldId]: Field<FieldValues[K]> }
  defaultSelection: Selection
}
