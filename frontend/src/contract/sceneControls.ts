// Seam for viewer controls (the "Sterowanie" panel). These are view state, not cabinet configuration:
// they never enter Selection, the URL or the price.

import type { Ref } from 'react'

export type ViewPreset = 'front' | 'three-quarter' | 'side' | 'back' | 'top'

/** Imperative handle CabinetScene exposes through its `controlsRef` prop. */
export interface SceneControls {
  /** Animate the camera to a preset; 'three-quarter' is the default framing. Keeps the user's zoom ratio. */
  setView(preset: ViewPreset): void
  /** Render the current view and return it as a PNG blob. */
  snapshot(): Promise<Blob>
}

export interface SceneViewProps {
  /** Doors swing open (animated) when true. */
  doorsOpen: boolean
  controlsRef?: Ref<SceneControls>
}
