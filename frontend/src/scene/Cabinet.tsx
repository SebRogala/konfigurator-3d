import { useEffect, useMemo } from 'react'
import type { Material } from 'three'
import type { ResolvedCabinet } from '../contract/cabinet'
import type { BoxPart, CabinetLayout, HandlePart } from './layout'
import { panelGeometry } from './panelGeometry'
import { useFrontMaterial, useGlassMaterial, useHandleMaterial, useShelfGlassMaterial, useWoodMaterial } from './materials'

const BAR = { section: 0.016, depth: 0.02, standoff: 0.026, post: 0.01, postInset: 0.022 }

function Panel({ part, seed, material }: { part: BoxPart; seed: number; material: Material }) {
  const [w, h, d] = part.size
  const geometry = useMemo(() => panelGeometry([w, h, d], part.grain, seed), [w, h, d, part.grain, seed])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} position={part.position} />
}

function BarHandle({ part, material }: { part: HandlePart; material: Material }) {
  const [x, y, z] = part.position
  const postX = part.length / 2 - BAR.postInset
  return (
    <group position={[x, y, z]}>
      <mesh material={material} position={[0, 0, BAR.standoff + BAR.depth / 2]}>
        <boxGeometry args={[part.length, BAR.section, BAR.depth]} />
      </mesh>
      {[-postX, postX].map((px) => (
        <mesh key={px} material={material} position={[px, 0, BAR.standoff / 2]}>
          <boxGeometry args={[BAR.post, BAR.post, BAR.standoff]} />
        </mesh>
      ))}
    </group>
  )
}

export function Cabinet({ cabinet, layout }: { cabinet: ResolvedCabinet; layout: CabinetLayout }) {
  const body = useWoodMaterial(cabinet.body)
  const front = useFrontMaterial(cabinet.front)
  const glass = useGlassMaterial(cabinet.glass)
  const handle = useHandleMaterial(cabinet.handle)
  const shelfGlass = useShelfGlassMaterial()
  const byRole = { body, front, glass, 'shelf-glass': shelfGlass }

  return (
    <group>
      {layout.boxes.map((part, i) => (
        <Panel key={part.id} part={part} seed={i + 1} material={byRole[part.role]} />
      ))}
      <group visible={cabinet.handle !== 'push'}>
        {layout.handles.map((h) => (
          <BarHandle key={h.id} part={h} material={handle} />
        ))}
      </group>
    </group>
  )
}
