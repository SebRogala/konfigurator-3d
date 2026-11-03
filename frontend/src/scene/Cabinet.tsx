import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { ResolvedCabinet } from '../contract/cabinet'
import { Door } from './Door'
import type { CabinetLayout } from './layout'
import { Panel } from './parts'
import { applyInteriorShading } from './interiorOcclusion'
import { type TextureTier, useFrontMaterial, useGlassMaterial, useHandleMaterial, useMetalMaterial, useShelfGlassMaterials, useWoodMaterial } from './materials'

export function Cabinet({
  cabinet,
  layout,
  doorsOpen,
  tier,
}: {
  cabinet: ResolvedCabinet
  layout: CabinetLayout
  doorsOpen: boolean
  tier: TextureTier
}) {
  const body = useWoodMaterial(cabinet.body, tier)
  const front = useFrontMaterial(cabinet.front, tier)
  const glass = useGlassMaterial(cabinet.glass)
  const handle = useHandleMaterial(cabinet.handle)
  const shelfGlass = useShelfGlassMaterials(cabinet.glazedSection !== 'none')
  const metal = useMetalMaterial()
  const invalidate = useThree((s) => s.invalidate)
  const { interior, vitrine } = layout
  useLayoutEffect(() => {
    applyInteriorShading(body, interior, vitrine)
    invalidate()
  }, [body, interior, vitrine, invalidate])
  const byRole = { body, front, glass, 'shelf-glass': shelfGlass, metal }

  return (
    <group>
      {layout.boxes.map((part, i) => (
        <Panel key={part.id} part={part} seed={i + 1} material={byRole[part.role]} />
      ))}
      {layout.doors.map((door) => (
        <Door key={door.id} door={door} open={doorsOpen} materials={byRole} handleMaterial={handle} showHandle={cabinet.handle !== 'push'} />
      ))}
    </group>
  )
}
