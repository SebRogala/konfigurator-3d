// Source guard: every frame renders through one path, whether the camera moves or not. Headless SwiftShader hides
// GPU-only differences, so the pixel identity check (scene-check/settle-compare.mjs) is backed by this scan.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SCENE = join(import.meta.dirname, '../src/scene')
const sources = readdirSync(SCENE)
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ file: f, code: readFileSync(join(SCENE, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '') }))

/** Files whose code (comments stripped) matches `pattern`. */
const matching = (pattern: RegExp) => sources.filter((s) => pattern.test(s.code)).map((s) => s.file)

describe('scene render code has no camera-motion branch', () => {
  test('no file compares camera matrices or poses between frames', () =>
    assert.deepEqual(matching(/camera\.(matrixWorld|position|quaternion)[\w.]*\.equals\(|cameraMoved|lastView/), []))
  test('no settle timer schedules a deferred frame', () => assert.deepEqual(matching(/SETTLE|setTimeout\(\s*invalidate/), []))
  test('no file hand-schedules the shadow map refresh', () => assert.deepEqual(matching(/shadowMap\.(autoUpdate|needsUpdate)/), []))
  test('no screen-space post pass is imported', () => assert.deepEqual(matching(/postprocessing\/(GTAOPass|SSAOPass|EffectComposer|SAOPass)/), []))
})

test('only the door swing and the floor-shadow bake use the geometry-motion flag', () =>
  assert.deepEqual(matching(/from '\.\/motion'/).sort(), ['BakedFloorShadow.tsx', 'Door.tsx', 'StudioEffects.tsx']))
