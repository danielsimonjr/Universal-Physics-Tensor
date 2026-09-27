/**
 * An `AtlasModel.canonicalRefs` link is evidence only when a numeric check
 * derives the canonical relation from the MODEL: every canonical variable is
 * bound to a model parameter of the same dimension or to a quantity computed
 * from the model's own dynamics, and the canonical relation (its AST, or its
 * monomial times the sourced prefactor of `src/composition/canonical-prefactors.ts`)
 * must reproduce the computed quantity at several parameter points.
 *
 * A link added without such a check fails the ratchet below. The links that
 * predate it are listed by name; the list may only shrink.
 *
 * Limits a reader should keep: the integrators transcribe each model's
 * `dynamics` string by hand, so the check is only as good as that
 * transcription; and a check passing says the relation follows from the model
 * at the sampled points, not that the model's assumptions match the entry's
 * prose `assumptions`, which is read by a reviewer.
 */
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { canonicalPrefactor } from '../../src/composition/canonical-prefactors.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import type { AtlasModel } from '../../src/atlas/model.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { FREQUENCY, LENGTH } from '../../src/dimensional/types.js';

type Values = Readonly<Record<string, number>>;

type Binding =
  | { readonly parameter: string }
  | { readonly observable: string; readonly quantity: string; readonly measure: (p: Values) => number };

interface LinkCheck {
  readonly model: string;
  readonly canonical: string;
  /** Every canonical variable (target and governing) → what supplies it. */
  readonly bindings: Readonly<Record<string, Binding>>;
  /** Parameter points; keys beyond the model's parameters fix the initial data. */
  readonly samples: readonly Values[];
  /** Largest relative error |computed − canonical| / |canonical| accepted. */
  readonly tolerance: number;
}

type Verdict = { readonly ok: true; readonly worst: number } | { readonly ok: false; readonly reason: string };

const MODELS = ATLAS_FAMILIES.flatMap((f) => f.models);
const DIM_KEYS = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
const sameDim = (a: Dimension, b: Dimension): boolean => DIM_KEYS.every((k) => (a[k] ?? 0) === (b[k] ?? 0));
const DIMENSIONLESS_DIM = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as Dimension;

function checkLink(c: LinkCheck, plantedPrefactor?: number, models: readonly AtlasModel[] = MODELS): Verdict {
  const model = models.find((m) => m.id === c.model);
  const entry = canonicalById(c.canonical);
  if (model === undefined) return { ok: false, reason: `unknown model ${c.model}` };
  if (entry === undefined) return { ok: false, reason: `unknown canonical entry ${c.canonical}` };
  const variables = [entry.dimensional.target, ...entry.dimensional.governing];
  const bound = Object.keys(c.bindings).sort();
  if (bound.join() !== variables.map((v) => v.name).sort().join()) {
    return { ok: false, reason: `bindings [${bound}] are not the entry's variables [${variables.map((v) => v.name)}]` };
  }
  for (const v of variables) {
    const b = c.bindings[v.name]!;
    if ('parameter' in b) {
      const p = model.parameters.find((q) => q.name === b.parameter);
      const dimensionless = model.dimensionlessInputs.includes(b.parameter) && sameDim(v.dim, DIMENSIONLESS_DIM);
      if (!dimensionless && (p === undefined || !sameDim(p.dim, v.dim))) {
        return { ok: false, reason: `${v.name} is bound to '${b.parameter}', not a parameter of ${c.model} with its dimension` };
      }
    } else if (!model.observables.includes(b.observable)) {
      return { ok: false, reason: `${v.name} is measured from '${b.observable}', not an observable of ${c.model}` };
    }
  }
  if (Object.values(c.bindings).every((b) => 'parameter' in b)) {
    return { ok: false, reason: 'nothing is computed from the model: every variable is a parameter' };
  }
  const factor =
    plantedPrefactor ?? (entry.epistemicStatus === 'fully-quantitative' ? 1 : canonicalPrefactor(entry.id));
  if (factor === undefined) {
    return { ok: false, reason: `${entry.id} has no sourced prefactor, so its relation is known only up to a constant` };
  }
  const monomial = entry.dimensional.monomial;
  if (entry.scalarAst === undefined && monomial === null) {
    return { ok: false, reason: `${entry.id} records neither an AST nor a monomial` };
  }
  let worst = 0;
  for (const sample of c.samples) {
    const value = (name: string): number => {
      const b = c.bindings[name]!;
      return 'parameter' in b ? sample[b.parameter]! : b.measure(sample);
    };
    const governing = Object.fromEntries(entry.dimensional.governing.map((g) => [g.name, value(g.name)]));
    const canonical =
      factor *
      (entry.scalarAst !== undefined
        ? evalExpr(entry.scalarAst, governing)
        : Object.entries(monomial!).reduce((acc, [name, e]) => acc * governing[name]! ** e, 1));
    const computed = value(entry.dimensional.target.name);
    const rel = Math.abs(computed - canonical) / Math.abs(canonical);
    if (!Number.isFinite(rel)) return { ok: false, reason: `non-finite comparison at ${JSON.stringify(sample)}` };
    worst = Math.max(worst, rel);
  }
  return worst <= c.tolerance
    ? { ok: true, worst }
    : { ok: false, reason: `relative error ${worst.toExponential(3)} exceeds ${c.tolerance}` };
}

