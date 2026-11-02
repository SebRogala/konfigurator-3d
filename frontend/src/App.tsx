import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'

const MIN_MM = 300
const MAX_MM = 2000
const MM_PER_M = 1000

type Dimension = 'width' | 'height' | 'depth'

export default function App() {
  const [size, setSize] = useState<Record<Dimension, number>>({ width: 800, height: 1200, depth: 400 })
  const [color, setColor] = useState('#c8a165')

  const [w, h, d] = [size.width / MM_PER_M, size.height / MM_PER_M, size.depth / MM_PER_M]

  return (
    <>
      <div className="panel">
        {(Object.keys(size) as Dimension[]).map((dim) => (
          <label key={dim}>
            {dim}
            <input
              type="range"
              min={MIN_MM}
              max={MAX_MM}
              step={10}
              value={size[dim]}
              onChange={(e) => setSize({ ...size, [dim]: Number(e.target.value) })}
            />
            <span>{size[dim]} mm</span>
          </label>
        ))}
        <label>
          colour
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
      <Canvas shadows camera={{ position: [2.5, 2, 3], fov: 45 }}>
        <color attach="background" args={['#f0f0f0']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.5} castShadow />
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={6} blur={2} far={3} />
        <Grid args={[10, 10]} cellSize={0.1} sectionSize={1} infiniteGrid fadeDistance={15} />
        <OrbitControls target={[0, 0.5, 0]} makeDefault />
      </Canvas>
    </>
  )
}
