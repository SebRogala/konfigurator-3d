import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react'
import type { ResolvedCabinet } from './contract/cabinet'
import { DEFAULT_SELECTION, STEPS, type FieldId, type Selection } from './catalog/catalog'
import { resolveCabinet } from './catalog/resolve'
import { totalPrice } from './pricing/total'
import { Header } from './ui/Header'
import { StepPanel } from './ui/StepPanel'
import { Summary } from './ui/Summary'

type SceneComponent = ComponentType<{ cabinet: ResolvedCabinet }>
type SceneModule = { CabinetScene?: SceneComponent; default?: SceneComponent }

// The scene is built in parallel (WI-scene); render it once its file exists, a placeholder until then.
const sceneModules = import.meta.glob<SceneModule>('./scene/CabinetScene.tsx')
const sceneLoader = Object.values(sceneModules)[0]
const CabinetScene = sceneLoader
  ? lazy(() =>
      sceneLoader().then((m) => {
        const Scene = m.CabinetScene ?? m.default
        if (!Scene) throw new Error('scene/CabinetScene.tsx exports no CabinetScene component')
        return { default: Scene }
      }),
    )
  : null

export default function App() {
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION)
  const [openStep, setOpenStep] = useState<string | null>(STEPS[0].id)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const cabinet = useMemo(() => resolveCabinet(selection), [selection])

  const select = (field: FieldId, optionId: string) => setSelection((s) => ({ ...s, [field]: optionId }))

  return (
    <div className="app">
      <Header totalZl={totalPrice(selection)} onSummary={() => setSummaryOpen(true)} />
      <main className="layout">
        <div className="viewport">
          {CabinetScene ? (
            <Suspense fallback={<div className="viewport__placeholder">Wczytywanie widoku 3D…</div>}>
              <CabinetScene cabinet={cabinet} />
            </Suspense>
          ) : (
            <div className="viewport__placeholder">
              Podgląd 3D: {cabinet.widthMm} × {cabinet.heightMm} × {cabinet.depthMm} mm
            </div>
          )}
        </div>
        <div className="steps">
          {STEPS.map((step, i) => (
            <StepPanel
              key={step.id}
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
      {summaryOpen && <Summary selection={selection} onClose={() => setSummaryOpen(false)} />}
    </div>
  )
}
