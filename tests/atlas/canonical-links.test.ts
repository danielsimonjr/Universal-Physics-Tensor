/**
 * An `AtlasModel.canonicalRefs` link is evidence only when a numeric check
 * derives the canonical relation from the MODEL: every canonical variable is
 * bound to a model parameter of the same dimension or to a quantity computed
 * from the model's own dynamics, and the canonical relation (its AST, or its
 * monomial times the sourced prefactor of `src/composition/canonical-prefactors.ts`)
 * must reproduce the computed quantity at several parameter points.
 *
 * A link added without such a check fails the ratchet below. The eight links
 * that predated the rule are now each checked, so its list is empty and must
 * stay so. A model that records no link carries a stated reason in
 * `NO_LINK_REASONS`; the reasons a check can show are shown by one.
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
import { canonicalGroupPrefactor, canonicalPrefactor, CANONICAL_GROUP_PREFACTORS } from '../../src/composition/canonical-prefactors.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import type { AtlasModel } from '../../src/atlas/model.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { FREQUENCY, LENGTH, VELOCITY } from '../../src/dimensional/types.js';

type Values = Readonly<Record<string, number>>;

type Binding =
  | { readonly parameter: string }
  | { readonly observable: string; readonly quantity: string; readonly measure: (p: Values) => number }
  /** An experiment input read from the sample (a speed, a displacement), not a model parameter. */
  | { readonly datum: string; readonly dim: Dimension; readonly quantity: string };

interface LinkCheck {
  readonly model: string;
  readonly canonical: string;
  /** Every canonical variable (target and governing) → what supplies it. */
  readonly bindings: Readonly<Record<string, Binding>>;
  /** Parameter points; keys beyond the model's parameters fix the initial data. */
  readonly samples: readonly Values[];
  /** Largest relative error |computed − canonical| / |canonical| accepted. */
  readonly tolerance: number;
  /** The model's dimensionless input that supplies a group prefactor (`CANONICAL_GROUP_PREFACTORS`). */
  readonly group?: string;
}

type Verdict = { readonly ok: true; readonly worst: number } | { readonly ok: false; readonly reason: string };

const MODELS = ATLAS_FAMILIES.flatMap((f) => f.models);
const DIM_KEYS = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
const sameDim = (a: Dimension, b: Dimension): boolean => DIM_KEYS.every((k) => (a[k] ?? 0) === (b[k] ?? 0));
const DIMENSIONLESS_DIM = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as Dimension;

/**
 * `plantedPrefactor` replaces the entry's factor and `perturb` multiplies the
 * canonical value: both exist so a control can show the check fails on a wrong relation.
 */
