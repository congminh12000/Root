import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'
import { BOTS } from '@root/bots'
import { sameJson, seededRng, type Action, type PlayerView } from '@root/game-engine'

/** One bot decision: everything a bot may see, plus the seed for its own randomness. */
export interface BotJob {
  bot: string
  view: PlayerView
  legal: Action[]
  seed: string
}

/** Decides a job and resolves to the index of the chosen action in `legal`. */
export type Thinker = (job: BotJob) => Promise<number>

/** Runs a job on the calling thread (tests, and the fallback when a worker fails). */
export function decide(job: BotJob): number {
  const action = BOTS[job.bot]!.choose(job.view, job.legal, seededRng(job.seed))
  const index = job.legal.findIndex(a => sameJson(a, action))
  if (index < 0) throw new Error(`bot ${job.bot} returned an action outside the legal list`)
  return index
}

type Waiting = { job: BotJob; resolve: (i: number) => void; reject: (e: Error) => void }

/**
 * A few worker threads shared by every game, so a searching bot (up to a second per decision) never blocks the
 * server from answering other games and players. Jobs queue when every worker is busy. Workers do not keep the
 * process alive on their own.
 */
export class BotPool {
  private idle: Worker[] = []
  private busy = new Map<Worker, Waiting>()
  private queue: Waiting[] = []
  private size: number

  constructor(size = Math.max(1, Math.min(4, availableParallelism() - 1))) {
    this.size = size
  }

  readonly think: Thinker = job => new Promise((resolve, reject) => {
    this.queue.push({ job, resolve, reject })
    this.pump()
  })

  private pump() {
    while (this.queue.length) {
      const worker = this.idle.pop() ?? (this.busy.size < this.size ? this.spawn() : null)
      if (!worker) return
      const next = this.queue.shift()!
      this.busy.set(worker, next)
      worker.ref() // keep the process up until the answer arrives
      worker.postMessage(next.job)
    }
  }

  private spawn(): Worker {
    const worker = new Worker(new URL('./bot-worker.ts', import.meta.url))
    worker.unref()
    worker.on('message', (index: number) => this.finish(worker, w => w.resolve(index)))
    worker.on('error', e => {
      this.finish(worker, w => w.reject(e), true)
    })
    return worker
  }

  private finish(worker: Worker, settle: (w: Waiting) => void, dead = false) {
    const waiting = this.busy.get(worker)
    this.busy.delete(worker)
    worker.unref()
    if (!dead) this.idle.push(worker)
    if (waiting) settle(waiting)
    this.pump()
  }

  async close() {
    const all = [...this.idle, ...this.busy.keys()]
    this.idle = []
    await Promise.all(all.map(w => w.terminate()))
  }
}

let shared: BotPool | null = null
/** The pool every room uses unless it is given its own thinker. */
export const sharedPool = (): BotPool => (shared ??= new BotPool())
