import type { ResolvedCabinet } from '../contract/cabinet'
import { Door } from './Door'
import type { CabinetLayout } from './layout'
import { Panel } from './parts'
import { useFrontMaterial, useGlassMaterial, useHandleMaterial, useMetalMaterial, useShelfGlassMaterials, useWoodMaterial } from './materials'

export function Cabinet({ cabinet, layout, doorsOpen }: { cabinet: ResolvedCabinet; layout: CabinetLayout; doorsOpen: boolean }) {
  const body = useWoodMaterial(cabinet.body)
  const front = useFrontMaterial(cabinet.front)
  const glass = useGlassMaterial(cabinet.glass)
  const handle = useHandleMaterial(cabinet.handle)
  const shelfGlass = useShelfGlassMaterials()
  const metal = useMetalMaterial()
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
