/**
 * Per-frame "the scene geometry is animating" flag, shared by the animators (Door) and the frame consumers that must
 * hold expensive work until everything settles (StudioRenderer's AO and shadow refresh, the floor-shadow bake).
 * Animators mark from their useFrame (priority 0); consumers read at priority > 0 in the same frame; the renderer
 * ends the frame.
 */
let frame = 0
let animatedFrame = -1

export function markAnimating() {
  animatedFrame = frame
}

export function isAnimating(): boolean {
  return animatedFrame === frame
}

export function endFrame() {
  frame++
}
