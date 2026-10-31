import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { startServer } from './server.ts'

// Usage: npm run serve -- [--host 0.0.0.0] [--port 8080] [--data data/root2] [--bot-delay 400]
const { values } = parseArgs({
  options: {
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '8080' },
    data: { type: 'string', default: 'data/root2' },
    'bot-delay': { type: 'string', default: '400' },
  },
})
const root = resolve(import.meta.dirname, '../../..')
const dataDir = resolve(root, values.data!)
startServer({
  host: values.host!, port: Number(values.port), dataDir,
  staticDir: resolve(root, 'packages/client/dist'),
  botDelayMs: Number(values['bot-delay']),
})
console.log(`Root server on http://${values.host}:${values.port} (games in ${dataDir})`)
