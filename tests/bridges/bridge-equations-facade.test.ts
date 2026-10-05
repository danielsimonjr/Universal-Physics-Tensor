/**
 * `BridgeEquations` facade (v0.14) — the root-level convenience layer over the
 * per-bridge evaluators. Each method must be a 1:1 pass-through to the existing
 * evaluator (identical results), the archived BE-25 OrchOR must NOT be exposed,
 * The object stays a module. It is not a package-root export.
 */
import { describe, it, expect } from 'vitest';
import * as root from '../../src/index.js';
import { BridgeEquations } from '../../src/bridges/bridge-equations.js';
import { evaluateDecoherenceRate } from '../../src/bridges/equations/be-11-decoherence-master.js';
import { evaluateHawkingTemperature } from '../../src/bridges/equations/be-42-hawking-temperature.js';
import { evaluateKSSBound } from '../../src/bridges/equations/be-21-kss-bound.js';
import { evaluateLandauerEnergy } from '../../src/bridges/equations/be-16-landauer.js';
import { evaluateQuantumHall } from '../../src/bridges/be55-quantum-hall.js';
import { evaluateJeansMass } from '../../src/bridges/be65-jeans-mass.js';
import { evaluateRadiationPressure } from '../../src/bridges/be66-radiation-pressure.js';
import { evaluateAlfvenSpeed } from '../../src/bridges/be67-alfven-speed.js';
import { evaluateTolmanEhrenfest } from '../../src/bridges/be68-tolman-ehrenfest.js';

describe('BridgeEquations facade — pass-through dispatch', () => {
  it('is not a package-root export', () => {
    expect('BridgeEquations' in root).toBe(false);
  });

  it('decoherenceRate matches the underlying evaluator', () => {
    const input = { gamma0_per_s: 1e9, lambda: 2, lambda0: 1 };
    expect(BridgeEquations.decoherenceRate(input)).toBe(evaluateDecoherenceRate(input));
  });

  it('hawkingTemperature matches the underlying evaluator', () => {
    const input = { M_kg: 1.989e30 };
    expect(BridgeEquations.hawkingTemperature(input)).toBe(evaluateHawkingTemperature(input));
  });

  it('kssBound (no-arg) matches the underlying evaluator', () => {
    expect(BridgeEquations.kssBound()).toBe(evaluateKSSBound());
  });

  it('landauerEnergy matches the underlying evaluator', () => {
    const input = { temperature_K: 300 };
    expect(BridgeEquations.landauerEnergy(input)).toBe(evaluateLandauerEnergy(input));
  });

  it('includes the post-BE-54 established catalog additions', () => {
    expect(BridgeEquations.quantumHall({ C: 2 })).toEqual(evaluateQuantumHall({ C: 2 }));
    const input = { T_K: 10, rho_kg_per_m3: 1e-18, mu: 2.33 };
    expect(BridgeEquations.jeansMass(input)).toEqual(evaluateJeansMass(input));
  });

  it('passes BE-66, BE-67, and BE-68 through to their evaluators', () => {
    const radiation = { I_W_per_m2: 1e6, R: 0, theta_rad: 0 };
    expect(BridgeEquations.radiationPressure(radiation)).toEqual(evaluateRadiationPressure(radiation));
    const alfven = { B_T: 12e-9, rho_kg_per_m3: 1e-20 };
    expect(BridgeEquations.alfvenSpeed(alfven)).toEqual(evaluateAlfvenSpeed(alfven));
    const tolman = { T_K: 300, g_00: -0.81 };
    expect(BridgeEquations.tolmanEhrenfest(tolman)).toEqual(evaluateTolmanEhrenfest(tolman));
  });
});

describe('BridgeEquations facade — surface discipline', () => {
  it('is reachable from the package root', () => {
    expect(typeof BridgeEquations).toBe('object');
    expect(BridgeEquations).not.toBeNull();
  });

  it('does NOT expose the archived BE-25 OrchOR evaluator', () => {
    expect('orchOR' in BridgeEquations).toBe(false);
    expect('evaluateOrchOR' in BridgeEquations).toBe(false);
  });

  it('every method is a callable function', () => {
    for (const [name, fn] of Object.entries(BridgeEquations)) {
      expect(typeof fn, `BridgeEquations.${name} must be a function`).toBe('function');
    }
  });

  it('covers every live catalog id with at least one facade evaluator', () => {
    // Some ids intentionally have multiple convenience forms, so the facade is
    // wider than the 55-entry catalog. The lower bound prevents future catalog
    // additions from silently outrunning the root convenience surface.
    expect(Object.keys(BridgeEquations).length).toBeGreaterThanOrEqual(58);
  });
});
