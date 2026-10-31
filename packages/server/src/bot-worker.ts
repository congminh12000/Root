import { parentPort } from 'node:worker_threads'
import { decide, type BotJob } from './bot-pool.ts'

/** Worker thread body: decide each job it is sent and post back the index of the chosen legal action. */
parentPort!.on('message', (job: BotJob) => parentPort!.postMessage(decide(job)))
