import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { applySurfaces, mat, material, roleOf, type Role } from '../src/board/look.ts'
import { SURFACES, surface } from '../src/board/texture-gen.ts'
import { GradeShader, tiltBlur } from '../src/map/post.ts'
import { color, factionColor, grade } from '../src/ui/tokens.ts'

// The tabletop look (docs/07-ui/style-guide.md §3–4): seeded surfaces, one material per role, the photo treatment.

test('surfaces are generated from fixed seeds: the same bytes every time, sized and tileable', () => {
  for (const name of SURFACES) {
    const a = surface(name), b = surface(name)
    assert.deepEqual(a.color, b.color, name); assert.deepEqual(a.normal, b.normal, name)
    assert.equal(a.color.length, a.size * a.size * 4)
    // A flat-ish normal map: blue (up) dominates everywhere.
    for (let i = 2; i < a.normal.length; i += 4 * 97) assert.ok(a.normal[i]! > 150, `${name} normal points up`)
  }
})

test('every role gets a cached physically based material; colours map to what things are made of', () => {
  const roles: Role[] = ['painted-wood', 'raw-wood', 'flock', 'foam', 'sand', 'stone', 'resin', 'card']
  for (const r of roles) {
    const m = mat(r, color.meadow)
    assert.ok(m instanceof THREE.MeshStandardMaterial, r)
    assert.equal(mat(r, color.meadow), m, `${r} is cached`)
    assert.ok(m.normalMap, `${r} has relief`)
  }
  assert.ok(mat('resin', color.water) instanceof THREE.MeshPhysicalMaterial)
  assert.equal(roleOf(factionColor.eyrie), 'painted-wood')
  assert.equal(roleOf(color.wood), 'raw-wood')
  assert.equal(roleOf(color.rock), 'stone')
  assert.equal(roleOf(color.path), 'sand')
  assert.equal(roleOf(color.water), 'resin')
  assert.equal(roleOf(color.pine), 'flock')
  assert.equal(material(color.white, { map: new THREE.Texture() }).roughness, 1, 'a painted ground is flocked')
})

test('generated surfaces fill the placeholders in place, without new materials', () => {
  const m = mat('stone', color.rock)
  const before = m.normalMap
  applySurfaces([{ name: 'stone', ...surface('stone') }])
  assert.equal(m.normalMap, before)
  assert.equal((m.normalMap!.image as { width: number }).width, surface('stone').size)
})

test('photo treatment: tilt-shift grows with zoom but stays readable; the grade shader reads tokens only', () => {
  assert.ok(tiltBlur(4) > tiltBlur(1))
  assert.equal(tiltBlur(100), grade.tiltMax)
  assert.match(GradeShader.fragmentShader, new RegExp(grade.saturation.toFixed(4)))
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(GradeShader.fragmentShader))
})
