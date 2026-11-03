const DEG = Math.PI / 180
/** Empty margin around the fitted cabinet, as a share of the fit distance. */
const FIT_PADDING = 0.18

/** Distance at which a box seen from `azimuth` fits the camera's vertical fov and aspect. */
export function fitDistance([w, h, d]: [number, number, number], azimuth: number, fovDeg: number, aspect: number): number {
  const projectedW = Math.abs(w * Math.cos(azimuth)) + Math.abs(d * Math.sin(azimuth))
  const projectedD = Math.abs(w * Math.sin(azimuth)) + Math.abs(d * Math.cos(azimuth))
  const tanV = Math.tan((fovDeg * DEG) / 2)
  const byHeight = h / 2 / tanV
  const byWidth = projectedW / 2 / (tanV * aspect)
  return (Math.max(byHeight, byWidth) + projectedD / 2) * (1 + FIT_PADDING)
}
