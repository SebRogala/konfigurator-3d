import type { ResolvedCabinet } from '../contract/cabinet.ts'
import type { Catalog, CatalogOption, Field, FieldId, FieldValues, OptionGroup, Selection } from './catalog.ts'

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

/** The selected option and group of one field. */
export const choiceOf = <K extends FieldId>(catalog: Catalog, id: K, selection: Selection): Choice<FieldValues[K]> =>
  findChoice(catalog.fields[id] as Field<FieldValues[K]>, selection[id])

export function resolveCabinet(catalog: Catalog, selection: Selection): ResolvedCabinet {
  const value = <K extends FieldId>(id: K) => choiceOf(catalog, id, selection).option.value
  return {
    widthMm: value('width'),
    heightMm: value('height'),
    depthMm: catalog.depthMm,
    body: value('body'),
    front: value('front'),
    glazedSection: value('glazedSection'),
    glass: value('glass'),
    handle: value('handle'),
  }
}
