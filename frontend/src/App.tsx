import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import type { SceneControls } from './contract/sceneControls'
import type { Catalog, FieldId, Selection } from './model/catalog'
import { resolveCabinet } from './model/resolve'
import { totalPrice } from './model/pricing'
import { Header } from './ui/Header'
import { StepPanel } from './ui/StepPanel'
import { STEPS } from './ui/steps'
import { Summary } from './ui/Summary'
import { ViewerControls } from './ui/ViewerControls'

const CabinetScene = lazy(() => import('./scene/CabinetScene').then((m) => ({ default: m.CabinetScene })))

export default function App({ catalog }: { catalog: Catalog }) {
  const [selection, setSelection] = useState<Selection>(catalog.defaultSelection)
  const [openStep, setOpenStep] = useState<string | null>(STEPS[0].id)
  const [summaryOpen, setSummaryOpen] = useState(false)
  // View state only: never part of Selection or the price.
  const [doorsOpen, setDoorsOpen] = useState(false)
  const sceneControls = useRef<SceneControls>(null)
  const appRoot = useRef<HTMLDivElement>(null)
  const cabinet = useMemo(() => resolveCabinet(catalog, selection), [catalog, selection])

  const select = (field: FieldId, value: string) => setSelection((s) => ({ ...s, [field]: value }))

  return (
    <div className="app" ref={appRoot}>
      <Header totalZl={totalPrice(catalog, selection)} onSummary={() => setSummaryOpen(true)} />
      <main className="layout">
        <div className="viewport">
          <Suspense fallback={<div className="viewport__placeholder">Wczytywanie widoku 3D…</div>}>
            <CabinetScene cabinet={cabinet} doorsOpen={doorsOpen} controlsRef={sceneControls} />
          </Suspense>
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
