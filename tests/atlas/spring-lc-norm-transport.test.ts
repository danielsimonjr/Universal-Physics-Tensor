/**
 * `ab-spring-lc`'s declared norm transport (docs/planning/ADR-transported-norm-composition.md):
 * the declaration names the norm the route actually carries, W1τ measures that
 * the map acts on it by K = 1, and the restated horizon reads the same on both
 * clocks.
 *
 * Every number is checked by a second method: W1τ integrates the pendulum's
 * image in circuit time and compares it with the closed-form elliptic error
 * (`pendulumPeriodErrorAt`), which is not computed by integration at all.
 *
 * @module tests/atlas/spring-lc-norm-transport
 */

import { describe, expect, it } from 'vitest';

import { BRIDGE_SPRING_LC } from '../../src/atlas/oscillators/bridges-exact.js';
import { AB_PENDULUM_LINEAR, pendulumPeriodErrorAt } from '../../src/atlas/oscillators/bridges-limits.js';
import {
  SPRING_LC_RELATIVE_PERIOD_TRANSPORT as NT,
  SPRING_LC_TRANSPORT_TEST,
  W1TAU_FIXTURE,
} from '../../src/atlas/oscillators/norm-transport.js';
import { measureTransportedPeriodError } from '../../src/atlas/oscillators/norm-transport-witness.js';
import { runNumericWitness } from '../../src/atlas/witness-numeric.js';
import type { NumericWitnessSpec } from '../../src/atlas/witness-numeric.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';
import { OSCILLATOR_FAMILY } from '../../src/atlas/oscillators/index.js';
import { toAtlasJson } from '../../src/atlas/serialize.js';
import type { WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The committed witness results; `toAtlasJson` derives each bridge's evidence against them. */
const witnessResults = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../data/atlas/witness-results.json'), 'utf-8'),
) as WitnessResultsArtifact;

function w1tau(): NumericWitnessSpec {
  const w = WITNESS_REGISTRY.find((r) => r.spec.id === 'W1τ');
  if (w === undefined || w.kind !== 'numeric') throw new Error('W1τ: not a registered numeric witness');
  return w.spec;
}

describe('the declaration names what the route carries', () => {
  it('its norm is the one ab-pendulum-linear states, verbatim, and its ends are the bridge ends', () => {
    expect(NT.from).toBe(AB_PENDULUM_LINEAR.bound!.norm);
    expect(NT.to).toBe(NT.from);
    expect(NT.fromModel).toBe(BRIDGE_SPRING_LC.premises[0]);
    expect(NT.toModel).toBe(BRIDGE_SPRING_LC.conclusion);
    expect(AB_PENDULUM_LINEAR.conclusion).toBe(NT.fromModel);
    expect(BRIDGE_SPRING_LC.normTransports).toEqual([NT]);
  });

  it('K is the supremum of KAt over the domain: here one constant', () => {
    expect(NT.K).toBe(1);
    const points: Readonly<Record<string, number>>[] = [{}, { theta0: 0.2 }, { L: 3, C: 7 }];
    for (const p of points) expect(NT.KAt(p)).toBe(NT.K);
  });

  it('its witness is registered under the transport id, points at this file, and is not a proof', () => {
    const entry = WITNESS_REGISTRY.find((r) => r.spec.id === NT.witness.id);
    expect(entry?.recordId).toBe(NT.id);
    expect(NT.witness.test).toBe(SPRING_LC_TRANSPORT_TEST);
    expect(SPRING_LC_TRANSPORT_TEST).toBe('tests/atlas/spring-lc-norm-transport.test.ts');
    expect(NT.basis).not.toBe('formally-proved');
    expect(NT.timeMap.uniform).toBe(true);
  });
});

