import type { ResolvedCabinet } from '../contract/cabinet.ts'
import type { Catalog, CatalogOption, Field, FieldId, FieldValues, OptionFieldId, OptionGroup, Selection } from './catalog.ts'
import { rangeValue } from './range.ts'

export interface Choice<V> {
  group: OptionGroup<V>
  option: CatalogOption<V>
}

/** Finds the selected option and its group; throws on an id the catalog does not hold. */
export function findChoice<V>(field: Field<V>, optionId: string): Choice<V> {
  for (const group of field.groups) {
    const option = group.options.find((o) => o.id === optionId)
    if (option) return { group, option }
  }
  throw new Error(`Unknown option "${optionId}" in field "${field.id}"`)
}

/** The selected option and group of one option field. */
export const choiceOf = <K extends OptionFieldId>(catalog: Catalog, id: K, selection: Selection): Choice<FieldValues[K]> =>
  findChoice(catalog.fields[id] as Field<FieldValues[K]>, selection[id])

export const isRangeField = (id: FieldId): id is 'width' | 'height' => id === 'width' || id === 'height'

/** What the user picked, as shown in step headers and the summary. */
export const selectedName = (catalog: Catalog, id: FieldId, selection: Selection): string =>
  isRangeField(id) ? `${rangeValue(catalog.fields[id], selection[id])} mm` : choiceOf(catalog, id, selection).option.name

export function resolveCabinet(catalog: Catalog, selection: Selection): ResolvedCabinet {
  const value = <K extends OptionFieldId>(id: K) => choiceOf(catalog, id, selection).option.value
  return {
    widthMm: rangeValue(catalog.fields.width, selection.width),
    heightMm: rangeValue(catalog.fields.height, selection.height),
    depthMm: catalog.depthMm,
    sectionSplit: value('sectionSplit'),
    body: value('body'),
    front: value('front'),
    glazedSection: value('glazedSection'),
    glass: value('glass'),
    handle: value('handle'),
  }
}
