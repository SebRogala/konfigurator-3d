import { useEffect, useRef } from 'react'
import { BASE_PRICE_ZL, DEPTH_MM, type Selection } from '../catalog/catalog'
import { formatZl, priceLines, totalPrice } from '../pricing/total'

// Native modal <dialog>: focus containment, inert background and Escape come from showModal().
export function Summary({ selection, onClose }: { selection: Selection; onClose: () => void }) {
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
            <dd>Szafka 2-segmentowa, gł. {DEPTH_MM} mm</dd>
            <span>{formatZl(BASE_PRICE_ZL)}</span>
          </div>
          {priceLines(selection).map((l) => (
            <div className="summary__row" key={l.fieldId} data-line={l.fieldId}>
              <dt>{l.label}</dt>
              <dd>{l.optionName}</dd>
              <span>{l.surchargeZl ? `+${formatZl(l.surchargeZl)}` : '0 zł'}</span>
            </div>
          ))}
        </dl>
        <footer className="summary__total">
          <span>Cena całkowita</span>
          <strong data-testid="summary-total">{formatZl(totalPrice(selection))}</strong>
        </footer>
      </div>
    </dialog>
  )
}
