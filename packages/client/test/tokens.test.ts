import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { ICONS, iconSprite } from '../src/ui/icons.ts'
import { alpha, color, cssVariables, factionColor, suitColor } from '../src/ui/tokens.ts'

const root = resolve(import.meta.dirname, '..')
const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? sources(join(dir, e.name)) : /\.(ts|css|html)$/.test(e.name) ? [join(dir, e.name)] : [])

test('no colour is written outside ui/tokens.ts (docs/07-ui/README.md, quality gate)', () => {
  const files = [...sources(join(root, 'src')), join(root, 'index.html'), join(root, 'ui-kit.html')]
    .filter(f => !f.endsWith(join('ui', 'tokens.ts')))
  const literal = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b(?!-)|\b0x[0-9a-fA-F]{6}\b|\brgba?\(|\bhsla?\(/g
  const found = files.flatMap(f => readFileSync(f, 'utf8').split('\n').flatMap((line, i) =>
    [...line.matchAll(literal)].map(m => `${relative(root, f)}:${i + 1} ${m[0]}`)))
  assert.deepEqual(found, [])
})

test('tokens become CSS variables, and alpha() keeps the colour', () => {
  const vars = cssVariables()
  assert.equal(vars['--ink'], color.ink)
  assert.equal(vars['--paper-raised'], color.paperRaised)
  assert.equal(vars['--faction-alliance'], factionColor.alliance)
  assert.equal(vars['--suit-bird'], suitColor.bird)
  assert.equal(vars['--motion-travel'], '750ms')
  assert.equal(alpha('#2a2118', 0.5), 'rgba(42, 33, 24, 0.5)')
  for (const [k, v] of Object.entries(vars)) assert.ok(v && !v.includes('undefined'), k)
})

test('every faction and suit has a colour and its own icon (style-guide §2: never colour alone)', () => {
  const sprite = iconSprite()
  for (const f of Object.keys(factionColor)) assert.ok(ICONS.includes(f as never) && sprite.includes(`id="i-${f}"`), f)
  for (const s of Object.keys(suitColor)) assert.ok(ICONS.includes(s as never) && sprite.includes(`id="i-${s}"`), s)
})
