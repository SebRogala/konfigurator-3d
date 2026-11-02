import { BASE_PRICE_ZL, fields, isFieldActive, type Field, type FieldId, type Selection } from '../catalog/catalog.ts'
import { findChoice } from '../catalog/resolve.ts'

export interface PriceLine {
  fieldId: FieldId
  label: string
  optionName: string
  groupName: string
  surchargeZl: number
}

/** One line per active field: the selected option and its group's flat surcharge. */
export function priceLines(selection: Selection): PriceLine[] {
  return (Object.keys(fields) as FieldId[])
    .filter((id) => isFieldActive(id, selection))
    .map((id) => {
      const field = fields[id] as Field<unknown>
      const { group, option } = findChoice(field, selection[id])
      return { fieldId: id, label: field.label, optionName: option.name, groupName: group.name, surchargeZl: group.surchargeZl }
    })
}

/** Base price plus the flat surcharge of each selected option's group. */
export function totalPrice(selection: Selection): number {
  return priceLines(selection).reduce((sum, line) => sum + line.surchargeZl, BASE_PRICE_ZL)
}

const zl = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 })

export const formatZl = (amount: number): string => `${zl.format(amount)} zł`
