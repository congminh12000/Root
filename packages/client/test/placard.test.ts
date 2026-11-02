import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { facePlacards, LABEL_LAYER, placard } from '../src/board/toon.ts'
import { factionColor } from '../src/ui/tokens.ts'

test('card labels stand on a foot, share print resources and turn without moving their ground position', async () => {
  const originalDocument = globalThis.document, originalImage = globalThis.Image
  const g = new Proxy({}, { get: () => () => {} })
  Object.assign(globalThis, {
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => g }), fonts: { load: async () => [] } },
    Image: class { onload?: () => void; set src(_: string) { queueMicrotask(() => this.onload?.()) } },
  })
  try {
    const a = placard('12', 'marquise', factionColor.marquise)
    const b = placard('12', 'marquise', factionColor.marquise)
    assert.ok(a instanceof THREE.Group)
    assert.equal(a.children.length, 2, 'foot and card')
    const front = a.children[1]!.children[1] as THREE.Mesh
    assert.equal(front.material, (b.children[1]!.children[1] as THREE.Mesh).material)
    assert.equal(front.layers.mask, 1 << LABEL_LAYER, 'print stays sharp after post-processing')
    assert.equal((a.children[0] as THREE.Mesh).position.y, .035)
    a.position.set(2, .1, 3)
    const before = a.position.clone(), camera = new THREE.PerspectiveCamera()
    camera.position.set(10, 20, -10)
    facePlacards(a, camera)
    assert.deepEqual(a.position, before)
    assert.equal(a.rotation.x, 0); assert.equal(a.rotation.z, 0)
    assert.ok(a.rotation.y > 0)
    const scene = new THREE.Group(); scene.add(new THREE.Object3D())
    assert.doesNotThrow(() => facePlacards(scene, camera), 'objects without labels are unchanged')
    await new Promise(resolve => setTimeout(resolve, 0))
  } finally { Object.assign(globalThis, { document: originalDocument, Image: originalImage }) }
})
