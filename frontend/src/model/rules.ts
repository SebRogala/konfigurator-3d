import type { FieldId, Selection } from './catalog.ts'

/** The glass choice applies (and is priced) only when a section is glazed. */
export const isFieldActive = (id: FieldId, selection: Selection): boolean =>
  id !== 'glass' || selection.glazedSection !== 'none'
