import { useEffect, useRef } from 'react'
import type { Catalog, Selection } from '../model/catalog'
import { priceLines, totalPrice } from '../model/pricing'
import { formatZl } from './format'

// Native modal <dialog>: focus containment, inert background and Escape come from showModal().
export function Summary({ catalog, selection, onClose }: { catalog: Catalog; selection: Selection; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  // Captured on the first render only, so a StrictMode effect replay cannot overwrite it with the dialog's own button.
  const trigger = useRef(document.activeElement as HTMLElement | null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    closeBtn.current?.focus()
  }, [])

  // Every dismissal (×, backdrop, Escape) goes through the native close(); its close event restores focus.
  const dismiss = () => ref.current?.close()
  const handleClose = () => {
    trigger.current?.focus()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      className="summary"
      aria-label="Podsumowanie"
      onClose={handleClose}
      onClick={(e) => e.target === ref.current && dismiss()}
    >
      <div className="summary__inner">
        <header className="summary__head">
          <h2>Podsumowanie</h2>
          <button ref={closeBtn} className="summary__close" onClick={dismiss} aria-label="Zamknij">×</button>
        </header>
        <dl className="summary__list">
          <div className="summary__row">
            <dt>Cena bazowa</dt>
            <dd>{catalog.description}</dd>
            <span>{formatZl(catalog.basePriceZl)}</span>
          </div>
          {priceLines(catalog, selection).map((l) => (
            <div className="summary__row" key={l.fieldId} data-line={l.fieldId}>
              <dt>{l.label}</dt>
              <dd>{l.optionName}</dd>
              <span>{l.surchargeZl ? `+${formatZl(l.surchargeZl)}` : '0 zł'}</span>
            </div>
          ))}
        </dl>
        <footer className="summary__total">
          <span>Cena całkowita</span>
          <strong data-testid="summary-total">{formatZl(totalPrice(catalog, selection))}</strong>
        </footer>
      </div>
    </dialog>
  )
}
