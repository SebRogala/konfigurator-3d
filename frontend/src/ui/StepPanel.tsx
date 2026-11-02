import type { Catalog, Field, FieldId, Selection } from '../model/catalog'
import { choiceOf, findChoice } from '../model/resolve'
import { isFieldActive } from '../model/rules'
import { formatZl } from './format'
import type { Step } from './steps'
import { swatchStyle } from './Swatch'

interface Props {
  catalog: Catalog
  step: Step
  index: number
  open: boolean
  onToggle: () => void
  selection: Selection
  onSelect: (field: FieldId, optionId: string) => void
}

export function StepPanel({ catalog, step, index, open, onToggle, selection, onSelect }: Props) {
  const summary = step.fields
    .filter((id) => isFieldActive(id, selection))
    .map((id) => choiceOf(catalog, id, selection).option.name)
    .join(' · ')

  return (
    <section className={`step${open ? ' step--open' : ''}`} data-step={step.id}>
      <button className="step__head" aria-expanded={open} onClick={onToggle}>
        <span className="step__num">{index + 1}</span>
        <span className="step__title">{step.title}</span>
        {!open && <span className="step__current">{summary}</span>}
        <svg className="step__chevron" viewBox="0 0 12 8" aria-hidden><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      {open && (
        <div className="step__body">
          {step.fields.filter((id) => isFieldActive(id, selection)).map((id) => (
            <FieldView key={id} field={catalog.fields[id] as Field<unknown>} selection={selection} onSelect={onSelect} showLabel={step.fields.length > 1} />
          ))}
        </div>
      )}
    </section>
  )
}

function FieldView({ field, selection, onSelect, showLabel }: { field: Field<unknown>; selection: Selection; onSelect: Props['onSelect']; showLabel: boolean }) {
  const id = field.id
  const selected = findChoice(field, selection[id])

  if (field.display === 'chips') {
    return (
      <div className="field" data-field={id}>
        {showLabel && <h3 className="group__name">{field.label}</h3>}
        <div className="chips">
          {field.groups.map((g) => {
            const o = g.options[0]
            const isSel = o.id === selected.option.id
            return (
              <button key={o.id} className={`chip${isSel ? ' is-selected' : ''}`} aria-pressed={isSel} data-option={o.id} onClick={() => onSelect(id, o.id)}>
                <span className="chip__name">{o.name}</span>
                <span className="chip__price">{g.surchargeZl ? `+${formatZl(g.surchargeZl)}` : 'w cenie'}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="field" data-field={id}>
      {showLabel && <h3 className="field__label">{field.label}</h3>}
      {field.groups.map((g) => {
        const inGroup = g.id === selected.group.id
        return (
          <div className="group" key={g.id}>
            <h4 className="group__name">
              {g.name} <span className="group__price">{formatZl(g.surchargeZl)}</span>
            </h4>
            <p className="group__selected">{inGroup ? selected.option.name : ' '}</p>
            <div className="tiles">
              {g.options.map((o) => {
                const isSel = o.id === selected.option.id
                return (
                  <button
                    key={o.id}
                    className={`tile tile--${o.swatch.kind}${isSel ? ' is-selected' : ''}`}
                    style={swatchStyle(o.swatch)}
                    title={o.name}
                    aria-label={o.name}
                    aria-pressed={isSel}
                    data-option={o.id}
                    onClick={() => onSelect(id, o.id)}
                  >
                    {o.swatch.kind === 'label' && o.swatch.text}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
