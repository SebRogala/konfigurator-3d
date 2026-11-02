import { formatZl } from '../pricing/total'

export function Header({ totalZl, onSummary }: { totalZl: number; onSummary: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        Konfigurator <em>szafki</em>
      </div>
      <div className="topbar__price">
        <strong data-testid="total">{formatZl(totalZl)}</strong>
        <span>Cena całkowita</span>
      </div>
      <button className="topbar__summary" onClick={onSummary}>
        Podsumowanie
      </button>
    </header>
  )
}
