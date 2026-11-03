import { useEffect, useRef, useState, type ReactElement, type RefObject } from 'react'
import type { SceneControls, ViewPreset } from '../contract/sceneControls'
import { CameraIcon, DoorClosedIcon, DoorOpenIcon, ExitFullscreenIcon, FrontViewIcon, FullscreenIcon, SideViewIcon, ThreeQuarterViewIcon } from './icons'

interface Props {
  controls: RefObject<SceneControls | null>
  /** The element that goes fullscreen: the whole configurator (header, 3D view, steps). */
  fullscreenTarget: RefObject<HTMLElement | null>
  doorsOpen: boolean
  onDoorsOpenChange: (open: boolean) => void
  snapshotName: string
}

const VIEWS: [ViewPreset, string, () => ReactElement][] = [
  ['front', 'Przód', FrontViewIcon],
  ['three-quarter', '3/4', ThreeQuarterViewIcon],
  ['side', 'Bok', SideViewIcon],
]

/** "Sterowanie": collapsed overlay menu for view-only controls (camera, doors, snapshot, fullscreen). */
export function ViewerControls({ controls, fullscreenTarget, doorsOpen, onDoorsOpenChange, snapshotName }: Props) {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === fullscreenTarget.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [fullscreenTarget])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const download = async () => {
    const blob = await controls.current?.snapshot()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: snapshotName })
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void fullscreenTarget.current?.requestFullscreen()
  }

  return (
    <div className="viewer" ref={root}>
      <button ref={toggle} className="viewer__toggle" aria-expanded={open} aria-controls="viewer-menu" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 16 16" aria-hidden><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
        Sterowanie
      </button>
      {open && (
        <div className="viewer__menu" id="viewer-menu">
          <p className="viewer__label">Kamera</p>
          <div className="viewer__row">
            {VIEWS.map(([preset, name, ViewIcon]) => (
              <button key={preset} className="viewer__btn" data-view={preset} onClick={() => controls.current?.setView(preset)}>
                <ViewIcon />
                {name}
              </button>
            ))}
          </div>
          <p className="viewer__label">Drzwi</p>
          <button className="viewer__btn viewer__btn--wide" data-action="doors" onClick={() => onDoorsOpenChange(!doorsOpen)}>
            {doorsOpen ? <DoorClosedIcon /> : <DoorOpenIcon />}
            {doorsOpen ? 'Zamknij drzwi' : 'Otwórz drzwi'}
          </button>
          <div className="viewer__sep" />
          <button className="viewer__btn viewer__btn--wide" data-action="snapshot" onClick={() => void download()}>
            <CameraIcon />
            Pobierz zdjęcie
          </button>
          <button className="viewer__btn viewer__btn--wide" data-action="fullscreen" onClick={toggleFullscreen}>
            {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            {fullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
          </button>
        </div>
      )}
    </div>
  )
}
