import type { Snapshot } from './types'

export function appendFrames(existing: Snapshot[], incoming: Snapshot[]): Snapshot[] {
  const frames = new Map(existing.map(frame => [frame.sequence, frame]))
  incoming.forEach(frame => frames.set(frame.sequence, frame))
  return [...frames.values()].sort((a, b) => a.sequence - b.sequence)
}

export function nextIndex(index: number, length: number): number {
  return Math.min(Math.max(0, index + 1), Math.max(0, length - 1))
}