function checkLink(c: LinkCheck, plantedPrefactor?: number, models: readonly AtlasModel[] = MODELS, perturb = 1): Verdict {
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
    } else if ('datum' in b) {
      if (model.parameters.some((q) => q.name === b.datum)) {
        return { ok: false, reason: `${v.name} reads the datum '${b.datum}', which is a parameter of ${c.model}: bind the parameter` };
      }
      if (!sameDim(b.dim, v.dim)) return { ok: false, reason: `${v.name} reads the datum '${b.datum}' with another dimension` };
    } else if (!model.observables.includes(b.observable)) {
      return { ok: false, reason: `${v.name} is measured from '${b.observable}', not an observable of ${c.model}` };
    }
  }
  if (Object.values(c.bindings).every((b) => !('measure' in b))) {
    return { ok: false, reason: 'nothing is computed from the model: every variable is a parameter' };
  }
  const grouped = CANONICAL_GROUP_PREFACTORS.some((p) => p.id === entry.id);
  if (grouped && plantedPrefactor === undefined) {
    if (c.group === undefined) return { ok: false, reason: `${entry.id}'s prefactor is a power of a group the check binds to nothing` };
    if (!model.dimensionlessInputs.includes(c.group)) {
      return { ok: false, reason: `${entry.id}'s group is bound to '${c.group}', not a dimensionless input of ${c.model}` };
    }
  }
  const constant =
    plantedPrefactor ?? (entry.epistemicStatus === 'fully-quantitative' ? 1 : canonicalPrefactor(entry.id));
  if (constant === undefined && !grouped) {
    return { ok: false, reason: `${entry.id} has no sourced prefactor, so its relation is known only up to a constant` };
  }
  const factorAt = (sample: Values): number => constant ?? canonicalGroupPrefactor(entry.id, sample[c.group!]!)!;
  const monomial = entry.dimensional.monomial;
  if (entry.scalarAst === undefined && monomial === null) {
    return { ok: false, reason: `${entry.id} records neither an AST nor a monomial` };
  }
  let worst = 0;
  for (const sample of c.samples) {
    const value = (name: string): number => {
      const b = c.bindings[name]!;
      if ('parameter' in b) return sample[b.parameter]!;
      return 'datum' in b ? sample[b.datum]! : b.measure(sample);
    };
    const governing = Object.fromEntries(entry.dimensional.governing.map((g) => [g.name, value(g.name)]));
    const canonical =
      perturb *
      factorAt(sample) *
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

/** model-spring: m x″ + k x = 0, angular frequency 2π / period. */
const springAngularFrequency = (p: Values): number =>
  (2 * Math.PI) / releasePeriod((x) => -(p['k']! / p['m']!) * x, 1, Math.sqrt(p['m']! / p['k']!));

/** Composite Simpson's rule on [a, b] with n (even) panels. */
function simpson(fn: (s: number) => number, a: number, b: number, n = 1000): number {
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) sum += (i % 2 === 1 ? 4 : 2) * fn(a + i * h);
  return (sum * h) / 3;
}

/**
 * The largest x of a second-order oscillator launched from x = 0 at speed v0:
 * RK4 until x′ first turns negative, then the vertex of the parabola through
 * the three steps around the turning point.
 */
function launchAmplitude(accel: (x: number, v: number) => number, v0: number, scale: number): number {
  const dt = scale / 4000;
  const xs: number[] = [0];
  let y = [0, v0];
  for (let i = 0; i < 4000 * 100; i++) {
    const next = rk4(([x, v]) => [v!, accel(x!, v!)], y, dt);
    xs.push(next[0]!);
    if (next[1]! < 0) {
      const n = xs.length - 1;
      const [a, b, c] = [xs[n - 2]!, xs[n - 1]!, xs[n]!];
      return b - (c - a) ** 2 / (8 * (c - 2 * b + a));
    }
    y = next;
  }
  return Number.NaN;
}

/**
 * The model's own spatial operator applied to the mode sin(κx), as a multiple
 * of the mode: the central second difference at κx = 0.9, over sin(0.9). For
 * u_xx it tends to −κ²; the step h = 10⁻³/κ puts the error near 10⁻⁷.
 */
function modeLaplacian(kappa: number): number {
  const x = 0.9 / kappa;
  const h = 1e-3 / kappa;
  const f = (s: number) => Math.sin(kappa * s);
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h) / f(x);
}

/**
 * f·λ of the standing mode a(t) sin(κx) of a_tt = s² (∂²/∂x²): f from the RK4
 * period of a″ = s²·modeLaplacian(κ)·a, λ from the period in x of sin(κx).
 */
function modeSpeed(speedSquared: number, kappa: number): number {
  const f = 1 / releasePeriod((a) => speedSquared * modeLaplacian(kappa) * a, 1, 1 / (Math.sqrt(speedSquared) * kappa));
  const lambda = crossingPeriod((x) => Math.sin(kappa * x), 0, 1e-3 / kappa);
  return f * lambda;
}

/**
 * model-heat: the decay rate of the mode a(t) sin(πx/ℓ) under
 * ρ c_p a′ = κ·modeLaplacian(π/ℓ)·a (RK4 over one e-fold), over (π/ℓ)².
 */
