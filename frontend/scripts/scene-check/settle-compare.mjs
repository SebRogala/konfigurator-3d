// Strict identity check of a moving frame and a settled frame at the same camera, on /scene-check.html.
// The moving frame is rendered on the frame the camera jumps back to the pose (so the renderer sees a moved camera);
// the settled frame is rendered at the same pose after everything has stopped. One render path means equal pixels.
// Shared by perf-check/settle-diff.mjs (DPR 1 and 2) and scene-check/interact.mjs.
/** A pixel differs when any channel moves more than `channel`; at most `share` of pixels may (antialiasing noise). */
export const SETTLE_LIMITS = { channel: 2, share: 0.0005 }

/** Renders [moving, settled] PNGs (base64) at `eye`/`target` via the page's test hooks and sceneControls().snapshot(). */
export async function capturePair(page, eye, target, settleMs = 2500) {
  const snap = () =>
    page.evaluate(async () => {
      const blob = await window.sceneControls().snapshot()
      const buf = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const x of buf) s += String.fromCharCode(x)
      return btoa(s)
    })
  // Orbit away and render there, then jump back: the snapshot frame is a frame with a moved camera.
  const away = [eye[0] + 0.6, eye[1] + 0.3, eye[2] - 0.4]
  await page.evaluate(([e, t]) => window.setCameraLookAt(e, t), [away, target])
  await snap()
  await page.evaluate(([e, t]) => window.setCameraLookAt(e, t), [eye, target])
  const moving = await snap()
  await page.waitForTimeout(settleMs)
  await page.evaluate(([e, t]) => window.setCameraLookAt(e, t), [eye, target])
  await page.waitForTimeout(settleMs)
  const settled = await snap()
  return [moving, settled]
}

export async function compareSettle(analyser, moving, settled) {
  return analyser.evaluate(async ([a, b, limit]) => {
    const load = async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const c = new OffscreenCanvas(img.width, img.height)
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, img.width, img.height)
    }
    const A = await load(a), B = await load(b)
    const n = A.data.length / 4
    let differ = 0, darker = 0, brighter = 0, maxDelta = 0
    const diff = new OffscreenCanvas(A.width, A.height)
    const dctx = diff.getContext('2d')
    const D = dctx.createImageData(A.width, A.height)
    for (let i = 0; i < A.data.length; i += 4) {
      const la = A.data[i] + A.data[i + 1] + A.data[i + 2]
      const lb = B.data[i] + B.data[i + 1] + B.data[i + 2]
      const d = Math.max(...[0, 1, 2].map((k) => Math.abs(A.data[i + k] - B.data[i + k])))
      maxDelta = Math.max(maxDelta, d)
      if (d > limit) { differ++; if (lb > la) brighter++; else darker++ }
      const v = Math.min(255, d * 8)
      D.data[i] = v; D.data[i + 1] = lb > la ? v : 0; D.data[i + 2] = 0; D.data[i + 3] = 255
    }
    dctx.putImageData(D, 0, 0)
    const blob = await diff.convertToBlob({ type: 'image/png' })
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (const x of buf) s += String.fromCharCode(x)
    return { n, differ: differ / n, darker: darker / n, brighter: brighter / n, maxDelta, sameSize: A.width === B.width && A.height === B.height, diffPng: btoa(s) }
  }, [moving, settled, SETTLE_LIMITS.channel])
}

export const settlePasses = (st) => st.sameSize && st.differ <= SETTLE_LIMITS.share
export const describeSettle = (st) =>
  `differ ${(st.differ * 100).toFixed(3)} % (darker ${(st.darker * 100).toFixed(3)} %, brighter ${(st.brighter * 100).toFixed(3)} %), max channel delta ${st.maxDelta}`
