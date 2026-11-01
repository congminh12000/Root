// Packs the project context into one Markdown file for an AI that cannot read the repository (ChatGPT, Grok… on
// the web): agent rules, handoff, rulings, engine, product and UI specs, rule coverage and the file tree.
// It never includes official Leder material (PDFs, the Rules Library snapshot): licensing.md.
// Usage: npm run pack:context                       (writes context-pack/root-context.md, gitignored)
//        npm run pack:context -- --full-specs       (also every rule spec in docs/02-rules-spec)
//        npm run pack:context -- --with packages/game-engine/src/battle.ts --with docs/03-data-spec/cards.md
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const extra = args.flatMap((a, i) => (a === '--with' && args[i + 1] ? [args[i + 1]!] : []))
const OFFICIAL = 'docs/01-official-sources/'

const CORE = [
  'AGENTS.md', 'docs/HANDOFF.md',
  'docs/00-governance/rule-precedence.md', 'docs/00-governance/open-questions.md', 'docs/00-governance/licensing.md',
  ...readdirSync(resolve(root, 'docs/00-governance/decisions')).sort().map(f => `docs/00-governance/decisions/${f}`),
  'docs/04-engine-spec/game-state.md', 'docs/04-engine-spec/engine-api.md', 'docs/05-product-spec/multiplayer.md',
  'docs/02-rules-spec/README.md', 'docs/02-rules-spec/golden-rules.md',
  'docs/07-ui/README.md', 'docs/07-ui/style-guide.md', 'docs/07-ui/checklist.md',
]
const specs = args.includes('--full-specs')
  ? readdirSync(resolve(root, 'docs/02-rules-spec')).filter(f => f.endsWith('.md')).sort().map(f => `docs/02-rules-spec/${f}`)
  : []
const files = [...new Set([...CORE, ...specs, ...extra])]
for (const f of files) {
  if (f.startsWith(OFFICIAL)) throw new Error(`${f}: official Leder sources are never packed (licensing.md)`)
  if (!existsSync(resolve(root, f))) throw new Error(`${f}: not found`)
}

const git = (...a: string[]) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()
const fence = (f: string) => ({ '.ts': 'ts', '.json': 'json', '.yaml': 'yaml', '.sh': 'bash' })[extname(f)] ?? ''

// Rule coverage: one line per clause, so the other model sees what is done without the 65 KB matrix.
interface Rule { rule_id: string; title: string; status: string; group?: boolean; implementation: string[] }
const rules = (parse(readFileSync(resolve(root, 'docs/06-qa/rule-coverage.yaml'), 'utf8')) as { rules: Rule[] }).rules
const counts = Object.entries(rules.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}))
const coverage = [
  `Theo status: ${counts.map(([s, n]) => `${s} ${n}`).join(', ')}.`, '',
  ...rules.map(r => `- ${r.rule_id} ${r.title}: ${r.status}${r.group ? ' (nhóm)' : ''}${r.implementation.length ? ` · ${r.implementation.join(', ')}` : ''}`),
].join('\n')

const tree = git('ls-files', 'packages', 'docs', 'scripts', '.githooks', 'package.json', 'AGENTS.md')
  .split('\n').filter(f => !f.startsWith(OFFICIAL)).join('\n')

const out = [
  '# Root 2: gói ngữ cảnh cho AI',
  '',
  `Sinh bởi \`npm run pack:context\` từ commit \`${git('rev-parse', '--short', 'HEAD')}\` (nhánh \`${git('rev-parse', '--abbrev-ref', 'HEAD')}\`) lúc ${new Date().toISOString()}.`,
  '',
  '**Cách dùng:** đưa nguyên file này cho model rồi giao việc. Model phải làm theo AGENTS.md bên dưới như luật bắt buộc,',
  'trả lời bằng tiếng Việt và báo cáo 6 phần. Gói này không có luật chính thức của Leder (bản quyền): khi việc đụng tới',
  'luật, người dùng chạy `npm run rules:guard -- --refresh` trên máy rồi dán đúng các điều khoản cần thiết, in bằng',
  '`npm run rules:clause -- 4.3.3 8.2.6` (kèm FAQ chính thức). Model không được tự đoán nội dung điều khoản.',
  '',
  '## Mục lục',
  ...files.map(f => `- ${f}`), '- Rule coverage (tóm tắt)', '- Cây file',
  '',
  ...files.flatMap(f => [`---\n\n## FILE: ${f}\n`, fence(f) ? `\`\`\`${fence(f)}\n${readFileSync(resolve(root, f), 'utf8').trimEnd()}\n\`\`\`` : readFileSync(resolve(root, f), 'utf8').trimEnd(), '']),
  '---\n\n## Rule coverage (tóm tắt docs/06-qa/rule-coverage.yaml)\n', coverage, '',
  '---\n\n## Cây file (git ls-files)\n', '```', tree, '```', '',
].join('\n')

const dir = resolve(root, 'context-pack')
mkdirSync(dir, { recursive: true })
writeFileSync(resolve(dir, 'root-context.md'), out)
console.log(`${files.length} files, ${rules.length} clauses, ${Math.round(out.length / 1024)} KB -> context-pack/root-context.md`)
