import type { FieldId } from '../model/catalog.ts'

export interface Step {
  id: string
  title: string
  fields: FieldId[]
}

export const STEPS: Step[] = [
  { id: 'dimensions', title: 'Wymiary', fields: ['width', 'height'] },
  { id: 'body', title: 'Korpus', fields: ['body'] },
  { id: 'fronts', title: 'Fronty', fields: ['front'] },
  { id: 'glazing', title: 'Przeszklenie', fields: ['glazedSection', 'glass'] },
  { id: 'handles', title: 'Uchwyty', fields: ['handle'] },
]
