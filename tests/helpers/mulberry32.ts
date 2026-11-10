/**
 * The mulberry32 generator: a seeded source of numbers in [0, 1). The same seed gives the
 * same sequence, so a sampled token set can be read again.
 *
 * @module tests/helpers/mulberry32
 */

/** A mulberry32 generator for `seed`. Each call returns the next number in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