// ── The model-side computations ────────────────────────────────────────────

/** One RK4 step of y′ = f(y). */
function rk4(f: (y: readonly number[]) => number[], y: readonly number[], dt: number): number[] {
  const add = (a: readonly number[], b: readonly number[], s: number) => a.map((x, i) => x + s * b[i]!);
  const k1 = f(y);
  const k2 = f(add(y, k1, dt / 2));
  const k3 = f(add(y, k2, dt / 2));
  const k4 = f(add(y, k3, dt));
  return y.map((x, i) => x + (dt / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
}

/**
 * The period of a second-order oscillator (x, x′) released at rest from x0:
 * twice the time until x′ next returns to zero, the zero located by linear
 * interpolation between steps. `scale` is only the step size's time unit.
 */
function releasePeriod(accel: (x: number, v: number) => number, x0: number, scale: number): number {
  const dt = scale / 4000;
  let y = [x0, 0];
  let t = 0;
  let left = false;
  for (let i = 0; i < 4000 * 100; i++) {
    const next = rk4(([x, v]) => [v!, accel(x!, v!)], y, dt);
    if (next[1]! < 0) left = true;
    if (left && next[1]! >= 0) {
      const half = t + (dt * -y[1]!) / (next[1]! - y[1]!);
      return 2 * half;
    }
    y = next;
    t += dt;
  }
  return Number.NaN;
}

/** model-pendulum: θ″ + (g/ℓ) sin θ = 0. */
const pendulumPeriod = (p: Values): number =>
  releasePeriod((th) => -(p['g']! / p['ell']!) * Math.sin(th), p['theta0']!, Math.sqrt(p['ell']! / p['g']!));

/** model-rlc: L q″ + R q′ + q/C = 0, angular frequency 2π / period. */
const rlcAngularFrequency = (p: Values): number =>
  (2 * Math.PI) /
  releasePeriod((q, dq) => -(p['R']! * dq + q / p['C']!) / p['L']!, 1, Math.sqrt(p['L']! * p['C']!));

/** model-lc: L q″ + q/C = 0, angular frequency 2π / period. */
const lcAngularFrequency = (p: Values): number =>
  (2 * Math.PI) / releasePeriod((q) => -q / (p['C']! * p['L']!), 1, Math.sqrt(p['L']! * p['C']!));

/** The distance between two successive upward zero crossings of `fn` after `start`, by scan and bisection. */
function crossingPeriod(fn: (s: number) => number, start: number, step: number): number {
  const crossings: number[] = [];
  let s = start;
  while (crossings.length < 2 && s < start + step * 1e6) {
    if (fn(s) < 0 && fn(s + step) >= 0) {
      let lo = s;
      let hi = s + step;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (fn(mid) < 0) lo = mid;
        else hi = mid;
      }
      crossings.push((lo + hi) / 2);
    }
    s += step;
  }
  return crossings.length === 2 ? crossings[1]! - crossings[0]! : Number.NaN;
}

/** model-dalembert, single mode: u(x, t) = f(x − ct) with f(s) = sin(κ s) and g = 0. */
const dalembertU = (p: Values) => (x: number, t: number) => Math.sin(p['kappa']! * (x - p['c']! * t));
const X0 = 0.3;
const T0 = 0.7;

// ── The recorded links, each with its check ────────────────────────────────

const LINK_CHECKS: readonly LinkCheck[] = [
  {
    model: 'model-pendulum',
    canonical: 'CE-pendulum-period',
    bindings: {
      period: {
        observable: 'period',
        quantity: 'RK4 period of θ″ + (g/ℓ) sin θ = 0 released at rest from θ0',
        measure: pendulumPeriod,
      },
      length: { parameter: 'ell' },
      gravity: { parameter: 'g' },
    },
    // The entry assumes a small angle; θ0 = 1e-3 puts the amplitude correction θ0²/16 near 6e-8.
    samples: [
      { g: 9.81, ell: 1, theta0: 1e-3 },
      { g: 9.81, ell: 4, theta0: 1e-3 },
      { g: 2, ell: 1, theta0: 1e-3 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-lc',
    canonical: 'CE-lc-resonance',
    bindings: {
      'angular-frequency': {
        observable: 'q',
        quantity: '2π / RK4 period of L q″ + q/C = 0',
        measure: lcAngularFrequency,
      },
      inductance: { parameter: 'L' },
      capacitance: { parameter: 'C' },
    },
    samples: [
      { L: 1, C: 1 },
      { L: 0.25, C: 3 },
      { L: 5, C: 0.1 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-dalembert',
    canonical: 'CE-wave-speed',
    bindings: {
      speed: { parameter: 'c' },
      frequency: {
        observable: 'u',
        quantity: '1 / period of u(x₀, t), the single mode f(s) = sin(κ s), g = 0',
        measure: (p) => 1 / crossingPeriod((t) => dalembertU(p)(X0, t), 0, 1e-3 / (p['kappa']! * p['c']!)),
      },
      wavelength: {
        observable: 'u',
        quantity: 'period in x of u(x, t₀), the same mode',
        measure: (p) => crossingPeriod((x) => dalembertU(p)(x, T0), 0, 1e-3 / p['kappa']!),
      },
    },
    samples: [
      { c: 1.5, kappa: 2 },
      { c: 340, kappa: 0.7 },
      { c: 0.2, kappa: 9 },
    ],
    tolerance: 1e-9,
  },
];

/** The links that predate the check, by `model → canonical`. This list may only shrink. */
const UNCHECKED_BEFORE_THE_RULE = [
  'model-spring → CE-simple-harmonic-frequency',
  'model-spring → CE-spring-potential-energy',
  'model-spring → CE-oscillator-energy',
  'model-wave-1d → CE-wave-speed',
  'model-heat → CE-thermal-diffusivity',
  'model-stokes-drag → CE-stokes-drag',
  'model-string → CE-string-wave-speed',
  'model-sound → CE-sound-speed',
] as const;

const key = (model: string, canonical: string) => `${model} → ${canonical}`;
const recorded = MODELS.flatMap((m) => m.canonicalRefs.map((ref) => key(m.id, ref)));

describe('canonicalRefs: a link is added only with a check that derives it from the model', () => {
  it.each(LINK_CHECKS.map((c) => [key(c.model, c.canonical), c] as const))('%s: the check passes', (_, c) => {
    const verdict = checkLink(c);
    expect(verdict, verdict.ok ? '' : verdict.reason).toMatchObject({ ok: true });
  });

  it('every check describes a link the model records', () => {
    for (const c of LINK_CHECKS) expect(recorded).toContain(key(c.model, c.canonical));
  });

  it('every recorded link has a passing check or predates the rule', () => {
    const checked = new Set(LINK_CHECKS.map((c) => key(c.model, c.canonical)));
    const unaccounted = recorded.filter((k) => !checked.has(k) && !(UNCHECKED_BEFORE_THE_RULE as readonly string[]).includes(k));
    expect(unaccounted).toEqual([]);
    for (const k of UNCHECKED_BEFORE_THE_RULE) expect(recorded).toContain(k);
    for (const k of UNCHECKED_BEFORE_THE_RULE) expect(checked.has(k)).toBe(false);
  });
});

describe('controls: the check fails on a wrong link', () => {
  const pendulum = LINK_CHECKS.find((c) => c.model === 'model-pendulum')!;

  it('a planted π prefactor (T = π√(ℓ/g)) fails', () => {
    expect(checkLink(pendulum, Math.PI)).toMatchObject({ ok: false });
  });

  it('swapped exponents fail: length and gravity bound the other way round are refused by dimension', () => {
    const swapped = { ...pendulum, bindings: { ...pendulum.bindings, length: { parameter: 'g' }, gravity: { parameter: 'ell' } } };
    expect(checkLink(swapped)).toMatchObject({ ok: false, reason: expect.stringMatching(/not a parameter of model-pendulum with its dimension/) });
  });

  it('the small-angle assumption is load-bearing: at θ0 = 0.5 the same check fails', () => {
    const wide = { ...pendulum, samples: pendulum.samples.map((s) => ({ ...s, theta0: 0.5 })) };
    const v = checkLink(wide);
    expect(v).toMatchObject({ ok: false });
  });

  it('model-rlc → CE-lc-resonance fails at ζ = 0.2, and passes at R = 0, so the failure is the damping', () => {
    const rlc: LinkCheck = {
      model: 'model-rlc',
      canonical: 'CE-lc-resonance',
      bindings: {
        'angular-frequency': { observable: 'q', quantity: '2π / RK4 period of L q″ + R q′ + q/C = 0', measure: rlcAngularFrequency },
        inductance: { parameter: 'L' },
        capacitance: { parameter: 'C' },
      },
      // ζ = (R/2)√(C/L) = 0.2 at every sample.
      samples: [
        { L: 1, R: 0.4, C: 1 },
        { L: 0.25, R: 0.4 * Math.sqrt(0.25 / 3), C: 3 },
      ],
      tolerance: 1e-6,
    };
    expect(checkLink(rlc)).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
    expect(checkLink({ ...rlc, samples: rlc.samples.map((s) => ({ ...s, R: 0 })) })).toMatchObject({ ok: true });
  });

  it('an entry with no sourced prefactor cannot be checked: model-damped-spring → CE-simple-harmonic-frequency', () => {
    const damped: LinkCheck = {
      model: 'model-damped-spring',
      canonical: 'CE-simple-harmonic-frequency',
      bindings: {
        'angular-velocity': {
          observable: 'x',
          quantity: '2π / RK4 period of m x″ + b x′ + k x = 0',
          measure: (p) => (2 * Math.PI) / releasePeriod((x, v) => -(p['b']! * v + p['k']! * x) / p['m']!, 1, Math.sqrt(p['m']! / p['k']!)),
        },
        'spring-constant': { parameter: 'k' },
        mass: { parameter: 'm' },
      },
      samples: [{ m: 1, b: 0.4, k: 1 }],
      tolerance: 1e-6,
    };
    expect(checkLink(damped)).toMatchObject({ ok: false, reason: expect.stringMatching(/no sourced prefactor/) });
  });

  it('a link to an entry whose variables the model does not have is refused: model-pendulum → CE-kepler-third', () => {
    const kepler = { ...pendulum, canonical: 'CE-kepler-third' };
    expect(checkLink(kepler)).toMatchObject({ ok: false, reason: expect.stringMatching(/are not the entry's variables/) });
  });

  it('a relation read only from parameters is refused: nothing would be computed from the model', () => {
    const dalembert = LINK_CHECKS.find((c) => c.model === 'model-dalembert')!;
    const base = MODELS.find((m) => m.id === 'model-dalembert')!;
    const withProfileParameters: AtlasModel = {
      ...base,
      parameters: [...base.parameters, { name: 'f0', dim: FREQUENCY }, { name: 'lambda0', dim: LENGTH }],
    };
    const noDynamics = { ...dalembert, bindings: { speed: { parameter: 'c' }, frequency: { parameter: 'f0' }, wavelength: { parameter: 'lambda0' } } };
    expect(checkLink(noDynamics, undefined, [withProfileParameters])).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/nothing is computed from the model/),
    });
  });
});
