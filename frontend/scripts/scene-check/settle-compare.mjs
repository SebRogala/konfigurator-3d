// Pixel comparison of a moving (direct) frame and a settled (AO) frame at the same camera. AO only darkens, so a
// pixel that got brighter, or one whose colour is not a scaled copy of the moving one, is a sharpness/colour defect.
// Shared by perf-check/settle-diff.mjs (real app, DPR 1 and 2) and scene-check/interact.mjs.
export const SETTLE_LIMITS = { brighter: 0.001, hue: 0.002 }

export async function compareSettle(analyser, moving, settled) {
  return analyser.evaluate(async ([a, b]) => {
    const load = async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const c = new OffscreenCanvas(img.width, img.height)
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, img.width, img.height)
    }
    const A = await load(a), B = await load(b)
    const n = A.data.length / 4
    let same = 0, darker = 0, brighter = 0, hue = 0, maxBright = 0
    const diff = new OffscreenCanvas(A.width, A.height)
    const dctx = diff.getContext('2d')
    const D = dctx.createImageData(A.width, A.height)
    for (let i = 0; i < A.data.length; i += 4) {
      const la = A.data[i] + A.data[i + 1] + A.data[i + 2]
      const lb = B.data[i] + B.data[i + 1] + B.data[i + 2]
      const d = Math.max(...[0, 1, 2].map((k) => Math.abs(A.data[i + k] - B.data[i + k])))
      if (d <= 3) same++
      else if (lb > la + 9) { brighter++; maxBright = Math.max(maxBright, (lb - la) / 3) }
      else darker++
      // Hue drift: the settled pixel is not a scaled copy of the moving one.
      if (la > 60 && lb > 30) {
        const k = lb / la
        if (Math.max(...[0, 1, 2].map((c) => Math.abs(B.data[i + c] - A.data[i + c] * k))) > 12) hue++
      }
      const v = Math.min(255, d * 8)
      D.data[i] = v; D.data[i + 1] = lb > la ? v : 0; D.data[i + 2] = 0; D.data[i + 3] = 255
    }
    dctx.putImageData(D, 0, 0)
    const blob = await diff.convertToBlob({ type: 'image/png' })
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (const x of buf) s += String.fromCharCode(x)
    return { n, same: same / n, darker: darker / n, brighter: brighter / n, hue: hue / n, maxBright, diffPng: btoa(s) }
  }, [moving.toString('base64'), settled.toString('base64')])
}

