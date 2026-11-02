import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { NeutralToneMapping, type PerspectiveCamera } from 'three'
import type { ResolvedCabinet } from '../contract/cabinet'
import { Cabinet } from './Cabinet'
import { layoutCabinet } from './layout'
import { FootprintShadow } from './FootprintShadow'
import { preloadSceneTextures } from './materials'

const MM_PER_M = 1000
const DEG = Math.PI / 180
// The reference photo's 3/4 view: from the front-right, slightly above the cabinet's middle.
const VIEW_AZIMUTH = 20 * DEG
const VIEW_POLAR = 80 * DEG
// Inside ±90° so the camera always stays in front of the back panel's plane, at every distance.
const MAX_AZIMUTH = 75 * DEG
const FIT_PADDING = 0.18
const TARGET_HEIGHT_RATIO = 0.47
const BACKGROUND = '#f5f4f2'

preloadSceneTextures()

/** Distance at which a box seen from `azimuth` fits the camera's vertical fov and aspect. */
function fitDistance([w, h, d]: [number, number, number], azimuth: number, fovDeg: number, aspect: number): number {
  const projectedW = Math.abs(w * Math.cos(azimuth)) + Math.abs(d * Math.sin(azimuth))
  const projectedD = Math.abs(w * Math.sin(azimuth)) + Math.abs(d * Math.cos(azimuth))
  const tanV = Math.tan((fovDeg * DEG) / 2)
  const byHeight = h / 2 / tanV
  const byWidth = projectedW / 2 / (tanV * aspect)
  return (Math.max(byHeight, byWidth) + projectedD / 2) * (1 + FIT_PADDING)
}

/**
 * Orbit controls plus framing: refits distance and target when a dimension or the canvas aspect changes,
 * keeping the user's orbit angle (G16, G17).
 */
function CameraRig({ cabinet, onReady }: { cabinet: ResolvedCabinet; onReady?: () => void }) {
  const controls = useRef<CameraControls>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const invalidate = useThree((s) => s.invalidate)
  const first = useRef(true)
  const bounds = useMemo(() => layoutCabinet(cabinet).bounds, [cabinet])
  const [w, h, d] = bounds.size
  // The widest fit any allowed azimuth can need on this canvas, so maxDistance never blocks a refit.
  const worstFit = Math.max(fitDistance([w, h, d], 0, camera.fov, aspect), fitDistance([w, h, d], MAX_AZIMUTH, camera.fov, aspect))

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const animate = !first.current
    if (first.current) void c.rotateTo(VIEW_AZIMUTH, VIEW_POLAR, false)
    const distance = fitDistance([w, h, d], c.azimuthAngle, camera.fov, aspect)
    void c.setTarget(bounds.centre[0], h * TARGET_HEIGHT_RATIO, bounds.centre[2], animate)
    void c.dollyTo(distance, animate).then(() => onReady?.())
    first.current = false
    invalidate()
  }, [w, h, d, bounds, aspect, camera, invalidate, onReady])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minAzimuthAngle={-MAX_AZIMUTH}
      maxAzimuthAngle={MAX_AZIMUTH}
      minPolarAngle={35 * DEG}
      maxPolarAngle={88 * DEG}
      minDistance={fitDistance([w, h, d], 0, camera.fov, aspect) * 0.6}
      maxDistance={worstFit * 2}
      dollySpeed={0.5}
      truckSpeed={0}
    />
  )
}

export function CabinetScene({ cabinet, onReady }: { cabinet: ResolvedCabinet; onReady?: () => void }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ toneMapping: NeutralToneMapping, antialias: true }}
      camera={{ fov: 30, near: 0.05, far: 30, position: [1.5, 1.2, 4] }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <Suspense fallback={null}>
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
        <Cabinet cabinet={cabinet} />
        <FootprintShadow width={cabinet.widthMm / MM_PER_M} depth={cabinet.depthMm / MM_PER_M} />
        <CameraRig cabinet={cabinet} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
