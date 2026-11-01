// Prints clauses of the local Rules Library p16 snapshot, with their sub-clauses and official FAQ, so they can be
// read or given to an AI that has no repo access. Reads the gitignored snapshot only; nothing is written.
// Usage: npm run rules:clause -- 4.3.3 8.2.6        (a clause includes its sub-clauses: 4.3 prints 4.3.1, 4.3.2…)
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve(import.meta.dirname, '../../docs/01-official-sources/base/rules-library-root-p16.json')
if (!existsSync(file)) { console.error('no snapshot: run `npm run rules:guard -- --refresh` online'); process.exit(1) }
const { source, clauses, faq } = JSON.parse(readFileSync(file, 'utf8')) as {
  source: string; clauses: Record<string, { name: string; text: string }>; faq: { q: string; a: string; rules: string[] }[]
}
const wanted = process.argv.slice(2).map(s => s.replace(/^ROOT-/, ''))
if (!wanted.length) { console.error('usage: npm run rules:clause -- 4.3.3 [8.2.6 …]'); process.exit(2) }

const under = (id: string, w: string) => id === w || id.startsWith(`${w}.`)
const out: string[] = [`Nguồn: ${source}`]
for (const w of wanted) {
  const ids = Object.keys(clauses).filter(id => under(id, w))
  if (!ids.length) { out.push(`\n## ${w}: không có trong Rules Library p16`); continue }
  out.push('', ...ids.map(id => `**${id} ${clauses[id]!.name}**${clauses[id]!.text ? `\n${clauses[id]!.text}` : ''}`))
  const qs = faq.filter(f => f.rules.some(r => ids.includes(r)))
  if (qs.length) out.push('', `FAQ chính thức cho ${w}:`, ...qs.map(f => `- H: ${f.q}\n  Đ: ${f.a}`))
}
console.log(out.join('\n'))
