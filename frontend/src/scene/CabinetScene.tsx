import { Suspense, memo, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { NeutralToneMapping, Spherical, Vector3, type PerspectiveCamera } from 'three'
import type { ResolvedCabinet } from '../contract/cabinet'
import type { SceneControls, SceneViewProps, ViewPreset } from '../contract/sceneControls'
import { Cabinet } from './Cabinet'
import { layoutCabinet, type CabinetLayout } from './layout'
import { FootprintShadow } from './FootprintShadow'
import { fitDistance } from './cameraFit'
import { preloadSceneTextures } from './materials'

const DEG = Math.PI / 180
// The reference photo's 3/4 view: from the front-right, slightly above the cabinet's middle.
const VIEW_AZIMUTH = 20 * DEG
const VIEW_POLAR = 80 * DEG
// Inside ±90° so the camera always stays in front of the back panel's plane, at every distance.
const MAX_AZIMUTH = 75 * DEG
const TARGET_HEIGHT_RATIO = 0.47
/** View presets as [azimuth, polar]; 'three-quarter' is the default framing. Side stays inside the azimuth limit. */
const VIEW_PRESETS: Record<ViewPreset, [number, number]> = {
  front: [0, 85 * DEG],
  'three-quarter': [VIEW_AZIMUTH, VIEW_POLAR],
  side: [70 * DEG, 85 * DEG],
}
const BACKGROUND = '#f5f4f2'

preloadSceneTextures()

/**
 * Environment and key light. Memoized with no props: a re-render of <Environment frames={1}> with fresh
 * Lightformer props re-bakes the env map, which stalled the door swing for ~1 s under SwiftShader.
 */
const StudioLighting = memo(function StudioLighting() {
  return (
    <>
      {/* G13/G14: self-hosted studio HDRI plus softboxes for the dark fronts to reflect. */}
      <Environment files="/textures/studio_small_09_1k.hdr" frames={1} resolution={512} environmentIntensity={1.35}>
        <Lightformer form="rect" intensity={1.2} position={[0, 4, 1]} scale={[5, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.7} position={[-3, 1.5, 3]} scale={[2, 4, 1]} rotation-y={Math.PI - Math.PI / 4} />
        <Lightformer form="rect" intensity={0.6} position={[3, 1.5, 3.5]} scale={[2, 4, 1]} rotation-y={Math.PI + Math.PI / 4} />
        {/* Broad soft wall behind the viewer: gives the dark fronts the sheen that shows their grain. */}
        <Lightformer form="rect" intensity={0.8} position={[0, 1.5, 6]} scale={[10, 5, 1]} rotation-y={Math.PI} />
      </Environment>
      {/* Directional key from the front-left: separates the front, side and top faces as in the reference. */}
      <directionalLight position={[-2.5, 3.5, 3]} intensity={2} />
    </>
  )
})

/** Orbit distance limits on this canvas: one source for the controls' min/max, refits and presets. */
function distanceLimits(size: [number, number, number], fov: number, aspect: number): [number, number] {
  // The widest fit any allowed azimuth can need, so the maximum never blocks a refit.
  const worstFit = Math.max(fitDistance(size, 0, fov, aspect), fitDistance(size, MAX_AZIMUTH, fov, aspect))
  return [fitDistance(size, 0, fov, aspect) * 0.6, worstFit * 2]
}

function clampDistance(distance: number, size: [number, number, number], fov: number, aspect: number): number {
  const [min, max] = distanceLimits(size, fov, aspect)
  return Math.min(max, Math.max(min, distance))
}

/**
 * Orbit controls plus framing: refits distance and target when a dimension or the canvas aspect changes,
 * keeping the user's orbit angle (G16, G17).
 */
function CameraRig({
  bounds,
  onReady,
  controlsRef,
}: {
  bounds: CabinetLayout['bounds']
  onReady?: () => void
  controlsRef?: Ref<SceneControls>
}) {
  const controls = useRef<CameraControls>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const first = useRef(true)
  // The user's zoom as distance ÷ fit. Changes only on user input (`control`: wheel, drag, pinch), never from a refit
  // animation in flight, so overlapping refits can't compound it.
  const zoom = useRef(1)
  // Held in a ref: a new callback identity must not trigger a refit.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])
  const [w, h, d] = bounds.size
  const [cx, , cz] = bounds.centre
  const [minDistance, maxDistance] = distanceLimits([w, h, d], camera.fov, aspect)
  // Fit inputs the user's zoom is measured against.
  const fitInputs = useRef({ size: [w, h, d] as [number, number, number], aspect })
  useEffect(() => {
    fitInputs.current = { size: [w, h, d], aspect }
  }, [w, h, d, aspect])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const onUserControl = () => {
      const end = c.getSpherical(new Spherical(), true)
      zoom.current = end.radius / fitDistance(fitInputs.current.size, end.theta, camera.fov, fitInputs.current.aspect)
    }
    // `control` fires for wheel, drag and pinch input only; wheel emits no controlstart/controlend.
    c.addEventListener('control', onUserControl)
    return () => c.removeEventListener('control', onUserControl)
  }, [camera])

  // Depends on numbers only: finish, glazing, glass and handle changes leave the camera alone.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const target = new Vector3(cx, h * TARGET_HEIGHT_RATIO, cz)
    if (first.current) {
      // First-load framing, kept exactly as shipped: rotate, then set the target from that eye, then dolly to the fit.
      void c.rotateTo(VIEW_AZIMUTH, VIEW_POLAR, false)
      void c.setTarget(target.x, target.y, target.z, false)
      const fit = fitDistance([w, h, d], c.azimuthAngle, camera.fov, aspect)
      void c.dollyTo(fit, false).then(() => onReadyRef.current?.())
    } else {
      // Destination angles, not in-flight ones; eye and target move together, so both orbit angles survive.
      const end = c.getSpherical(new Spherical(), true)
      const distance = clampDistance(fitDistance([w, h, d], end.theta, camera.fov, aspect) * zoom.current, [w, h, d], camera.fov, aspect)
      const eye = new Vector3().setFromSphericalCoords(distance, end.phi, end.theta).add(target)
      void c.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, true).then(() => onReadyRef.current?.())
    }
    first.current = false
    invalidate()
  }, [w, h, d, cx, cz, aspect, camera, invalidate])

  useImperativeHandle(
    controlsRef,
    () => ({
      setView(preset) {
        const c = controls.current
        if (!c) return
        const [azimuth, polar] = VIEW_PRESETS[preset]
        // Same target, the user's zoom ratio applied to this preset's fit.
        const target = c.getTarget(new Vector3(), true)
        const { size, aspect: a } = fitInputs.current
        // Clamped to the orbit limits, so the next wheel event can't jump.
        const distance = clampDistance(fitDistance(size, azimuth, camera.fov, a) * zoom.current, size, camera.fov, a)
        const eye = new Vector3().setFromSphericalCoords(distance, polar, azimuth).add(target)
        void c.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, true)
        invalidate()
      },
      snapshot() {
        // Render and read back in the same tick: no preserveDrawingBuffer needed.
        gl.render(scene, camera)
        const url = gl.domElement.toDataURL('image/png')
        return fetch(url).then((r) => r.blob())
      },
    }),
    [camera, gl, scene, invalidate],
  )

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minAzimuthAngle={-MAX_AZIMUTH}
      maxAzimuthAngle={MAX_AZIMUTH}
      minPolarAngle={35 * DEG}
      maxPolarAngle={88 * DEG}
      minDistance={minDistance}
      maxDistance={maxDistance}
      dollySpeed={0.5}
      truckSpeed={0}
    />
  )
}

/**
 * `children` render inside the Canvas (used by the scene-check page's camera probe).
 * `doorsOpen` defaults to closed until the App passes it.
 */
export function CabinetScene({
  cabinet,
  onReady,
  children,
  doorsOpen = false,
  controlsRef,
}: { cabinet: ResolvedCabinet; onReady?: () => void; children?: ReactNode } & Omit<SceneViewProps, 'doorsOpen'> & Partial<Pick<SceneViewProps, 'doorsOpen'>>) {
  // One layout per configuration feeds the meshes, the camera fit and the shadow.
  const layout = useMemo(() => layoutCabinet(cabinet), [cabinet])
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ toneMapping: NeutralToneMapping, antialias: true }}
      camera={{ fov: 30, near: 0.05, far: 30, position: [1.5, 1.2, 4] }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <Suspense fallback={null}>
        <StudioLighting />
        <Cabinet cabinet={cabinet} layout={layout} doorsOpen={doorsOpen} />
        <FootprintShadow width={layout.bounds.size[0]} depth={layout.bounds.size[2]} />
        <CameraRig bounds={layout.bounds} onReady={onReady} controlsRef={controlsRef} />
        {children}
      </Suspense>
    </Canvas>
  )
}
