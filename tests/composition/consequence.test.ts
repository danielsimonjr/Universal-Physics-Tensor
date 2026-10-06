import { describe, it, expect } from 'vitest';
import { annotateConsequences, classifyProposal } from '../../src/composition/consequence.js';
import { rankDiscoveries } from '../../src/composition/discovery.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';

describe('annotateConsequences', () => {
  it('attaches a consequence to every candidate; promising get a signal, non-promising get inconclusive/none', () => {
    const ranked = rankDiscoveries(CATALOG_GRAPH);
    const annotated = annotateConsequences(ranked);
    expect(annotated.length).toBe(ranked.length); // 1:1, order preserved
    // every promising candidate carries a signal from the allowed set
    for (const c of annotated) {
      if (c.verdict === 'promising') {
        expect(['entailed', 'novel-consequence', 'inconclusive']).toContain(c.consequence?.signal);
      }
    }
  });

  it('LIVE PIN (Task-0 measured): catalog promising yields 0 entailed, 1 novel-consequence', () => {
    const annotated = annotateConsequences(rankDiscoveries(CATALOG_GRAPH));
    const promising = annotated.filter((c) => c.verdict === 'promising');
    const entailed = promising.filter((c) => c.consequence?.signal === 'entailed').length;
    const novel = promising.filter((c) => c.consequence?.signal === 'novel-consequence').length;
    expect(entailed).toBe(0);
    expect(novel).toBe(1);
  });

  it('LIVE PIN: canonical promising yields 0 entailed, 5 novel-consequence', () => {
    const annotated = annotateConsequences(rankDiscoveries(CANONICAL_GRAPH));
    const promising = annotated.filter((c) => c.verdict === 'promising');
    expect(promising.filter((c) => c.consequence?.signal === 'entailed').length).toBe(0);
    // Landauer photon, hν=mc², Wien/Hubble, Compton-full against Hubble distance,
    // and the classical electron radius against that distance once 1/(4π) is in the value.
    expect(promising.filter((c) => c.consequence?.signal === 'novel-consequence').length).toBe(5);
  });

  it('annotation is order-preserving and non-mutating (same verdicts/scores as input)', () => {
    const ranked = rankDiscoveries(CATALOG_GRAPH);
    const annotated = annotateConsequences(ranked);
    annotated.forEach((c, i) => {
      expect(c.verdict).toBe(ranked[i].verdict);
      expect(c.score).toBe(ranked[i].score);
      expect(c.a).toBe(ranked[i].a);
      expect(c.b).toBe(ranked[i].b);
    });
  });
});

describe('classifyProposal — same-target AND same-governing match (the r1-bug guard)', () => {
  const withAst = CANONICAL_EQUATIONS.filter((e) => e.scalarAst);
  it('POSITIVE control: a proposal whose normalForm == a canonical eq for the SAME target and SAME governing → entailed', () => {
    const ce = withAst[0]; // any canonical eq with a scalarAst
    const fakeProposal = {
      target: ce.dimensional.target,
      governing: ce.dimensional.governing,
      scalarAst: ce.scalarAst!,
      derivedFrom: { sourceEquationIds: ['X', 'Y'] as [string, string] },
    };
    const res = classifyProposal(fakeProposal as never, CANONICAL_EQUATIONS);
    expect(res.signal).toBe('entailed');
    expect(res.evidence.canonicalMatch).not.toBeNull();
  });
  it('NEGATIVE control: same target, DIFFERENT governing set → NOT entailed (novel-consequence), never a contradiction', () => {
    const ce = withAst[0];
    // same target, but strip the governing set so it cannot match same-governing
    const fakeProposal = {
      target: ce.dimensional.target,
      governing: [] as const, // different governing → must NOT be entailed
      scalarAst: ce.scalarAst!,
      derivedFrom: { sourceEquationIds: ['X', 'Y'] as [string, string] },
    };
    const res = classifyProposal(fakeProposal as never, CANONICAL_EQUATIONS);
    expect(res.signal).toBe('novel-consequence'); // not entailed; and there is no 'contradiction' signal at all
  });
});
