import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SavedGame } from './room.ts'

/** One JSON file per game under the data directory. Written to a temp file first, then renamed. */
export class Store {
  private dir: string
  constructor(dir: string) { this.dir = dir; mkdirSync(dir, { recursive: true }) }

  save = (g: SavedGame) => {
    const file = join(this.dir, `${g.id}.json`)
    writeFileSync(`${file}.tmp`, JSON.stringify(g))
    renameSync(`${file}.tmp`, file)
  }

  loadAll(): SavedGame[] {
    return readdirSync(this.dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(this.dir, f), 'utf8')) as SavedGame)
  }
}
