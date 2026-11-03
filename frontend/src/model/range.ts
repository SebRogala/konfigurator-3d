import type { RangeField } from './catalog.ts'

/** Clamps to the field's range and rounds to the nearest step above the minimum. */
export function snapToRange(field: RangeField, mm: number): number {
  if (!Number.isFinite(mm)) return field.minMm
  const steps = Math.round((Math.min(field.maxMm, Math.max(field.minMm, mm)) - field.minMm) / field.stepMm)
  return field.minMm + steps * field.stepMm
}

/** Reads a stored range value; throws unless it is an integer on a step inside the range. */
export function rangeValue(field: RangeField, raw: string): number {
  const mm = Number(raw)
  if (mm !== snapToRange(field, mm)) throw new Error(`Invalid value "${raw}" for range field "${field.id}"`)
  return mm
}

/** Flat rate per step above the minimum. */
export const rangeSurchargeZl = (field: RangeField, mm: number): number => ((mm - field.minMm) / field.stepMm) * field.ratePerStepZl
