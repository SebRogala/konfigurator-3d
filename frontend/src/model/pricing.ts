import { FIELD_IDS, type Catalog, type FieldId, type Selection } from './catalog.ts'
import { choiceOf } from './resolve.ts'
import { isFieldActive } from './rules.ts'

export interface PriceLine {
  fieldId: FieldId
  label: string
  optionName: string
  groupName: string
  surchargeZl: number
}

/** One line per active field: the selected option and its group's flat surcharge. */
export function priceLines(catalog: Catalog, selection: Selection): PriceLine[] {
  return FIELD_IDS.filter((id) => isFieldActive(id, selection)).map((id) => {
    const { group, option } = choiceOf(catalog, id, selection)
    return { fieldId: id, label: catalog.fields[id].label, optionName: option.name, groupName: group.name, surchargeZl: group.surchargeZl }
  })
}

/** Base price plus the flat surcharge of each selected option's group. */
export function totalPrice(catalog: Catalog, selection: Selection): number {
  return priceLines(catalog, selection).reduce((sum, line) => sum + line.surchargeZl, catalog.basePriceZl)
}
