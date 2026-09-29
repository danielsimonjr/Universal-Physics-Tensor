/**
 * Bridge↔canonical linkage (B-T2) — recovery/containment classification with
 * the F4 circularity guard. The crisp case: Landauer's canonical form vs bridge
 * 16 (Landauer's principle) is a `restates-canonical` (declared restatement,
 * NOT a discovery). Its relation to bridge 29 (Jarzynski) is `dimensional-only`:
 * both are energy, but Landauer's `ln2` (a constant) and Jarzynski's
 * `ln⟨e^−βW⟩` (a functional stub) are NOT the same factor, so after stub-tagging
 * (normal-form.ts) they no longer collapse to one structural form.
 *
 * @module tests/canonical/linkage
 */
import { describe, it, expect } from 'vitest';
import {
  classifyLinkage,
  scanLinkages,
} from '../../src/canonical/linkage.js';
import {
  canonicalById,
  CANONICAL_EQUATIONS,
} from '../../src/canonical/registry.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';

describe('bridge↔canonical linkage', () => {
  it('Landauer ↔ bridge 16 is restates-canonical (F4), with exact recovery', () => {
    const r = classifyLinkage('CE-landauer', 16);
    expect(r.classification).toBe('restates-canonical');
    expect(r.structuralMatch).toBe(true);
    expect(r.dimMatch).toBe(true);
    expect(r.recovery?.tested).toBe(true);
    expect(r.recovery?.maxRelErr).toBe(0);
  });

  it('Landauer ↔ bridge 29 (Jarzynski) is dimensional-only — ln2 ≠ ln⟨e^−βW⟩', () => {
    // Same dimension [energy], but the dimensionless factors differ in KIND:
    // ln2 is a constant, ln⟨e^−βW⟩ is an ensemble functional. Stub-tagging
    // keeps them distinct, so this is NOT a structural match (was a false
    // `recovers` before the fix). The honest verdict is dimensional-only.
    const r = classifyLinkage('CE-landauer', 29);
    expect(r.classification).toBe('dimensional-only');
    expect(r.structuralMatch).toBe(false);
    expect(r.dimMatch).toBe(true);
    expect(canonicalById('CE-landauer')?.restatesBridge).not.toBe('29');
  });

  it('Jarzynski ↔ bridge 29 is restates-canonical (its declared L-layer partner)', () => {
    const r = classifyLinkage('CE-jarzynski', 29);
    expect(r.classification).toBe('restates-canonical');
    expect(r.structuralMatch).toBe(true);
    expect(r.dimMatch).toBe(true);
    expect(canonicalById('CE-jarzynski')?.restatesBridge).toBe('29');
  });

  it('a different-dimension bridge is unrelated', () => {
    // bridge 42 is Hawking TEMPERATURE; Landauer is ENERGY.
    expect(classifyLinkage('CE-landauer', 42).classification).toBe('unrelated');
  });

  it('Hawking temperature ↔ bridge 42 is restates-canonical with exact recovery', () => {
    const r = classifyLinkage('CE-hawking-temperature', 42);
    expect(r.classification).toBe('restates-canonical');
    expect(r.structuralMatch).toBe(true);
    expect(r.recovery?.tested).toBe(true);
    expect(r.recovery?.maxRelErr).toBe(0);
  });

  it('scan: every restates-canonical has a real restatesBridge (F4 invariant)', () => {
    const restates = scanLinkages().filter(
      (r) => r.classification === 'restates-canonical',
    );
    expect(restates.length).toBeGreaterThanOrEqual(2); // landauer~16, hawking~42
    for (const r of restates) {
      expect(canonicalById(r.canonicalId)?.restatesBridge).toBe(
        String(r.bridgeId),
      );
    }
  });

  it('scan surfaces the Landauer↔16 restatement and ≥1 dimensional-only pair', () => {
    const all = scanLinkages();
    expect(
      all.some(
        (r) =>
          r.canonicalId === 'CE-landauer' &&
          r.bridgeId === 16 &&
          r.classification === 'restates-canonical',
      ),
    ).toBe(true);
    expect(all.some((r) => r.classification === 'dimensional-only')).toBe(true);
  });

  // scanLinkages precomputes validate(bridgeRhs) and normalForm per operand
  // ONCE, then compares precomputed strings/dims across all pairs. That shared
  // precompute MUST produce exactly what the brute-force per-pair classifyLinkage
  // enumeration produces — any divergence means the precompute is stale or
  // order-dependent. Pins the per-operand hoist byte-for-byte.
  it('equals the brute-force per-pair classifyLinkage enumeration', () => {
    const bruteForce = [];
    for (const ce of CANONICAL_EQUATIONS) {
      if (!ce.scalarAst) continue;
      for (const bridgeId of BRIDGE_RHS_BY_ID.keys()) {
        const r = classifyLinkage(ce.id, bridgeId);
        if (r.classification !== 'unrelated') bruteForce.push(r);
      }
    }
    expect(scanLinkages()).toEqual(bruteForce);
  });
});
