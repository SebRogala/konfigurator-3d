/**
 * Per-frame "the scene geometry is animating" flag: Door marks it while it swings, so the floor-shadow bake follows
 * the door. Never keyed to camera motion: no render state may differ between a moving and a still camera.
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
