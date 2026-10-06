/**
 * Atlas Phase 1, S1.3 — the coverage report makes an unearned jump LEGIBLE.
 *
 * Design note `docs/planning/Atlas-Phase-1-Design.md` §3. The property under
 * test is per-tag visibility: a single total would hide one tag rising while
 * another falls, which is the exact movement this report exists to expose.
 */

import { describe, it, expect } from 'vitest';

import { ALL_EVIDENCE_TAGS, summarizeEvidence } from '../../src/atlas/coverage.js';
import {
  catalogEvidenceInput,
  deriveEvidence,
  deriveEvidenceForVerdict,
  NO_PASSING_WITNESSES,
} from '../../src/atlas/derive-evidence.js';
import type { EvidenceTag } from '../../src/atlas/types.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { adjudicateBridgeEntry } from '../../src/bridges/membership.js';
import { REJECTED_BRIDGE_IDS } from '../../src/bridges/rejected.js';

const set = (...tags: EvidenceTag[]): ReadonlySet<EvidenceTag> => new Set(tags);

describe('summarizeEvidence', () => {
  it('reports every tag, including the zeroes', () => {
    const report = summarizeEvidence([]);
    expect(report.records).toBe(0);
    expect(Object.keys(report.byTag).sort()).toEqual([...ALL_EVIDENCE_TAGS].sort());
    for (const tag of ALL_EVIDENCE_TAGS) expect(report.byTag[tag]).toBe(0);
  });

  it('counts per tag, not per record — a record with two tags counts in both', () => {
    const report = summarizeEvidence([set('symbolically-checked', 'numerically-supported')]);
    expect(report.records).toBe(1);
    expect(report.byTag['symbolically-checked']).toBe(1);
    expect(report.byTag['numerically-supported']).toBe(1);
    expect(report.byTag.proposed).toBe(0);
  });

  it('makes a swap legible: proposed falls as a checked tag rises', () => {
    const before = summarizeEvidence([set('proposed'), set('proposed')]);
    const after = summarizeEvidence([set('proposed'), set('symbolically-checked')]);
    expect(before.records).toBe(after.records);
    expect(before.byTag.proposed).toBe(2);
    expect(after.byTag.proposed).toBe(1);
    expect(after.byTag['symbolically-checked']).toBe(1);
  });

  it('is pure — the same input twice gives equal, non-identical reports', () => {
    const input = [set('proposed')];
    const a = summarizeEvidence(input);
    const b = summarizeEvidence(input);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('coverage of the live catalog — the Sprint 1 baseline', () => {
  it('is 55 rows: contradicted iff the row carries an unresolved counterexample', () => {
    // NO_PASSING_WITNESSES is passed EXPLICITLY: no catalog row carries a
    // witness overlay yet, so nothing is verified. Stating it is the point —
    // this argument used to be defaulted, and the result below was then the
    // ONLY outcome the call could produce, whatever the rows contained.
    // See the positive control immediately after: without it, this assertion
    // cannot fail and therefore proves nothing.
    const report = summarizeEvidence(
      BRIDGE_EQUATIONS.map((e) =>
        deriveEvidenceForVerdict(adjudicateBridgeEntry(e), catalogEvidenceInput(e), NO_PASSING_WITNESSES),
      ),
    );
    // CORRECTED after Eve E1. This used to key off REJECTED_BRIDGE_IDS and
    // assert contradicted === rejectedInCatalog (5). That pinned a defect: it
    // required a refutation for BE-28, BE-29, BE-32 and BE-40, none of which
    // carries a counterexample. Only BE-35 does, and it earns the tag through
    // the normal derivation. Membership is not evidence.
    // The real `Counterexample` type has NO `resolvedBy` field yet, so on today's
    // data any counterexample is unresolved; presence is the honest predicate.
    const refuted = BRIDGE_EQUATIONS.filter(
      (e) => (e.counterexamples ?? []).length > 0,
    ).length;
    expect(report.records).toBe(136);
    // 123 is the record from before be-134..146.
    // 115 is the record from before be-126..133.
    // 92 is the record from before be-103..125. 77 is the record from before be-88..102.
    expect(report.byTag.contradicted).toBe(refuted);
    expect(report.byTag['formally-proved']).toBe(94);
    // 81 is the record from before be-134..146.
    // 73 is the record from before be-126..133.
    // 50 is the record from before be-103..125. 35 is the record from before be-88..102.
    expect(report.byTag.proposed).toBe(136 - refuted - 94);
    for (const tag of ALL_EVIDENCE_TAGS) {
      if (tag === 'proposed' || tag === 'contradicted' || tag === 'formally-proved') continue;
      expect(report.byTag[tag]).toBe(0);
    }
  });

  // ── POSITIVE CONTROL ────────────────────────────────────────────────────
  // The assertion above says "no catalog row gains evidence". On its own that
  // is worthless: if the derivation were incapable of EVER emitting a checked
  // tag, the same zeros would appear and the test would still pass. A check
  // that cannot fail is indistinguishable from one that passes.
  //
  // This control proves the instrument works, so the zeros above carry
  // information. Added after post-implementation review (Eve E1 RED) found
  // that the catalog measurement had been run with a defaulted — and empty —
  // witness set, making its headline result vacuous rather than reassuring.
  it('CONTROL: the same derivation DOES emit checked tags when evidence is present', () => {
    const rich = {
      conventions: { unitSystem: 'SI' } as const,
      witnesses: [
        { id: 'w-sym', kind: 'symbolic', consumes: ['unitSystem'] },
        { id: 'w-num', kind: 'numeric' },
      ],
      counterexamples: [],
    } as const;

    const earned = deriveEvidenceForVerdict(
      'bridge',
      rich,
      new Set(['w-sym', 'w-num']),
    );
    expect([...earned].sort()).toEqual([
      'convention-checked',
      'numerically-supported',
      'symbolically-checked',
    ]);

    // Same record, nothing verified ⇒ collapses to the catalog's answer. This
    // pair is what makes the zeros above meaningful: the difference is the
    // witness set, not the derivation's inability to speak.
    const unearned = deriveEvidenceForVerdict('bridge', rich, NO_PASSING_WITNESSES);
    expect([...unearned]).toEqual(['proposed']);
  });

  it('CONTROL: a counted catalog formalRef does not light formally-proved, and a bridge kind does', () => {
    const row = BRIDGE_EQUATIONS.find((entry) => entry.id === 64);
    const formalRef = catalogFormalRef(64);
    expect(formalRef?.fidelity).toBe('sanity-lemmas');
    expect(formalRef?.kind).toBe('derivation-step');
    expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
    expect(deriveEvidence(catalogEvidenceInput(row!), NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
    expect(
      deriveEvidence(
        { formalRef: { fidelity: formalRef!.fidelity, kind: 'bridge' } },
        NO_PASSING_WITNESSES,
      ).has('formally-proved'),
    ).toBe(true);
    const report = summarizeEvidence(
      BRIDGE_EQUATIONS.map((entry) =>
        deriveEvidenceForVerdict(adjudicateBridgeEntry(entry), catalogEvidenceInput(entry), NO_PASSING_WITNESSES),
      ),
    );
    expect(report.byTag['formally-proved']).toBe(94);
    // 81 is the record from before be-134..146.
    // 73 is the record from before be-126..133.
    // 50 is the record from before be-103..125. 35 is the record from before be-88..102.
  });
});
