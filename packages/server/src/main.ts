import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { startServer } from './server.ts'

// Usage: npm run serve -- [--host 0.0.0.0] [--port 8080] [--data data/root2] [--bot-delay 400]
//        [--turn-seconds 90] [--password <key>] [--max-games 20]   (ROOT_PASSWORD also sets the password)
const { values } = parseArgs({
  options: {
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '8080' },
    data: { type: 'string', default: 'data/root2' },
    'bot-delay': { type: 'string', default: '400' },
    'turn-seconds': { type: 'string', default: '90' },
    password: { type: 'string' },
    'max-games': { type: 'string', default: '20' },
  },
})
const root = resolve(import.meta.dirname, '../../..')
const dataDir = resolve(root, values.data!)
startServer({
  host: values.host!, port: Number(values.port), dataDir,
  staticDir: resolve(root, 'packages/client/dist'),
  botDelayMs: Number(values['bot-delay']),
  turnSeconds: Number(values['turn-seconds']),
  maxGames: Number(values['max-games']),
  ...((values.password ?? process.env.ROOT_PASSWORD) ? { password: values.password ?? process.env.ROOT_PASSWORD! } : {}),
})
console.log(`Root server on http://${values.host}:${values.port} (games in ${dataDir}${values.password ?? process.env.ROOT_PASSWORD ? ', password on' : ''})`)
