import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, Material } from 'three'
import type { BoxPart, DoorUnit } from './layout'
import { BarHandle, Panel } from './parts'

const OPEN_ANGLE = (100 * Math.PI) / 180
const SWING_SECONDS = 0.6

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * One door unit swinging about its hinge. Progress follows wall-clock time since the open/close command
 * (useFrame's first delta after a command includes the demand loop's idle time); the frame loop is invalidated
 * only while the door moves (G18). Handles stay mounted and toggle `visible` (G21).
 */
export function Door({
  door,
  open,
  materials,
  handleMaterial,
  showHandle,
}: {
  door: DoorUnit
  open: boolean
  materials: Record<BoxPart['role'], Material | Material[]>
  handleMaterial: Material
  showHandle: boolean
}) {
  const hinge = useRef<Group>(null)
  const progress = useRef(open ? 1 : 0)
  // The target the animation last advanced toward; a change marks the start of a transition.
  const heading = useRef(open ? 1 : 0)
  const start = useRef({ time: 0, progress: open ? 1 : 0 })
  const invalidate = useThree((s) => s.invalidate)
  // Opening outward: a left hinge swings the free edge toward +z with a negative rotation, a right hinge with a positive one.
  const direction = door.hingeSide === 'left' ? -1 : 1

  useEffect(() => {
    invalidate()
  }, [open, invalidate])

  useFrame(() => {
    const g = hinge.current
    if (!g) return
    const target = open ? 1 : 0
    if (heading.current !== target) {
      // Transition starts now: anchored to the command, not to the idle delta of the demand loop.
      // Reversing mid-swing starts from the current progress.
      heading.current = target
      start.current = { time: performance.now(), progress: progress.current }
    }
    if (progress.current !== target) {
      const elapsed = (performance.now() - start.current.time) / 1000 / SWING_SECONDS
      const p = start.current.progress
      progress.current = target > p ? Math.min(target, p + elapsed) : Math.max(target, p - elapsed)
      invalidate()
    }
    g.rotation.y = direction * OPEN_ANGLE * easeInOutCubic(progress.current)
  })

  const [px, py, pz] = door.pivot
  return (
    <group ref={hinge} name={`door:${door.id}`} position={[px, py, pz]}>
      <group position={[-px, -py, -pz]}>
        {door.parts.map((part, i) => (
          <Panel key={part.id} part={part} seed={i + 1} material={materials[part.role]} />
        ))}
        {door.handle && (
          <group visible={showHandle}>
            <BarHandle part={door.handle} material={handleMaterial} />
          </group>
        )}
      </group>
    </group>
  )
}
