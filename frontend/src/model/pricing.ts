import { FIELD_IDS, type Catalog, type FieldId, type Selection } from './catalog.ts'
import { rangeSurchargeZl, rangeValue } from './range.ts'
import { choiceOf, isRangeField, selectedName } from './resolve.ts'
import { isFieldActive } from './rules.ts'

export interface PriceLine {
  fieldId: FieldId
  label: string
  optionName: string
  surchargeZl: number
}

const surchargeOf = (catalog: Catalog, id: FieldId, selection: Selection): number => {
  if (isRangeField(id)) {
    const field = catalog.fields[id]
    return rangeSurchargeZl(field, rangeValue(field, selection[id]))
  }
  return choiceOf(catalog, id, selection).group.surchargeZl
}

/** One line per active field: the selection and its surcharge (range rate × steps, or the option group's flat surcharge). */
export function priceLines(catalog: Catalog, selection: Selection): PriceLine[] {
  return FIELD_IDS.filter((id) => isFieldActive(id, selection)).map((id) => ({
    fieldId: id,
    label: catalog.fields[id].label,
    optionName: selectedName(catalog, id, selection),
    surchargeZl: surchargeOf(catalog, id, selection),
  }))
}

/** Base price plus every active field's surcharge. */
export function totalPrice(catalog: Catalog, selection: Selection): number {
  return priceLines(catalog, selection).reduce((sum, line) => sum + line.surchargeZl, catalog.basePriceZl)
}
