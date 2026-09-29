/**
 * Atlas Phase 2 §0 — THE GR SPINE RE-EXPRESSION MUST CHANGE NO NUMBER.
 *
 * Sprint 2 re-expresses general-relativity validity conditions in dimensionless
 * form (`r_s/r`, `v/c`). That is a change of DESCRIPTION, not of physics, so
 * every confrontation number must be bit-identical before and after.
 *
 * ## Why this is a golden and not a re-reading
 *
 * This invariant is the one that can break SILENTLY. A subtly wrong
 * re-expression still returns plausible numbers, still passes a smoke test, and
 * is caught only by comparison against values captured BEFORE the change. A test
 * that recomputes both sides from the current tree would pass at every moment
 * and prove nothing — the same "check that cannot fail" shape that made a
 * catalog-wide evidence measurement vacuous in Sprint 1.
 *
 * So the expected values live in a COMMITTED artifact, captured at
 * 2026-09-21 07:40 on `8520228`, before any Sprint 2 edit existed.
 *
 * ## Zero tolerance, deliberately
 *
 * There is no `toBeCloseTo` here. The claim under test is "the description
 * changed and the physics did not"; ANY nonzero delta falsifies it. A tolerance
 * would let a real regression hide inside it, and would also quietly redefine
 * the claim into something weaker that nobody agreed to.
 *
 * ## Scope: numbers only
 *
 * Prose, citations and units are NOT pinned — they are expected to be edited,
 * and pinning them would make this test fail for reasons that have nothing to do
 * with the invariant, which is how a gate gets disabled.
 *
 * If this test fails during Sprint 2, the re-expression is wrong. Do NOT
 * regenerate the golden to make it pass: that discards the only evidence that
 * the physics was preserved.
 *
 * The sole later delta is be-63's predicted Chandrasekhar mass. It scales as
 * ħ to the 3/2, and HBAR_SI is now H_SI/(2π). Every other number is still the
 * 2026-09-21 capture.
 */

import { describe, it, expect } from 'vitest';

// Read via `createRequire` rather than an import attribute: this repo's
// tsconfig.tests.json module setting rejects `with { type: 'json' }`
// (TS2823), and vitest would have run it happily — the TYPES gate caught it,
// not the test run.
import { createRequire } from 'node:module';
const golden = createRequire(import.meta.url)(
  './confrontation-numbers.golden.json',
) as { bridgeId: number; kind: string; numbers: Record<string, unknown> }[];
import { listConfrontations } from '../../src/index.js';

/** Numeric fields only, recursively — mirrors how the golden was captured. */
function numbersOf(value: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries((value ?? {}) as Record<string, unknown>)) {
    if (typeof v === 'number') out[k] = v;
    else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const nested = numbersOf(v);
      if (Object.keys(nested).length > 0) out[k] = nested;
    }
  }
  return out;
}

describe('Phase 2 §0 — confrontation numbers are unchanged by the GR re-expression', () => {
  const live = listConfrontations()
    .map((c) => ({
      bridgeId: c.bridgeId,
      kind: c.kind,
      numbers: numbersOf(typeof c.run === 'function' ? c.run() : {}),
    }))
    .sort((a, b) => a.bridgeId - b.bridgeId);

  it('pins the same set of confrontations', () => {
    expect(live.length).toBe(golden.length);
    expect(live.map((c) => c.bridgeId)).toEqual(golden.map((c) => c.bridgeId));
  });

  it('every numeric field is bit-identical to the pre-Sprint-2 capture', () => {
    // Compared as one object rather than per row: a single diff shows every
    // drifted field at once, instead of failing on the first and hiding the rest.
    expect(live).toEqual(golden);
  });

  it('the golden is not vacuous — it actually carries numbers', () => {
    // Without this, an empty golden compared against an empty live set would
    // pass forever. A control, for the same reason Sprint 1 needed one.
    const count = JSON.stringify(golden.map((g) => g.numbers)).match(/:/g)?.length ?? 0;
    expect(golden.length).toBeGreaterThan(0);
    expect(count).toBeGreaterThan(50);
  });
});
