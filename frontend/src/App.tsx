import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { ResolvedCabinet } from './contract/cabinet'
import type { SceneControls } from './contract/sceneControls'
import type { TextureTier } from './scene/materials'
import { posterHeightRatio } from './scene/viewFraming'
import type { Catalog, FieldId, Selection } from './model/catalog'
import { resolveCabinet } from './model/resolve'
import { totalPrice } from './model/pricing'
import { Header } from './ui/Header'
import { StepPanel } from './ui/StepPanel'
import { STEPS } from './ui/steps'
import { Summary } from './ui/Summary'
import { ViewerControls } from './ui/ViewerControls'

const CabinetScene = lazy(() => import('./scene/CabinetScene').then((m) => ({ default: m.CabinetScene })))

/**
 * A render of the default cabinet that stands in for the canvas until its first frame. Sized from the same camera fit
 * as the scene (not `object-fit`), so the cabinet sits where the first frame draws it at any viewport aspect.
 */
function ViewportPoster({ cabinet, viewport, hidden }: { cabinet: ResolvedCabinet; viewport: RefObject<HTMLDivElement | null>; hidden: boolean }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [posterAspect, setPosterAspect] = useState<number | null>(null)
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [viewport])
  const height = box && posterAspect ? box.h * posterHeightRatio(cabinet, posterAspect, box.w / Math.max(1, box.h)) : 0
  return (
    <picture className={`viewport__poster${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
      <source media="(max-width: 820px)" srcSet="/poster-phone.webp" />
      <img
        src="/poster-desktop.webp"
        alt=""
        fetchPriority="high"
        onLoad={(e) => setPosterAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        style={height ? { height, width: height * (posterAspect ?? 1) } : { visibility: 'hidden' }}
      />
    </picture>
  )
}

export default function App({ catalog }: { catalog: Catalog }) {
  const [selection, setSelection] = useState<Selection>(catalog.defaultSelection)
  const [openStep, setOpenStep] = useState<string | null>(STEPS[0].id)
  const [summaryOpen, setSummaryOpen] = useState(false)
  // View state only: never part of Selection or the price.
  const [doorsOpen, setDoorsOpen] = useState(false)
  // Texture tier on screen; null until the first WebGL frame. A newly picked wood drops back to 'low' while it loads.
  const [sceneTier, setSceneTier] = useState<TextureTier | null>(null)
  const sceneControls = useRef<SceneControls>(null)
  const appRoot = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const cabinet = useMemo(() => resolveCabinet(catalog, selection), [catalog, selection])

  const select = (field: FieldId, value: string) => setSelection((s) => ({ ...s, [field]: value }))

  return (
    <div className="app" ref={appRoot}>
      <Header totalZl={totalPrice(catalog, selection)} onSummary={() => setSummaryOpen(true)} />
      <main className="layout">
        <div className="viewport" ref={viewport}>
          <Suspense fallback={null}>
            <CabinetScene cabinet={cabinet} doorsOpen={doorsOpen} controlsRef={sceneControls} onTier={setSceneTier} />
          </Suspense>
          {/* The poster is a render of the default cabinet; it only stands in while the selection is still the default. */}
          {selection === catalog.defaultSelection && (
            <ViewportPoster cabinet={cabinet} viewport={viewport} hidden={sceneTier !== null} />
          )}
          {sceneTier !== 'full' && (
            <p className="viewport__loading" role="status">
              {sceneTier ? 'Wczytywanie tekstur w pełnej jakości' : 'Wczytywanie modelu 3D'}
            </p>
          )}
          <ViewerControls
            controls={sceneControls}
            fullscreenTarget={appRoot}
            doorsOpen={doorsOpen}
            onDoorsOpenChange={setDoorsOpen}
            snapshotName={`szafka-${cabinet.widthMm}x${cabinet.heightMm}.png`}
          />
        </div>
        <div className="steps">
          {STEPS.map((step, i) => (
            <StepPanel
              key={step.id}
              catalog={catalog}
              step={step}
              index={i}
              open={openStep === step.id}
              onToggle={() => setOpenStep((cur) => (cur === step.id ? null : step.id))}
              selection={selection}
              onSelect={select}
            />
          ))}
        </div>
      </main>
      {summaryOpen && <Summary catalog={catalog} selection={selection} onClose={() => setSummaryOpen(false)} />}
    </div>
  )
}
