/**
 * Seeded PRNG (mulberry32). One instance is created from SEED and passed
 * explicitly to every generator function (RULES.md §4: no Math.random()).
 */
export type Rng = {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Standard normal (Box–Muller). */
  normal(mean?: number, sd?: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** In-place Fisher–Yates shuffle; returns the same array. */
  shuffle<T>(items: T[]): T[];
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    normal(mean = 0, sd = 1) {
      const u = 1 - next();
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    pick(items) {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error("pick() on empty array");
      return item;
    },
    shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const a = items[i] as (typeof items)[number];
        items[i] = items[j] as (typeof items)[number];
        items[j] = a;
      }
      return items;
    },
  };
  return rng;
}
