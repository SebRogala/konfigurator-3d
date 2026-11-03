// Shadowing key light and the scene renderer for the studio look; the floor shadow is BakedFloorShadow.
import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { DirectionalLight } from 'three'
import type { CabinetLayout } from './layout'
import { PHONE } from './materials'
import { endFrame } from './motion'

/** Key light direction (from the cabinet centre) and strength: front-left and above, as in the reference photo. */
const KEY_DIRECTION: [number, number, number] = [-2.5, 3.5, 3]
const KEY_INTENSITY = 2
/** Shadow map texels: phones get a quarter of the memory and fill. */
const SHADOW_MAP_PX = PHONE ? 1024 : 2048
/** PCF blur radius in texels: a softbox key, not a sun. */
const SHADOW_RADIUS = 5

/**
 * The key light, casting soft shadows over a frustum fitted to the cabinet: doors, handles and the top darken the
 * interior. The floor receives none (a directional cast reads as a hard silhouette); BakedFloorShadow grounds it. The frustum follows the bounds, so texel density stays the same at every size.
 */
export function KeyLight({ bounds }: { bounds: CabinetLayout['bounds'] }) {
  const light = useRef<DirectionalLight>(null)
  const invalidate = useThree((s) => s.invalidate)
  const [w, h, d] = bounds.size
  const [cx, cy, cz] = bounds.centre
  useLayoutEffect(() => {
    const l = light.current
    if (!l) return
    const len = Math.hypot(...KEY_DIRECTION)
    // Far enough out that the whole cabinet and its floor shadow sit inside the frustum.
    const reach = Math.hypot(w, h, d)
    l.position.set(cx + (KEY_DIRECTION[0] / len) * reach * 2, cy + (KEY_DIRECTION[1] / len) * reach * 2, cz + (KEY_DIRECTION[2] / len) * reach * 2)
    l.target.position.set(cx, cy, cz)
    l.target.updateMatrixWorld()
    const cam = l.shadow.camera
    cam.left = cam.bottom = -reach * 0.75
    cam.right = cam.top = reach * 0.75
    cam.near = reach
    cam.far = reach * 3.5
    cam.updateProjectionMatrix()
    invalidate()
  }, [w, h, d, cx, cy, cz, invalidate])
  return (
    <directionalLight
      ref={light}
      intensity={KEY_INTENSITY}
      castShadow
      shadow-mapSize={[SHADOW_MAP_PX, SHADOW_MAP_PX]}
      shadow-radius={SHADOW_RADIUS}
      shadow-blurSamples={PHONE ? 8 : 12}
      shadow-bias={-0.0004}
      shadow-normalBias={0.012}
    />
  )
}

/**
 * Renders the scene (useFrame priority 1) when the demand loop is invalidated, and closes the frame for `motion.ts`.
 * One render path for every frame: the same passes, shadow map refresh (three's auto update) and lights whether the
 * camera moves or not. A settled-frame-only GTAO layer once switched the look on real GPUs when the view stopped
 * (gotchas G27); the occlusion is now analytic (`interiorOcclusion.ts`), so it is in every frame.
 */
export function StudioRenderer() {
  useFrame((state) => {
    state.gl.render(state.scene, state.camera)
    endFrame()
  }, 1)
  return null
}
