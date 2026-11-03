// Dev-only page (/scene-check.html?config=<name>) that renders one cabinet for headless screenshots.
import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { CameraControls } from '@react-three/drei'
import { Spherical, type PerspectiveCamera } from 'three'
import { createRoot } from 'react-dom/client'
import { REFERENCE_CABINET, type ResolvedCabinet } from '../contract/cabinet'
import type { SceneControls } from '../contract/sceneControls'
import { CabinetScene } from './CabinetScene'
import { fitDistance } from './cameraFit'
import { layoutCabinet } from './layout'

const CONFIGS: Record<string, ResolvedCabinet> = {
  reference: REFERENCE_CABINET,
  'widest-tallest': { ...REFERENCE_CABINET, widthMm: 1300, heightMm: 1800 },
  'narrowest': { ...REFERENCE_CABINET, widthMm: 900 },
  'glazed-right-smoked': { ...REFERENCE_CABINET, glazedSection: 'right', glass: 'smoked' },
  'glazed-none-steel': { ...REFERENCE_CABINET, glazedSection: 'none', handle: 'bar-steel' },
  'walnut-wood-fronts': { ...REFERENCE_CABINET, body: 'walnut', front: { kind: 'wood', wood: 'walnut' } },
  'oak-light-white': { ...REFERENCE_CABINET, body: 'oak-light', front: { kind: 'colour', hex: '#e8e4dc' } },
  push: { ...REFERENCE_CABINET, handle: 'push' },
  'height-1800': { ...REFERENCE_CABINET, heightMm: 1800 },
  'split-equal': { ...REFERENCE_CABINET, sectionSplit: 'equal' },
  'white-steel': { ...REFERENCE_CABINET, front: { kind: 'colour', hex: '#e8e4dc' }, handle: 'bar-steel' },
  'white-steel-widest': { ...REFERENCE_CABINET, widthMm: 1300, front: { kind: 'colour', hex: '#e8e4dc' }, handle: 'bar-steel' },
}

const name = new URLSearchParams(location.search).get('config') ?? 'reference'
const cabinet = CONFIGS[name]
if (!cabinet) throw new Error(`Unknown config "${name}"; known: ${Object.keys(CONFIGS).join(', ')}`)

const markReady = () => {
  // Two frames so the fitted camera and contact shadow are on screen before the shot.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.setAttribute('data-scene-ready', name)))
}

interface CameraState {
  distance: number
  azimuth: number
  polar: number
  /** Destination distance ÷ the fit for the current cabinet, azimuth and canvas aspect. */
  zoomRatio: number
  minDistance: number
  maxDistance: number
}

declare global {
  interface Window {
    /** Destination camera state, for interact.mjs's zoom and angle assertions. */
    cameraState?: () => CameraState
    /** Current hinge rotation (degrees) per door id. */
    doorAngles?: () => Record<string, number>
    /** Swaps the rendered cabinet without reloading, so interact.mjs can check what a live option change does to the camera. */
    setSceneConfig?: (name: string) => void
    /** The scene's viewer controls (setView, snapshot), for interact.mjs. */
    sceneControls?: () => SceneControls | null
    setDoorsOpen?: (open: boolean) => void
  }
}

function CameraProbe({ cabinet: c }: { cabinet: ResolvedCabinet }) {
  const controls = useThree((s) => s.controls) as CameraControls | null
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    window.doorAngles = () => {
      const out: Record<string, number> = {}
      scene.traverse((o) => {
        if (o.name.startsWith('door:')) out[o.name.slice(5)] = (o.rotation.y * 180) / Math.PI
      })
      return out
    }
  }, [scene])
  useEffect(() => {
    window.cameraState = () => {
      if (!controls) throw new Error('Camera controls not mounted')
      const end = controls.getSpherical(new Spherical(), true)
      const fit = fitDistance(layoutCabinet(c).bounds.size, end.theta, camera.fov, aspect)
      return { distance: end.radius, azimuth: end.theta, polar: end.phi, zoomRatio: end.radius / fit, minDistance: controls.minDistance, maxDistance: controls.maxDistance }
    }
  }, [controls, camera, aspect, c])
  return null
}

export function SceneCheck() {
  const [current, setCurrent] = useState(cabinet)
  // `?doors=open` renders with the doors open from the start.
  const [doorsOpen, setDoorsOpen] = useState(new URLSearchParams(location.search).get('doors') === 'open')
  const controlsRef = useRef<SceneControls>(null)
  useEffect(() => {
    window.setDoorsOpen = setDoorsOpen
    // A getter: the controls mount later, inside the scene's Suspense boundary.
    window.sceneControls = () => controlsRef.current
  }, [])
  useEffect(() => {
    window.setSceneConfig = (next) => {
      const c = CONFIGS[next]
      if (!c) throw new Error(`Unknown config "${next}"`)
      setCurrent(c)
    }
  }, [])
  return (
    <CabinetScene cabinet={current} onReady={markReady} doorsOpen={doorsOpen} controlsRef={controlsRef}>
      <CameraProbe cabinet={current} />
    </CabinetScene>
  )
}

createRoot(document.getElementById('root')!).render(<SceneCheck />)