function heatDiffusivity(p: Values): number {
  const q = Math.PI / p['ell']!;
  const rate = (p['kappa']! / (p['rho']! * p['cp']!)) * -modeLaplacian(q);
  const tEnd = 1 / rate;
  const steps = 4000;
  let y = [1];
  for (let i = 0; i < steps; i++) y = rk4(([a]) => [-rate * a!], y, tEnd / steps);
  return -Math.log(y[0]!) / tEnd / (q * q);
}
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
  {
    model: 'model-spring',
    canonical: 'CE-simple-harmonic-frequency',
    bindings: {
      'angular-velocity': { observable: 'x', quantity: '2π / RK4 period of m x″ + k x = 0', measure: springAngularFrequency },
      'spring-constant': { parameter: 'k' },
      mass: { parameter: 'm' },
    },
    samples: [
      { m: 1, k: 1 },
      { m: 0.25, k: 3 },
      { m: 5, k: 0.1 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-spring',
    canonical: 'CE-spring-potential-energy',
    bindings: {
      'spring-potential-energy': {
        observable: 'energy',
        quantity: 'the work against the restoring force k s of m x″ = −k x from 0 to x, by Simpson quadrature',
        measure: (p) => simpson((s) => p['k']! * s, 0, p['x']!),
      },
      'spring-constant': { parameter: 'k' },
      displacement: { datum: 'x', dim: LENGTH, quantity: 'the displacement the energy is stored at' },
    },
    samples: [
      { m: 1, k: 1, x: 1 },
      { m: 2, k: 40, x: 0.03 },
      { m: 0.1, k: 0.5, x: -2 },
    ],
    tolerance: 1e-9,
  },
  {
    model: 'model-spring',
    canonical: 'CE-oscillator-energy',
    bindings: {
      'oscillator-energy': {
        observable: 'energy',
        // The ½ of the kinetic energy is CE-kinetic-energy's sourced prefactor, a premise of this check.
        quantity: 'the launch kinetic energy ½ m v0² of a mass launched from x = 0',
        measure: (p) => 0.5 * p['m']! * p['v0']! ** 2,
      },
      'spring-constant': { parameter: 'k' },
      amplitude: {
        observable: 'x',
        quantity: 'the largest x of the RK4 trajectory of m x″ + k x = 0 launched from x = 0 at v0',
        measure: (p) => launchAmplitude((x) => -(p['k']! / p['m']!) * x, p['v0']!, Math.sqrt(p['m']! / p['k']!)),
      },
    },
    samples: [
      { m: 1, k: 1, v0: 1 },
      { m: 0.25, k: 3, v0: 0.2 },
      { m: 5, k: 0.1, v0: 7 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-lc',
    canonical: 'CE-capacitor-energy',
    bindings: {
      energy: {
        observable: 'energy',
        quantity: 'the work to charge the capacitor against the q/C term of L q″ + q/C = 0, from 0 to q, by Simpson quadrature',
        measure: (p) => simpson((s) => s / p['C']!, 0, p['q']!),
      },
      capacitance: { parameter: 'C' },
      voltage: { observable: 'q', quantity: 'the capacitor voltage q/C, the q/C term of the model', measure: (p) => p['q']! / p['C']! },
    },
    samples: [
      { L: 1, C: 1, q: 1 },
      { L: 0.25, C: 3e-6, q: 2e-5 },
      { L: 5, C: 0.1, q: -0.7 },
    ],
    tolerance: 1e-9,
  },
  {
    model: 'model-wave-1d',
    canonical: 'CE-wave-speed',
    bindings: {
      speed: { parameter: 'c' },
      frequency: {
        observable: 'u',
        quantity: '1 / RK4 period of the mode amplitude a″ = c²·(the central difference of sin(κx))·a',
        measure: (p) => 1 / releasePeriod((a) => p['c']! ** 2 * modeLaplacian(p['kappa']!) * a, 1, 1 / (p['c']! * p['kappa']!)),
      },
      wavelength: {
        observable: 'u',
        quantity: 'the period in x of the mode profile sin(κx)',
        measure: (p) => crossingPeriod((x) => Math.sin(p['kappa']! * x), 0, 1e-3 / p['kappa']!),
      },
    },
    samples: [
      { c: 1.5, kappa: 2 },
      { c: 340, kappa: 0.7 },
      { c: 0.2, kappa: 9 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-heat',
    canonical: 'CE-thermal-diffusivity',
    bindings: {
      'thermal-diffusivity': {
        observable: 'T(x, t)',
        quantity: 'the RK4 decay rate of the mode sin(πx/ℓ) of ρ c_p T_t = κ T_xx, over (π/ℓ)²',
        measure: heatDiffusivity,
      },
      'thermal-conductivity': { parameter: 'kappa' },
      density: { parameter: 'rho' },
      'specific-heat-capacity': { parameter: 'cp' },
    },
    // Copper, water, and unit values.
    samples: [
      { kappa: 400, rho: 8960, cp: 385, ell: 0.1 },
      { kappa: 0.6, rho: 1000, cp: 4186, ell: 0.01 },
      { kappa: 1, rho: 1, cp: 1, ell: 1 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-stokes-drag',
    canonical: 'CE-stokes-drag',
    bindings: {
      force: {
        observable: 'drag force F',
        // The model is itself a closed-form law, so this is a transcription: it checks the
        // model's prefactor and exponents against the sourced ones, and nothing dynamical.
        quantity: '|F| of the model law F = −6π η a v at the sampled speed',
        measure: (p) => 6 * Math.PI * p['eta']! * p['a']! * p['v']!,
      },
      viscosity: { parameter: 'eta' },
      radius: { parameter: 'a' },
      speed: { datum: 'v', dim: VELOCITY, quantity: 'the speed of the sphere' },
    },
    samples: [
      { eta: 1e-3, a: 1e-6, v: 1e-5 },
      { eta: 1.5, a: 0.01, v: 0.002 },
      { eta: 1, a: 1, v: 1 },
    ],
    tolerance: 1e-12,
  },
  {
    model: 'model-string',
    canonical: 'CE-string-wave-speed',
    bindings: {
      speed: {
        observable: 'y',
        quantity: 'f·λ of the mode a(t) sin(κx) of μ y_tt = F y_xx: f by RK4 of μ a″ = F·(central difference)·a',
        measure: (p) => modeSpeed(p['F']! / p['mu']!, p['kappa']!),
      },
      tension: { parameter: 'F' },
      'linear-density': { parameter: 'mu' },
    },
    // A steel guitar string, a heavy rope, unit values.
    samples: [
      { F: 70, mu: 4e-4, kappa: 5 },
      { F: 200, mu: 1.2, kappa: 0.4 },
      { F: 1, mu: 1, kappa: 3 },
    ],
    tolerance: 1e-6,
  },
  {
    model: 'model-sound',
    canonical: 'CE-sound-speed',
    bindings: {
      speed: {
        observable: 'p′',
        quantity: 'f·λ of the mode a(t) sin(κx) of p′_tt = (γ p₀/ρ₀) p′_xx',
        measure: (p) => modeSpeed((p['gamma']! * p['p0']!) / p['rho0']!, p['kappa']!),
      },
      pressure: { parameter: 'p0' },
      density: { parameter: 'rho0' },
    },
    group: 'gamma',
    // Air and helium at one atmosphere, and γ = 1.
    samples: [
      { rho0: 1.204, p0: 101325, gamma: 1.4, kappa: 2 },
      { rho0: 0.1664, p0: 101325, gamma: 5 / 3, kappa: 0.5 },
      { rho0: 1, p0: 1, gamma: 1, kappa: 3 },
    ],
    tolerance: 1e-6,
  },
];

/**
 * The links that predated the check, by `model → canonical`. All eight are now
 * checked above, so the list is empty; it may only shrink, so it stays empty.
 */
const UNCHECKED_BEFORE_THE_RULE: readonly string[] = [];

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
    expect(UNCHECKED_BEFORE_THE_RULE).toEqual([]);
    for (const k of UNCHECKED_BEFORE_THE_RULE) expect(recorded).toContain(k);
    for (const k of UNCHECKED_BEFORE_THE_RULE) expect(checked.has(k)).toBe(false);
  });
});

describe('controls: the check fails on a wrong link', () => {
  const pendulum = LINK_CHECKS.find((c) => c.model === 'model-pendulum')!;
  const find = (model: string, canonical: string) => LINK_CHECKS.find((c) => c.model === model && c.canonical === canonical)!;

  it.each(LINK_CHECKS.map((c) => [key(c.model, c.canonical), c] as const))('%s: fails when the canonical value is 0.1% off', (_, c) => {
    expect(checkLink(c, undefined, MODELS, 1.001)).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
  });

  it('ω = 2π√(k/m), the frequency f mistaken for ω, fails model-spring → CE-simple-harmonic-frequency', () => {
    expect(checkLink(find('model-spring', 'CE-simple-harmonic-frequency'), 2 * Math.PI)).toMatchObject({ ok: false });
  });

  it('U = k x² and E = k A², without the ½, fail', () => {
    expect(checkLink(find('model-spring', 'CE-spring-potential-energy'), 1)).toMatchObject({ ok: false });
    expect(checkLink(find('model-spring', 'CE-oscillator-energy'), 1)).toMatchObject({ ok: false });
    expect(checkLink(find('model-lc', 'CE-capacitor-energy'), 1)).toMatchObject({ ok: false });
  });

  it("Newton's isothermal sound speed √(p/ρ) fails at γ = 1.4, and passes where every sample has γ = 1", () => {
    const sound = find('model-sound', 'CE-sound-speed');
    expect(checkLink(sound, 1)).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
    expect(checkLink({ ...sound, samples: sound.samples.map((s) => ({ ...s, gamma: 1 })) }, 1)).toMatchObject({ ok: true });
  });

  it('the √γ is derived a second way: model-euler-linear closed by model-adiabatic-eos gives the same speed', () => {
    // ρ′ = r(t) sin κx, v = w(t) cos κx in ∂ρ′/∂t = −ρ₀ ∂v/∂x and ρ₀ ∂v/∂t = −∂p′/∂x, with
    // p′ = (dp/dρ at ρ₀) ρ′ and dp/dρ the central difference of p₀ (ρ/ρ₀)^γ. c_s² is never written.
    for (const s of find('model-sound', 'CE-sound-speed').samples) {
      const eos = (rho: number) => s['p0']! * (rho / s['rho0']!) ** s['gamma']!;
      const h = s['rho0']! * 1e-5;
      const slope = (eos(s['rho0']! + h) - eos(s['rho0']! - h)) / (2 * h);
      const kappa = s['kappa']!;
      const scale = 1 / (kappa * Math.sqrt(slope));
      const dt = scale / 4000;
      let y = [1, 0];
      let t = 0;
      let period = Number.NaN;
      let left = false;
      for (let i = 0; i < 4000 * 100; i++) {
        const next = rk4(([r, w]) => [s['rho0']! * kappa * w!, -(slope * kappa * r!) / s['rho0']!], y, dt);
        if (next[1]! < 0) left = true;
        if (left && next[1]! >= 0) {
          period = 2 * (t + (dt * -y[1]!) / (next[1]! - y[1]!));
          break;
        }
        y = next;
        t += dt;
      }
      const speed = ((2 * Math.PI) / kappa) / period;
      const canonical = canonicalGroupPrefactor('CE-sound-speed', s['gamma']!)! * Math.sqrt(s['p0']! / s['rho0']!);
      expect(Math.abs(speed - canonical) / canonical).toBeLessThan(1e-6);
    }
  });
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

  it('model-damped-spring → CE-simple-harmonic-frequency fails at ζ = 0.2, and passes at b = 0, so the failure is the damping', () => {
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
      // ζ = b / (2√(mk)) = 0.2 at every sample.
      samples: [
        { m: 1, b: 0.4, k: 1 },
        { m: 0.25, b: 0.4 * Math.sqrt(0.75), k: 3 },
      ],
      tolerance: 1e-6,
    };
    expect(checkLink(damped)).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
    expect(checkLink({ ...damped, samples: damped.samples.map((s) => ({ ...s, b: 0 })) })).toMatchObject({ ok: true });
  });

  it('model-lc → CE-inductor-energy is the work to charge, which is ½ L I²', () => {
    const inductive: LinkCheck = {
      model: 'model-lc',
      canonical: 'CE-inductor-energy',
      bindings: {
        energy: {
          observable: 'energy',
          quantity: 'the work to charge the capacitor to the release charge q0',
          measure: (p) => simpson((s) => s / p['C']!, 0, p['q0']!),
        },
        inductance: { parameter: 'L' },
        current: {
          observable: 'q′',
          quantity: 'the largest current of L q″ + q/C = 0 released at rest from q0',
          measure: (p) => launchAmplitude((q) => -q / (p['L']! * p['C']!), p['q0']! / (p['L']! * p['C']!), Math.sqrt(p['L']! * p['C']!)),
        },
      },
      samples: [{ L: 1, C: 1, q0: 1 }],
      tolerance: 1e-6,
    };
    expect(checkLink(inductive)).toMatchObject({ ok: true });
    const withoutTheHalf: LinkCheck = {
      ...inductive,
      bindings: {
        ...inductive.bindings,
        energy: {
          observable: 'energy',
          quantity: 'twice the work to charge, which drops the ½',
          measure: (p) => simpson((s) => (2 * s) / p['C']!, 0, p['q0']!),
        },
      },
    };
    expect(checkLink(withoutTheHalf)).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
  });

  it('a group prefactor with no group bound is refused, and so is a group that is not a dimensionless input', () => {
    const sound = LINK_CHECKS.find((c) => c.model === 'model-sound')!;
    const { group: _dropped, ...noGroup } = sound;
    expect(checkLink(noGroup)).toMatchObject({ ok: false, reason: expect.stringMatching(/a group the check binds to nothing/) });
    expect(checkLink({ ...sound, group: 'kappa' })).toMatchObject({ ok: false, reason: expect.stringMatching(/not a dimensionless input of model-sound/) });
  });

  it('a datum that is a model parameter is refused: the parameter must be bound', () => {
    const stokes = LINK_CHECKS.find((c) => c.model === 'model-stokes-drag')!;
    const asDatum = { ...stokes, bindings: { ...stokes.bindings, radius: { datum: 'a', dim: LENGTH, quantity: 'the radius' } } };
    expect(checkLink(asDatum)).toMatchObject({ ok: false, reason: expect.stringMatching(/which is a parameter of model-stokes-drag/) });
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

/**
 * Why each model that records no link records none. Where a check can show the
 * reason, a test below runs it; the others state what the registry lacks.
 */
const NO_LINK_REASONS: Readonly<Record<string, string>> = {
  'model-damped-spring':
    'CE-simple-harmonic-frequency is the undamped frequency; at ζ = 0.2 the damped period is off by 2% (the check fails, and passes at b = 0)',
  'model-rlc': 'CE-lc-resonance is the undamped frequency; at ζ = 0.2 the check fails, and passes at R = 0',
  'model-chain':
    'its frequencies are 2√(κ/m)|sin(qa/2)|; no entry records a lattice dispersion, and CE-simple-harmonic-frequency equals it only at qa = π/3, a coincidence',
  'model-cubic-spring':
    'CE-simple-harmonic-frequency holds only as β x0²/k → 0, the bridge to model-spring, which carries the link; at β x0²/k = 0.1 the check fails',
  'model-first-order': 'no entry records the relaxation time b/k (CE-rc-time-constant is τ = RC, in other variables)',
  'model-random-walk': 'no entry records the lattice diffusion coefficient Δx²/(2Δt)',
  'model-fick': "no entry records Fick's law or a diffusion length; D is a parameter, so nothing about it would be computed",
  'model-schrodinger-free':
    'CE-de-broglie would need p from the operator −iħ∂x, which already contains λ = h/p (circular); CE-uncertainty-principle is an inequality and the check compares equalities',
  'model-langevin':
    'the model carries k_B T as one parameter kT where CE-equipartition and CE-stokes-einstein carry k_B and T apart; CE-equipartition counts three degrees of freedom, the model one; CE-stokes-einstein needs η and r, the model has γ',
  'model-telegraph': 'no entry records the Cattaneo signal speed √(D/τ) or its mode decay rates',
  'model-laplace-1d': "no entry records Fourier's law or a steady conduction profile; the model's one parameter is ℓ",
  'model-euler-linear':
    'the sound speed needs the closure dp/dρ, which this model lacks; closed by model-adiabatic-eos it is model-sound, which carries the link (the √γ is derived that way above)',
  'model-adiabatic-eos': 'an equation of state has no speed of its own; see model-euler-linear',
  'model-klein-gordon':
    'its phase velocity √(c² + ω0²/k²) is not c, so CE-wave-speed with speed = c fails; no entry records the Klein–Gordon dispersion',
  'model-stiff-string': 'dispersive: its phase velocity √(F/μ + (EI/μ)k²) is not √(F/μ); no entry records the inharmonic dispersion',
};

describe('every model without a link states why', () => {
  it('the reasons cover exactly the models that record no canonicalRefs', () => {
    const unlinked = MODELS.filter((m) => m.canonicalRefs.length === 0).map((m) => m.id).sort();
    expect(Object.keys(NO_LINK_REASONS).sort()).toEqual(unlinked);
    for (const [id, reason] of Object.entries(NO_LINK_REASONS)) expect(reason.length, id).toBeGreaterThan(20);
  });

  it('model-cubic-spring → CE-simple-harmonic-frequency passes as β x0²/k → 0 and fails at β x0²/k = 0.1', () => {
    const cubic = (ratio: number): LinkCheck => ({
      model: 'model-cubic-spring',
      canonical: 'CE-simple-harmonic-frequency',
      bindings: {
        'angular-velocity': {
          observable: 'x',
          quantity: '2π / RK4 period of m x″ + k x + β x³ = 0 released at rest from x0',
          measure: (p) =>
            (2 * Math.PI) /
            releasePeriod((x) => -(p['k']! * x + p['beta']! * x ** 3) / p['m']!, p['x0']!, Math.sqrt(p['m']! / p['k']!)),
        },
        'spring-constant': { parameter: 'k' },
        mass: { parameter: 'm' },
      },
      samples: [
        { m: 1, k: 1, beta: ratio, x0: 1 },
        { m: 0.25, k: 3, beta: 3 * ratio / 0.04, x0: 0.2 },
      ],
      tolerance: 1e-6,
    });
    expect(checkLink(cubic(1e-8))).toMatchObject({ ok: true });
    expect(checkLink(cubic(0.1))).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
  });

  it('model-klein-gordon → CE-wave-speed with speed = c fails where ω0 ≠ 0, and passes at ω0 = 0', () => {
    const kg = (omega0: number): LinkCheck => ({
      model: 'model-klein-gordon',
      canonical: 'CE-wave-speed',
      bindings: {
        speed: { parameter: 'c' },
        frequency: {
          observable: 'u',
          quantity: '1 / RK4 period of the mode amplitude a″ = (c²·(central difference of sin κx) − ω0²)·a',
          measure: (p) =>
            1 / releasePeriod((a) => (p['c']! ** 2 * modeLaplacian(p['kappa']!) - p['omega0']! ** 2) * a, 1, 1 / (p['c']! * p['kappa']!)),
        },
        wavelength: {
          observable: 'u',
          quantity: 'the period in x of sin(κx)',
          measure: (p) => crossingPeriod((x) => Math.sin(p['kappa']! * x), 0, 1e-3 / p['kappa']!),
        },
      },
      samples: [
        { c: 1, omega0, kappa: 2 },
        { c: 3, omega0: 2 * omega0, kappa: 0.5 },
      ],
      tolerance: 1e-6,
    });
    expect(checkLink(kg(1))).toMatchObject({ ok: false, reason: expect.stringMatching(/relative error .* exceeds/) });
    expect(checkLink(kg(0))).toMatchObject({ ok: true });
  });
});