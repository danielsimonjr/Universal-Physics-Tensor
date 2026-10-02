/**
 * Link-candidate proposals (src/composition/bridge-analysis.ts). Pins the
 * generator (cross-cluster same-dimension pairs), the funnel counts, and —
 * load-bearing — that the result is coincidence-heavy (a GRW/decoherence
 * rate matches the Hubble rate) and that the one genuinely-motivated
 * critical-dynamics candidate is present.
 */
import { describe, it, expect } from 'vitest';
import { proposeLinkCandidates } from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';

const GRAPH = CATALOG_GRAPH;

const cands = proposeLinkCandidates(GRAPH);
const has = (a: string, b: string) =>
  cands.some((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));

describe('proposeLinkCandidates — generator', () => {
  it('produces the cross-cluster same-dimension pool (152) — quantified noise', () => {
    expect(cands.length).toBe(152);
  });

  it('the funnel narrows: most touch the core, fewer are same-kind', () => {
    const core = cands.filter((c) => c.touchesCore).length;
    const ck = cands.filter((c) => c.touchesCore && c.sameKind).length;
    expect(core).toBe(118);
    expect(ck).toBe(37);
    expect(ck).toBeLessThan(core); // the filters genuinely narrow
  });

  it('excludes dimensionless matches and within-cluster pairs', () => {
    expect(cands.every((c) => c.dim !== '[dimensionless]')).toBe(true);
    // never proposes a pair already linked by sharing a quantity name
    expect(cands.every((c) => c.a !== c.b)).toBe(true);
  });

  it('is coincidence-heavy: an obvious non-bridge survives same-kind+core', () => {
    // a decoherence rate is NOT the cosmic expansion rate — but it matches
    // dimensionally and shares the `rate` token.
    const dh = cands.find((c) => has('decoherence-rate', 'hubble-rate') && c);
    expect(dh).toBeTruthy();
    expect(dh!.touchesCore).toBe(true);
    expect(dh!.sameKind).toBe(true);
  });

  it('surfaces the genuinely-motivated critical-dynamics candidate', () => {
    // coarsening length (BE-15, isolated) ≟ quantum correlation length
    // (BE-33, core) — the one worth a physicist's review.
    expect(has('coarsening-length', 'quantum-correlation-length')).toBe(true);
    const c = cands.find(
      (x) => has('coarsening-length', 'quantum-correlation-length') && x.sharedToken === 'length',
    );
    expect(c?.touchesCore).toBe(true);
  });

  it('is ranked core-first then same-kind-first', () => {
    for (let i = 1; i < cands.length; i++) {
      const p = cands[i - 1], q = cands[i];
      if (p.touchesCore === q.touchesCore && p.sameKind === q.sameKind) continue;
      // ordering key is non-increasing on (touchesCore, sameKind)
      const key = (c: typeof p) => (c.touchesCore ? 2 : 0) + (c.sameKind ? 1 : 0);
      expect(key(p)).toBeGreaterThanOrEqual(key(q));
    }
  });
});
