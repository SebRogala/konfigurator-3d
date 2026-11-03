import { useState } from 'react'
import type { RangeField } from '../model/catalog'
import { rangeSurchargeZl, snapToRange } from '../model/range'
import { formatZl } from './format'

/** Numeric box + slider for a stepped dimension; the box commits (snapped and clamped) on blur or Enter. */
export function RangeInput({ field, valueMm, onChange }: { field: RangeField; valueMm: number; onChange: (mm: number) => void }) {
  // null while not editing, so the box always shows the committed value otherwise.
  const [draft, setDraft] = useState<string | null>(null)
  const inputId = `range-${field.id}`
  const surcharge = rangeSurchargeZl(field, valueMm)

  const commit = () => {
    if (draft === null) return
    const mm = snapToRange(field, Number(draft))
    setDraft(null)
    if (mm !== valueMm) onChange(mm)
  }

  return (
    <div className="field range" data-field={field.id}>
      <div className="range__head">
        <label className="group__name" htmlFor={inputId}>{field.label} (mm)</label>
        <span className="group__price">{surcharge ? `+${formatZl(surcharge)}` : 'w cenie'}</span>
        <input
          id={inputId}
          className="range__box"
          type="number"
          inputMode="numeric"
          min={field.minMm}
          max={field.maxMm}
          step={field.stepMm}
          value={draft ?? String(valueMm)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      </div>
      <input
        className="range__slider"
        type="range"
        aria-label={`${field.label} (mm)`}
        min={field.minMm}
        max={field.maxMm}
        step={field.stepMm}
        value={valueMm}
        onChange={(e) => onChange(snapToRange(field, Number(e.target.value)))}
      />
      <div className="range__limits" aria-hidden>
        <span>{field.minMm}</span>
        <span>{field.maxMm}</span>
      </div>
    </div>
  )
}
