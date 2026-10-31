// Snapshots the Leder Rules Library (the primary rules source, decisions/0005) into a local JSON file.
// The page bundles every rule and FAQ as a JS object literal; this parses it with acorn and never executes it.
// Usage: npm run snapshot:rules                 (writes the file and prints its sha256 for the manifest)
//        npm run snapshot:rules -- --printing p17
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as acorn from 'acorn'

type Node = acorn.Node & Record<string, any>
interface RawRule { name?: string; plainName?: string; text?: string; pretext?: string; appendix?: string; children?: RawRule[] }

const SITE = 'https://rules.ledergames.com/'
const printing = process.argv.includes('--printing') ? process.argv[process.argv.indexOf('--printing') + 1]! : 'p16'
const root = resolve(import.meta.dirname, '../..')
const out = resolve(root, `docs/01-official-sources/base/rules-library-root-${printing}.json`)

const page = await (await fetch(`${SITE}?product=root&locale=en-US&printing=${printing}`)).text()
const chunks = new Set<string>()
for (const m of page.matchAll(/(?:src|href)="([\w.-]+\.js)"/g)) chunks.add(m[1]!)

const keyOf = (p: Node) => (p.key.type === 'Identifier' ? p.key.name : p.key.value) as string
function literal(n: Node): unknown {
  switch (n.type) {
    case 'Literal': return n.value
    case 'TemplateLiteral': return n.quasis.map((q: Node) => q.value.cooked).join('')
    case 'ArrayExpression': return n.elements.map(literal)
    case 'ObjectExpression': return Object.fromEntries(n.properties.map((p: Node) => [keyOf(p), literal(p.value)]))
    case 'UnaryExpression': if (n.operator === '!') return !literal(n.argument)
  }
  throw new Error(`unexpected ${n.type} in rules data`)
}
function findRules(n: Node): Node | null {
  if (n.type === 'ObjectExpression') {
    const en = n.properties.find((p: Node) => p.key && keyOf(p) === 'en-US')
    if (en?.value.type === 'ObjectExpression' && en.value.properties.some((p: Node) => keyOf(p) === printing)) return en.value
  }
  for (const v of Object.values(n)) {
    const kids = Array.isArray(v) ? v : [v]
    for (const k of kids) if (k && typeof k.type === 'string') { const r = findRules(k); if (r) return r }
  }
  return null
}

// The bundle loads the data lazily, so follow imports from main until a chunk holds it.
let data: { rules: RawRule[]; faq: { q: string; a: string; rules: string[] }[] } | null = null
const seen = new Set<string>()
const queue = [...chunks]
while (queue.length && !data) {
  const file = queue.shift()!
  if (seen.has(file)) continue
  seen.add(file)
  const js = await (await fetch(SITE + file)).text()
  for (const m of js.matchAll(/["'.]\/?(chunk-[\w-]+\.js)["']/g)) queue.push(m[1]!)
  if (!js.includes('"en-US"') && !js.includes('en-US')) continue
  const found = findRules(acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' }) as Node)
  if (found) data = (literal(found) as Record<string, typeof data>)[printing]!
}
if (!data) throw new Error(`printing ${printing} not found on ${SITE}`)

// Number clauses the way the Law prints them: 4.3.1, then I, II…, then a, b…; appendices use their letter.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const clauses: Record<string, { name: string; text: string }> = {}
function walk(rule: RawRule, path: string[], depth: number) {
  clauses[path.join('.')] = { name: rule.plainName ?? rule.name ?? '', text: [rule.pretext, rule.text].filter(Boolean).join('\n') }
  rule.children?.forEach((c, i) => walk(c, [...path, depth < 2 ? String(i + 1) : depth === 2 ? ROMAN[i]! : 'abcdefghijkl'[i]!], depth + 1))
}
data.rules.forEach((r, i) => walk(r, [r.appendix ?? String(i + 1)], 0))

// No retrieval date inside the file, so the checksum only changes when Leder changes the rules.
const json = JSON.stringify({ source: `${SITE}?product=root&locale=en-US&printing=${printing}`, clauses, faq: data.faq }, null, 1)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, json)
console.log(`${Object.keys(clauses).length} clauses, ${data.faq.length} FAQ entries -> ${out}`)
console.log(`sha256 ${createHash('sha256').update(json).digest('hex')}`)