describe('W1τ — the map acts on the relative period norm by K', () => {
  it('W1τ checks through the registry runner, and the error falls between the two resolutions', () => {
    const spec = w1tau();
    const r = runNumericWitness(spec);
    expect(r.status).toBe('checked');
    const coarse = Math.abs(spec.evaluate(spec.coarseResolution) - spec.target);
    const fine = Math.abs(spec.evaluate(spec.fineResolution) - spec.target);
    expect(coarse / fine).toBeGreaterThan(1);
  });

  for (const theta0 of [0.2, 0.5]) {
    it(`θ0 = ${theta0}: the image's relative period error against the circuit is K times the closed form`, () => {
      const measured = measureTransportedPeriodError(theta0, 640);
      expect(Math.abs(measured - NT.KAt({ theta0 }) * pendulumPeriodErrorAt({ theta0 }))).toBeLessThan(1e-9);
      // Not vacuous: the error is the O(θ0²/16) quantity, not zero.
      expect(measured).toBeGreaterThan(theta0 ** 2 / 16);
    });
  }

  it('the circuit is not the spring: ω_LC ≠ ω_s, so a norm that is not time-scale invariant would show it', () => {
    const omegaLC = 1 / Math.sqrt(W1TAU_FIXTURE.L * W1TAU_FIXTURE.C);
    expect(Math.abs(omegaLC / W1TAU_FIXTURE.omegaS - Math.SQRT2)).toBeLessThan(1e-14);
  });

  it('W1τ — negative control: K = ω_s/ω_LC (the absolute-period factor) is REFUTED', () => {
    const spec = w1tau();
    const omegaLC = 1 / Math.sqrt(W1TAU_FIXTURE.L * W1TAU_FIXTURE.C);
    const r = runNumericWitness({ ...spec, target: (W1TAU_FIXTURE.omegaS / omegaLC) * spec.target });
    expect(r.status).toBe('refuted');
  });

  it('META-CHECK: the same assertion FAILS on the true claim (the control can fail)', () => {
    expect(runNumericWitness(w1tau()).status).not.toBe('refuted');
  });

  it('NaN, not a number, outside the measurement domain', () => {
    expect(measureTransportedPeriodError(0, 160)).toBeNaN();
    expect(measureTransportedPeriodError(Math.PI, 160)).toBeNaN();
    expect(measureTransportedPeriodError(0.5, 160, { L: 1, C: 1, q0: -1 })).toBeNaN();
  });
});

describe('the restated horizon — t/T0 is invariant under the uniform time map', () => {
  const omegaLC = 1 / Math.sqrt(W1TAU_FIXTURE.L * W1TAU_FIXTURE.C);
  const Ts = (2 * Math.PI) / W1TAU_FIXTURE.omegaS;
  const Tlc = (2 * Math.PI) / omegaLC;
  const scale = W1TAU_FIXTURE.omegaS / omegaLC;
  const restated = NT.timeMap.restateHorizon(AB_PENDULUM_LINEAR.bound!.horizonHolds);
  const times = Array.from({ length: 41 }, (_, i) => (i * 5 * Ts) / 0.25 / 40);

  it('the spring-clock verdict at t equals the circuit-clock verdict at t·ω_s/ω_LC with T0 = 2π√(LC)', () => {
    for (const theta0 of [0.2, 0.5]) {
      for (const t of times) {
        expect(restated(t * scale, { T0: Tlc, theta0 })).toBe(
          AB_PENDULUM_LINEAR.bound!.horizonHolds(t, { T0: Ts, theta0 }),
        );
      }
    }
  });

  it('CONTROL: reading circuit time against the SPRING period (the unrestated horizon) disagrees somewhere', () => {
    const disagreements = times.filter(
      (t) => restated(t * scale, { T0: Ts, theta0: 0.5 }) !== AB_PENDULUM_LINEAR.bound!.horizonHolds(t, { T0: Ts, theta0: 0.5 }),
    );
    expect(disagreements.length).toBeGreaterThan(0);
  });
});

describe('the declaration is data in the atlas artifact', () => {
  const bridges = toAtlasJson(OSCILLATOR_FAMILY, '0.0.0', witnessResults).bridges as unknown as readonly Record<string, unknown>[];
  const spring = bridges.find((b) => b['id'] === 'ab-spring-lc')!;

  it('ab-spring-lc serializes its transport, with the functions left out', () => {
    const nts = spring['normTransports'] as readonly Record<string, unknown>[];
    expect(nts).toHaveLength(1);
    expect(nts[0]!['id']).toBe(NT.id);
    expect(nts[0]!['from']).toBe(NT.from);
    expect(nts[0]!['K']).toBe(1);
    expect(nts[0]!).not.toHaveProperty('KAt');
    expect(nts[0]!['timeMap']).not.toHaveProperty('restateHorizon');
    expect(JSON.stringify(nts)).not.toContain('=>');
  });

  it('control: a bridge that declares none carries no key at all', () => {
    const others = bridges.filter((b) => b['id'] !== 'ab-spring-lc');
    expect(others.length).toBeGreaterThan(0);
    for (const b of others) expect(b).not.toHaveProperty('normTransports');
  });
});