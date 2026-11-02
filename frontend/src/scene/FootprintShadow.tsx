import { useEffect, useMemo } from 'react'
import { CanvasTexture } from 'three'

const TEXTURE_PX = 256
/** Share of the texture the footprint fills; the rest is room for the blur falloff. */
const FOOTPRINT_SHARE = 0.6
const BLUR_PX = 18

/**
 * Soft contact shadow: a blurred dark rectangle under the cabinet's footprint.
 * Replaces drei ContactShadows, which rendered nothing on three 0.187.
 */
export function FootprintShadow({ width, depth, opacity = 0.55 }: { width: number; depth: number; opacity?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = TEXTURE_PX
    const ctx = canvas.getContext('2d')!
    const inset = (TEXTURE_PX * (1 - FOOTPRINT_SHARE)) / 2
    ctx.filter = `blur(${BLUR_PX}px)`
    ctx.fillStyle = '#000'
    ctx.fillRect(inset, inset, TEXTURE_PX - 2 * inset, TEXTURE_PX - 2 * inset)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.0005, 0]} scale={[width / FOOTPRINT_SHARE, depth / FOOTPRINT_SHARE, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
