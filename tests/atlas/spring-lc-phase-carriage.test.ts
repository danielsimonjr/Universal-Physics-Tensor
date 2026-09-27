/**
 * Witness W1φ for `ab-spring-lc`'s declaration that its map carries the phase
 * (CLI audit §14 item 8, multi-bridge paths).
 *
 * Checked against an INDEPENDENT integration (`_ode.ts` RK4) of a dimensioned
 * spring and circuit the source's witness does not use, with the circuit's
 * charge read at the bridge's mapped time. The control is the same comparison
 * without the time map, which is wrong whenever ω_LC ≠ ω_s.
 *
 * @module tests/atlas/spring-lc-phase-carriage
 */
import { describe, expect, it } from 'vitest';

import { BRIDGE_SPRING_LC } from '../../src/atlas/oscillators/bridges-exact.js';
import { measureCarriedPhaseError, SPRING_LC_PHASE_CARRIAGE as CAR } from '../../src/atlas/oscillators/phase-carriage.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { carriageOf, OBSERVABLE_CARRIAGES, OBSERVABLE_TRANSLATIONS, runTranslationCheck } from '../../src/atlas/translation-registry.js';
import { runNumericWitness, type NumericWitnessSpec } from '../../src/atlas/witness-numeric.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { rk4 } from './_ode.js';

/** Zero crossings of u″ = −ω²u from rest at u0 over [0, tEnd], `steps` RK4 steps. */
function crossings(omega: number, u0: number, tEnd: number, steps: number): number[] {
  const { samples } = rk4((_t, y) => [y[1]!, -omega * omega * y[0]!], [u0, 0], 0, tEnd, steps);
  const out: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (a.y[0]! > 0 !== b.y[0]! > 0) out.push(a.t + ((b.t - a.t) * a.y[0]!) / (a.y[0]! - b.y[0]!));
  }
  return out;
}

/** max_k |ω_LC · (scale · c_k^spring) − ω_LC · c_k^LC|: the circuit's phase at the mapped crossing times, against its own. */
function carriedError(m: number, k: number, L: number, C: number, q0: number, scale: number): number {
  const ws = Math.sqrt(k / m);
  const wlc = Math.sqrt(1 / (L * C));
  const tEnd = (30 * 2 * Math.PI) / ws;
  const spring = crossings(ws, 0.8, tEnd, 60000);
  const lc = crossings(wlc, q0, tEnd * Math.max(1, ws / wlc) + 1, 60000);
  return Math.max(...spring.map((c, i) => Math.abs(wlc * scale * c - wlc * lc[i]!)));
}

describe('W1φ — ab-spring-lc carries the phase at the mapped time t·ω_s/ω_LC', () => {
  it('an independent RK4 of a dimensioned pair agrees crossing by crossing; without the time map it does not', () => {
    const [m, k, L, C] = [3, 5, 0.2, 7];
    const scale = Math.sqrt(k / m) / Math.sqrt(1 / (L * C));
    expect(carriedError(m, k, L, C, 2.5, scale)).toBeLessThan(1e-8);
    expect(carriedError(m, k, L, C, -2.5, scale)).toBeLessThan(1e-8);
    expect(carriedError(m, k, L, C, 2.5, 1)).toBeGreaterThan(1);
  });

  it('the registered W1φ is checked; its control without the time map is refuted', () => {
    expect(runTranslationCheck(CAR.checks[0]!).status).toBe('checked');
    const spec = CAR.checks[0] as NumericWitnessSpec;
    expect(runNumericWitness({ ...spec, evaluate: (s) => measureCarriedPhaseError(s, 1) }).status).toBe('refuted');
  });

  it('derives numerically-supported only from a passing W1φ, and never formally-proved', () => {
    expect([...deriveEvidence({ witnesses: CAR.witnesses }, new Set(['W1φ']))]).toEqual(['numerically-supported']);
    expect([...deriveEvidence({ witnesses: CAR.witnesses }, NO_PASSING_WITNESSES)]).toEqual(['proposed']);
    expect('formalRef' in CAR).toBe(false);
  });
});

describe('carriages are declared per bridge and per observable', () => {
  it('every carriage names an exact-equivalence bridge and an observable some translation declares', () => {
    const bridges = ATLAS_FAMILIES.flatMap((f) => f.bridges);
    for (const c of OBSERVABLE_CARRIAGES) {
      expect(bridges.find((b) => b.id === c.bridgeId)?.relation).toBe('exact-equivalence');
      expect(OBSERVABLE_TRANSLATIONS.some((t) => t.observable === c.observable)).toBe(true);
      expect(c.witnesses.map((w) => w.id).sort()).toEqual(c.checks.map((x) => x.id).sort());
    }
    expect(CAR.bridgeId).toBe(BRIDGE_SPRING_LC.id);
  });

  it('ab-spring-lc carries phase and NOT position; no other bridge carries anything', () => {
    expect(carriageOf('ab-spring-lc', 'phase')).toBe(CAR);
    expect(carriageOf('ab-spring-lc', 'position')).toBeUndefined();
    expect(carriageOf('ab-damped-rlc', 'phase')).toBeUndefined();
    expect(OBSERVABLE_CARRIAGES).toHaveLength(1);
  });
});
