import type { ResolvedCabinet } from '../contract/cabinet.ts'
import { DEPTH_MM, fields, type CatalogOption, type Field, type FieldId, type OptionGroup, type Selection } from './catalog.ts'

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

const value = <K extends FieldId>(id: K, selection: Selection) =>
  findChoice(fields[id] as Field<unknown>, selection[id]).option.value as (typeof fields)[K]['groups'][number]['options'][number]['value']

export function resolveCabinet(selection: Selection): ResolvedCabinet {
  return {
    widthMm: value('width', selection),
    heightMm: value('height', selection),
    depthMm: DEPTH_MM,
    body: value('body', selection),
    front: value('front', selection),
    glazedSection: value('glazedSection', selection),
    glass: value('glass', selection),
    handle: value('handle', selection),
  }
}
