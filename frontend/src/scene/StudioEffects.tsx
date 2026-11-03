// Shadowing key light and screen-space ambient occlusion for the studio look; the floor shadow is BakedFloorShadow.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Matrix4, Mesh, type Camera, type ShaderMaterial, type WebGLRenderTarget, type DirectionalLight, type Scene, type WebGLRenderer } from 'three'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import type { CabinetLayout } from './layout'
import { PHONE } from './materials'
import { endFrame, isAnimating } from './motion'

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
  const get = useThree((s) => s.get)
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
    // A new size refreshes the shadow even mid-refit, while the camera still moves.
    get().gl.shadowMap.needsUpdate = true
    invalidate()
  }, [w, h, d, cx, cy, cz, get, invalidate])
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

/** After the last camera move, the settled frame (shadow refresh, AO) follows this much later. */
const SETTLE_MS = 120

/**
 * Ground-truth AO (three's GTAOPass) as a multiply layer over the frame already on the canvas: the colour is the
 * direct render untouched (same blending, tone mapping and output colour space as a moving frame); AO only darkens.
 * An earlier composer route re-rendered the colour into a linear target, which blended the glass in linear space
 * (greyed vitrine) and lifted the dark fronts.
 */
function createAoOverlay(scene: Scene, camera: Camera) {
  const ao = new GTAOPass(scene, camera, 1, 1)
  ao.output = GTAOPass.OUTPUT.Off
  ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1, thickness: 1, scale: 1, samples: 16 })
  // Wider, denser denoise: the 4×4 noise pattern of the raw AO read as pixelation.
  ao.updatePdMaterial({ radius: 12, rings: 3, samples: 24 })
  // Glass and other transparent panes (and the floor-shadow quad) would occlude what is behind them in the AO depth,
  // so the AO pass hides them.
  // Patches a private method of three 0.187's GTAOPass (re-check on upgrade): it hides points and lines only.
  const pass = ao as unknown as { _overrideVisibility(): void; _visibilityCache: Mesh[]; blendMaterial: ShaderMaterial; pdRenderTarget: WebGLRenderTarget }
  const hide = pass._overrideVisibility.bind(ao)
  pass._overrideVisibility = () => {
    hide()
    scene.traverse((o) => {
      if (o instanceof Mesh && o.visible && [o.material].flat().every((m) => m.transparent)) {
        o.visible = false
        pass._visibilityCache.push(o)
      }
    })
  }
  // The pass's own multiply-blend material, drawn onto the canvas.
  pass.blendMaterial.uniforms.tDiffuse.value = pass.pdRenderTarget.texture
  pass.blendMaterial.uniforms.intensity.value = 1
  const quad = new FullScreenQuad(pass.blendMaterial)
  return {
    setSize: (w: number, h: number) => ao.setSize(w, h),
    render(gl: WebGLRenderer) {
      const autoClear = gl.autoClear
      ao.render(gl, null as unknown as WebGLRenderTarget, null as unknown as WebGLRenderTarget, 0, false)
      gl.setRenderTarget(null)
      gl.autoClear = false
      quad.render(gl)
      gl.autoClear = autoClear
    },
    dispose() {
      ao.dispose()
      quad.dispose()
    },
  }
}

/**
 * Renders the scene (useFrame priority 1), still only when the demand loop is invalidated.
 * - Motion is the camera moving or scene geometry animating (`motion.ts`, marked by Door). While moving, the frame
 *   renders directly and skips the AO layer (GTAO costs ~10× the frame time under SwiftShader); the settled frame
 *   after everything stops adds it over an otherwise identical render.
 * - The key light's shadow map is view-independent: reused while only the camera moves, refreshed while geometry
 *   animates and on every settled frame (option change, end of an orbit or swing).
 * - `ambientOcclusion` (desktop): corners, the underside of the top, the space behind shelves and the base darken.
 */
export function StudioRenderer({ ambientOcclusion }: { ambientOcclusion: boolean }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  // The drawing buffer, in device pixels: the AO layer matches the canvas texel for texel.
  const bufferWidth = useThree((s) => Math.round(s.size.width * s.viewport.dpr))
  const bufferHeight = useThree((s) => Math.round(s.size.height * s.viewport.dpr))
  const overlay = useMemo(() => (ambientOcclusion ? createAoOverlay(scene, camera) : null), [ambientOcclusion, scene, camera])
  useEffect(() => () => overlay?.dispose(), [overlay])
  useEffect(() => {
    overlay?.setSize(bufferWidth, bufferHeight)
    invalidate()
  }, [overlay, bufferWidth, bufferHeight, invalidate])
  const get = useThree((s) => s.get)
  useLayoutEffect(() => {
    const { shadowMap } = get().gl
    shadowMap.autoUpdate = false
    shadowMap.needsUpdate = true
  }, [get])
  const lastView = useRef(new Matrix4())
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(settle.current), [])
  useFrame((state) => {
    clearTimeout(settle.current)
    const view = state.camera.matrixWorld
    const cameraMoved = !view.equals(lastView.current)
    const animating = isAnimating()
    if (cameraMoved) {
      lastView.current.copy(view)
      settle.current = setTimeout(invalidate, SETTLE_MS)
    }
    // Reuse the map only for camera-only motion; moving geometry refreshes it even while the camera also moves.
    // An animator invalidates its own next frame, which is the settled one once it stops.
    if (!cameraMoved || animating) state.gl.shadowMap.needsUpdate = true
    state.gl.render(state.scene, state.camera)
    if (!cameraMoved && !animating) overlay?.render(state.gl)
    endFrame()
  }, 1)
  return null
}

