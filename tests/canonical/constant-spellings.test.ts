/**
 * A canonical entry spells a registered constant by the constant registry's
 * primary name (`c`, `h`, `k_B`, `m_e`, `epsilon_0`, `hbar`), never by a
 * secondary spelling (`boltzmann`) or by the constant's quantity id
 * (`boltzmann-constant`, `planck-constant`), and never by a name the registry
 * does not know at all (`speed-of-light`). `CANONICAL_CONSTANTS` bakes a
 * governing name only when it is a key of that table, so every other spelling
 * becomes a free source node: the entry then cannot evaluate from its
 * governing inputs and the discovery anchor can never reach it.
 *
 * The generic rule catches the spellings the registry can resolve. The
 * evaluation checks below are the measured consequence for the entries the
 * 9.0.0 audit found (§4 C10), each from its non-constant inputs alone.
 *
 * @module tests/canonical/constant-spellings
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { CANONICAL_CONSTANTS, CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';
import { constantRecord, CONSTANT_REGISTRY } from '../../src/dimensional/symbolic-constants.js';
import { C_SI, E_SI, EPS0_SI, H_SI, K_B_SI, M_E_SI } from '../../src/core/constants.js';

const rel = (a: number, b: number) => Math.abs((a - b) / b);

describe('canonical entries spell a registered constant by its primary name', () => {
  it('no governing name is a secondary spelling or the quantity id of a registered constant', () => {
    const offenders: string[] = [];
    for (const eq of CANONICAL_EQUATIONS) {
      for (const g of eq.dimensional.governing) {
        const record = constantRecord(g.name);
        if (record !== undefined && record.name !== g.name) {
          offenders.push(`${eq.id}: '${g.name}' is a spelling of '${record.name}'`);
          continue;
        }
        const row = CONSTANT_REGISTRY.find((r) => r.quantity === g.name);
        if (row !== undefined) offenders.push(`${eq.id}: '${g.name}' is the quantity id of '${row.name}'`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the constants once typed under an unregistered name are no longer graph sources, Rydberg\'s R∞ included', () => {
    // A governing name with a constant's dimension that the graph still exposes as a
    // source is a constant typed under an unregistered name (speed-of-light, electron-mass,
    // vacuum-permittivity, reduced-planck-constant).
    const unregistered = ['speed-of-light', 'electron-mass', 'vacuum-permittivity', 'reduced-planck-constant', 'rydberg-constant'];
    const exposed = CANONICAL_GRAPH.flatMap((e) =>
      e.sources.filter((s) => unregistered.includes(s.name)).map((s) => `${e.id}: ${s.name}`),
    );
    // CE-rydberg-formula bakes R∞ (the owner's decision of 2026-10-09); the reduced-mass
    // R_M is not applied, and the entry says so in its assumptions.
    expect(exposed).toEqual([]);
    for (const name of ['c', 'h', 'k_B', 'm_e', 'epsilon_0', 'hbar']) expect(CANONICAL_CONSTANTS[name]).toBeDefined();
  });
});

describe('the audited entries evaluate from their non-constant inputs alone (§4 C10)', () => {
  const value = (id: string, inputs: Record<string, number>): number => {
    const r = evaluateRelation(id, inputs);
    if (r.kind !== 'value') throw new Error(`${id}: ${JSON.stringify(r)}`);
    return r.value;
  };

  it('CE-lorentz-factor at v = 0.6c is 1.25', () => {
    expect(value('CE-lorentz-factor', { velocity: 0.6 * C_SI })).toBeCloseTo(1.25, 12);
  });

  it('CE-compton-shift at θ = π/2 is h/(m_e c)', () => {
    expect(rel(value('CE-compton-shift', { 'scattering-angle': Math.PI / 2 }), H_SI / (M_E_SI * C_SI))).toBeLessThan(1e-12);
  });

  it('CE-boltzmann-factor at E = k_B T is e^{-1}', () => {
    expect(value('CE-boltzmann-factor', { 'state-energy': K_B_SI * 300, temperature: 300 })).toBeCloseTo(Math.exp(-1), 12);
  });

  it('CE-boltzmann-entropy at W = e is k_B', () => {
    expect(rel(value('CE-boltzmann-entropy', { 'microstate-count': Math.E }), K_B_SI)).toBeLessThan(1e-12);
  });

  it('CE-rydberg-formula evaluates from the two levels alone, with the baked R∞ (Balmer α: R∞(1/4 − 1/9))', () => {
    const R = 10973731.56816;
    expect(rel(value('CE-rydberg-formula', { 'lower-level-n': 2, 'upper-level-n': 3 }), R * (1 / 4 - 1 / 9))).toBeLessThan(1e-12);
  });

  it('CE-larmor-power at q = e, a = 1 is e²/(6π ε₀ c³)', () => {
    expect(rel(value('CE-larmor-power', { charge: E_SI, acceleration: 1 }), (E_SI * E_SI) / (6 * Math.PI * EPS0_SI * C_SI ** 3))).toBeLessThan(1e-12);
  });

  it('CE-plasma-frequency for an electron gas at n = 1e18 m⁻³ is √(n e²/(ε₀ m_e))', () => {
    const n = 1e18;
    expect(rel(value('CE-plasma-frequency', { 'carrier-density': n, charge: E_SI, mass: M_E_SI }), Math.sqrt((n * E_SI * E_SI) / (EPS0_SI * M_E_SI)))).toBeLessThan(1e-12);
  });

  it('CE-photoelectric at hf = 2W is W', () => {
    const W = 3e-19;
    expect(rel(value('CE-photoelectric', { 'photon-frequency': (2 * W) / H_SI, 'work-function': W }), W)).toBeLessThan(1e-12);
  });
});
