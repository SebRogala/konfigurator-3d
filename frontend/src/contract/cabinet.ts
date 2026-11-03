// Seam between the configurator UI/pricing and the 3D scene.
// The scene renders a ResolvedCabinet and knows nothing about prices or option ids;
// the catalog maps the user's selections to a ResolvedCabinet.

/** Wood finish keys; the scene owns their textures. */
export const WOOD_KEYS = ['oak-rustic', 'oak-light', 'walnut'] as const
export type WoodKey = (typeof WOOD_KEYS)[number]

export type FrontFinish =
  | { kind: 'colour'; hex: string } // painted / laminated front, rendered with a fine-grain normal/roughness map
  | { kind: 'wood'; wood: WoodKey } // wood-veneer front

/** Which section carries the top panel + glazed door + lower door layout; 'none' keeps that layout with a solid upper door. */
export type GlazedSection = 'left' | 'right' | 'none'

export type GlassKey = 'clear' | 'smoked'

export type HandleKey = 'bar-black' | 'bar-steel' | 'push'

/** 'wide': the three-part section takes the larger share of the width (the scene owns the ratio); 'equal': two equal sections. */
export type SectionSplit = 'wide' | 'equal'

export interface ResolvedCabinet {
  widthMm: number
  heightMm: number
  depthMm: number
  body: WoodKey
  front: FrontFinish
  glazedSection: GlazedSection
  glass: GlassKey
  handle: HandleKey
  sectionSplit: SectionSplit
}

/** The reference cabinet; the configurator's default state. */
export const REFERENCE_CABINET: ResolvedCabinet = {
  widthMm: 1100,
  heightMm: 1600,
  depthMm: 420,
  body: 'oak-rustic',
  front: { kind: 'colour', hex: '#1e1e1e' },
  glazedSection: 'left',
  glass: 'clear',
  handle: 'bar-black',
  sectionSplit: 'wide',
}
