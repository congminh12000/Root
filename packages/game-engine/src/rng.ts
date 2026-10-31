/**
 * Randomness the engine consumes. The server owns the seed; the engine only asks for integers and every
 * value it receives is recorded, so a game replays from its record without the seed (game-state.md).
 */
export interface Rng {
  /** Uniform integer in [0, n). */
  int(n: number): number
}

/** sfc32 seeded from a string via cyrb128. Small, fast and identical on every JS engine. */
export function seededRng(seed: string): Rng {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  let a = (h1 ^ h2 ^ h3 ^ h4) >>> 0, b = (h2 ^ h1) >>> 0, c = (h3 ^ h1) >>> 0, d = (h4 ^ h1) >>> 0
  const next = () => {
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return t >>> 0
  }
  return {
    int(n) {
      if (!Number.isInteger(n) || n < 1) throw new RangeError(`rng.int(${n})`)
      const limit = Math.floor(0x100000000 / n) * n // reject the tail so every value is equally likely
      for (;;) { const x = next(); if (x < limit) return x % n }
    },
  }
}

/** Wraps an Rng and keeps every value it hands out, for the game record. */
export function recordingRng(inner: Rng): Rng & { values: number[] } {
  const values: number[] = []
  return { values, int(n) { const v = inner.int(n); values.push(v); return v } }
}

/** Plays back recorded values; throws if the game asks for more or for a different range than it did. */
export function replayRng(values: readonly number[]): Rng & { remaining(): number } {
  let i = 0
  return {
    remaining: () => values.length - i,
    int(n) {
      if (i >= values.length) throw new Error('replay: the game asked for more random values than were recorded')
      const v = values[i++]!
      if (v >= n) throw new Error(`replay: recorded value ${v} is out of range ${n}`)
      return v
    },
  }
}

/** Fisher–Yates shuffle in place. */
export function shuffle<T>(xs: T[], rng: Rng): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    ;[xs[i], xs[j]] = [xs[j]!, xs[i]!]
  }
  return xs
}
