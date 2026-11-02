// The configurator's data model: the shape every catalog source (mock now, Medusa later) delivers.
import type { FrontFinish, GlassKey, GlazedSection, HandleKey, WoodKey } from '../contract/cabinet.ts'

export const FIELD_IDS = ['width', 'height', 'body', 'front', 'glazedSection', 'glass', 'handle'] as const

export type FieldId = (typeof FIELD_IDS)[number]

/** The user's choice: one option id per field. */
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

export interface Field<V> {
  id: FieldId
  label: string
  /** chips: one option per group with its surcharge on the chip (size steps); tiles: swatch tiles under group headings. */
  display: 'chips' | 'tiles'
  groups: OptionGroup<V>[]
}

/** The contract value each field resolves to. */
export interface FieldValues {
  width: number
  height: number
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
  fields: { [K in FieldId]: Field<FieldValues[K]> }
  defaultSelection: Selection
}
