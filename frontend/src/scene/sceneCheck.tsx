// Dev-only page (/scene-check.html?config=<name>) that renders one cabinet for headless screenshots.
import { createRoot } from 'react-dom/client'
import { REFERENCE_CABINET, type ResolvedCabinet } from '../contract/cabinet'
import { CabinetScene } from './CabinetScene'

const CONFIGS: Record<string, ResolvedCabinet> = {
  reference: REFERENCE_CABINET,
  'widest-tallest': { ...REFERENCE_CABINET, widthMm: 1300, heightMm: 1800 },
  'narrowest': { ...REFERENCE_CABINET, widthMm: 900 },
  'glazed-right-smoked': { ...REFERENCE_CABINET, glazedSection: 'right', glass: 'smoked' },
  'glazed-none-steel': { ...REFERENCE_CABINET, glazedSection: 'none', handle: 'bar-steel' },
  'walnut-wood-fronts': { ...REFERENCE_CABINET, body: 'walnut', front: { kind: 'wood', wood: 'walnut' } },
  'oak-light-white': { ...REFERENCE_CABINET, body: 'oak-light', front: { kind: 'colour', hex: '#e8e4dc' } },
  push: { ...REFERENCE_CABINET, handle: 'push' },
}

const name = new URLSearchParams(location.search).get('config') ?? 'reference'
const cabinet = CONFIGS[name]
if (!cabinet) throw new Error(`Unknown config "${name}"; known: ${Object.keys(CONFIGS).join(', ')}`)

const markReady = () => {
  // Two frames so the fitted camera and contact shadow are on screen before the shot.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.setAttribute('data-scene-ready', name)))
}

createRoot(document.getElementById('root')!).render(<CabinetScene cabinet={cabinet} onReady={markReady} />)
