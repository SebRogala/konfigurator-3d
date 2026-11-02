import type { WoodKey } from '../contract/cabinet'
import type { Swatch as SwatchSpec } from '../model/catalog'

// Tile renderings of the wood finishes: layered grain stripes over a base tone.
const WOOD_TILE: Record<WoodKey, string> = {
  'oak-rustic':
    'repeating-linear-gradient(92deg, rgba(90,58,28,.22) 0 2px, transparent 2px 7px, rgba(90,58,28,.12) 7px 9px, transparent 9px 15px), linear-gradient(180deg, #b98a57, #a87947)',
  'oak-light':
    'repeating-linear-gradient(92deg, rgba(120,90,50,.16) 0 1px, transparent 1px 6px, rgba(120,90,50,.1) 6px 8px, transparent 8px 13px), linear-gradient(180deg, #dcc39c, #cfb28a)',
  walnut:
    'repeating-linear-gradient(92deg, rgba(25,12,5,.3) 0 2px, transparent 2px 8px, rgba(25,12,5,.18) 8px 10px, transparent 10px 16px), linear-gradient(180deg, #6b4a33, #573a27)',
}

export function swatchStyle(spec: SwatchSpec): React.CSSProperties {
  if (spec.kind === 'colour') return { background: spec.hex }
  if (spec.kind === 'wood') return { background: WOOD_TILE[spec.wood] }
  return {}
}
