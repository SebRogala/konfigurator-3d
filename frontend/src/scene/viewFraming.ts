import type { ResolvedCabinet } from '../contract/cabinet'
import { fitDistance } from './cameraFit'
import { layoutCabinet } from './layout'

/** The scene camera's vertical field of view, degrees. */
export const FOV_DEG = 30
/** The default 3/4 view's azimuth (radians): from the front-right, as in the reference photo. */
export const VIEW_AZIMUTH = (20 * Math.PI) / 180

/**
 * Height of a poster image (rendered at `posterAspect` with the default framing), as a share of the viewport height,
 * so the cabinet in it lands where the first canvas frame puts it at `viewportAspect`. Both views look at the same
 * target at the viewport centre; on-screen scale is inversely proportional to the fitted camera distance.
 */
export function posterHeightRatio(cabinet: ResolvedCabinet, posterAspect: number, viewportAspect: number): number {
  const { size } = layoutCabinet(cabinet).bounds
  return fitDistance(size, VIEW_AZIMUTH, FOV_DEG, posterAspect) / fitDistance(size, VIEW_AZIMUTH, FOV_DEG, viewportAspect)
}
