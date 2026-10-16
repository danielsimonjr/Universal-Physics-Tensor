/**
 * Epistemic-grounding ledger (PI-instrument Phase 1). Verifies the honesty
 * guards the vet mandated: a gate is `passed` only if it ran and the candidate
 * survived; an abstained gate and an UNADJUDICATED `novel-consequence` are both
 * `gaps`, never strengths; there is no single "tier"; and the mechanism/data
 * ceiling is always false.
 *
 * @module tests/composition/grounding
 */
import { describe, it, expect } from 'vitest';
import { describeGrounding, describeReadiness } from '../../src/composition/grounding.js';
import type { CandidateGrounding } from '../../src/composition/grounding.js';
import type { VettedCandidate } from '../../src/composition/discovery.js';

/** A `promising`-shaped candidate with overridable falsifier fields. */
function candidate(over: Partial<VettedCandidate> = {}): VettedCandidate {
  return {
    a: 'x', b: 'y', dim: 'energy',
    touchesCore: true, sameKind: false, mergesComponents: true,
    unlocksFromAnchor: ['y'],
    numericallyConsistent: true, inconsistentNodes: [],
    ordersApart: 0.3, magnitudeChecked: true, magnitudeUsedAnchor: false,
    subsuming: false,
    verdict: 'promising', score: 6,
    axisChecked: true, axisClashes: [],
    canonicalKinds: [], touchesCanonical: false,
    ...over,
  };
}

describe('describeGrounding — epistemic-grounding ledger', () => {
  it('a magnitude clash is never a passed magnitude, and the falsifier did not survive (it fired)', () => {
    // The gate ran and FAILED: 4.27 orders against the 3-order threshold. Its failure is the
    // verdict; neither the grounding ledger nor the readiness may call it a survived test.
    const clash = candidate({ ordersApart: 4.27, verdict: 'magnitude-clash', score: -1, unlocksFromAnchor: [] });
    const g = describeGrounding(clash);
    expect(g.passed.some((p) => p.startsWith('magnitude'))).toBe(false);
    const f = describeReadiness(clash).falsifiers;
    expect(f.survived).not.toContain('magnitude');
    expect(f.abstained).not.toContain('magnitude');
    // Control: the same comparison under the threshold is a pass and a survived falsifier.
    const pass = candidate({ ordersApart: 2.9 });
    expect(describeGrounding(pass).passed).toContain('magnitude (2.9 orders)');
    expect(describeReadiness(pass).falsifiers.survived).toContain('magnitude');
  });

  it('an anchor-invariant magnitude match is a GAP, never a pass (persona finding L3)', () => {
    const g = describeGrounding(
      candidate({ ordersApart: 1.1, magnitudeUsedAnchor: true, magnitudeAnchorInvariant: true }),
    );
    expect(g.passed.some((p) => p.startsWith('magnitude'))).toBe(false);
    expect(g.gaps).toContain(
      'magnitude (anchor-invariant: the graph fixes this ratio at every anchor, so the match is an identity, not evidence)',
    );
  });

  it('a fully-vetted entailed candidate: all gates passed, no gaps', () => {
    const g = describeGrounding(candidate(), 'entailed');
    expect(g.passed).toContain('numerical-consistency');
    expect(g.passed).toContain('magnitude (0.3 orders)');
    expect(g.passed).toContain('axis-compatible (≥1 regime axis)');
    expect(g.passed).toContain('consequence: entailed');
    expect(g.gaps).toEqual([]);
  });

  it('HONESTY: novel-consequence is a GAP (unadjudicated), never passed', () => {
    const g = describeGrounding(candidate(), 'novel-consequence');
    expect(g.gaps).toContain('consequence: novel (unadjudicated)');
    expect(g.passed.some((p) => p.startsWith('consequence'))).toBe(false);
  });

  it('inconclusive consequence is a gap; no consequence arg → no consequence line', () => {
    expect(describeGrounding(candidate(), 'inconclusive').gaps).toContain('consequence: inconclusive');
    const none = describeGrounding(candidate());
    expect([...none.passed, ...none.gaps].some((s) => s.startsWith('consequence'))).toBe(false);
  });

  it('HONESTY: an abstained magnitude gate is a gap, NOT magnitude-vetted', () => {
    const g = describeGrounding(candidate({ magnitudeChecked: false, ordersApart: null }));
    expect(g.gaps).toContain('magnitude (no representative value)');
    expect(g.passed.some((p) => p.startsWith('magnitude'))).toBe(false);
  });

  it('an unresolved axis is a gap; a resolved+agreeing axis is honestly partial', () => {
    expect(describeGrounding(candidate({ axisChecked: false })).gaps)
      .toContain('axis (regime attributes unresolved)');
    // "≥1 regime axis" — never claims a full check
    expect(describeGrounding(candidate()).passed).toContain('axis-compatible (≥1 regime axis)');
  });

  it('anchor-derived magnitude value is flagged as weaker', () => {
    const g = describeGrounding(candidate({ magnitudeUsedAnchor: true }));
    expect(g.passed.some((p) => p.includes('anchor-derived'))).toBe(true);
  });

  it('CEILING: mechanismTested and dataTested are always false in Phase 1', () => {
    const g: CandidateGrounding = describeGrounding(candidate(), 'entailed');
    expect(g.mechanismTested).toBe(false);
    expect(g.dataTested).toBe(false);
  });

  it('STRUCTURE: the ledger is passed/gaps sets with no single "tier" field', () => {
    const g = describeGrounding(candidate());
    expect(Object.keys(g).sort()).toEqual(['dataTested', 'gaps', 'mechanismTested', 'passed']);
    expect((g as unknown as Record<string, unknown>).tier).toBeUndefined();
  });
});
