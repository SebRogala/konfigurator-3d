// Mesh components shared by the carcass and the door units.
import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, type Material } from 'three'
import type { BoxPart, HandlePart } from './layout'
import { panelGeometry } from './panelGeometry'
import { frontEdgeMaterial, shadowedWoodMaterial } from './materials'

const BAR = { section: 0.016, depth: 0.02, standoff: 0.026, post: 0.01, postInset: 0.022 }

export function Panel({ part, seed, material }: { part: BoxPart; seed: number; material: Material | Material[] }) {
  const [w, h, d] = part.size
  const geometry = useMemo(() => panelGeometry([w, h, d], part.grain, seed), [w, h, d, part.grain, seed])
  useEffect(() => () => geometry.dispose(), [geometry])
  // Fronts: BoxGeometry groups are +x, -x, +y, -y (edges), then +z, -z (faces).
  const finished = useMemo(() => {
    if (!(material instanceof MeshStandardMaterial)) return material
    if (part.finish === 'shadow') return shadowedWoodMaterial(material)
    if (part.role !== 'front') return material
    const edge = frontEdgeMaterial(material)
    return part.finish === 'edge' ? edge : [edge, edge, edge, edge, material, material]
  }, [part.role, part.finish, material])
  return <mesh geometry={geometry} material={finished} position={part.position} />
}

export function BarHandle({ part, material }: { part: HandlePart; material: Material }) {
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
