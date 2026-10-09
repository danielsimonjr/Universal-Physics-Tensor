/**
 * Curvature of a few exact metrics for `upt metric`.
 *
 * The line element is mostly-plus, (−,+,+,+), the signature of the
 * Schwarzschild fixture in this repo. The canonical Einstein-equation metric
 * node uses the same mostly-plus signature. The Kretschmann scalar does not
 * depend on that choice.
 *
 * Schwarzschild and Kerr Christoffel symbols are closed forms; the Kerr
 * ones come from the analytic metric derivatives through the one Christoffel
 * builder (`computeChristoffelTensor`). Riemann, Ricci and Kretschmann are
 * the finite-difference curvature stack of `curvature-lowering-helpers.ts`
 * (`christoffelAt`, `riemannUpperAt`, `lowerFirstIndex`) and
 * `computeKretschmann`, checked in tests against the closed forms
 * (Schwarzschild Kretschmann, flat-dust FLRW Ricci scalar, Kerr
 * Kretschmann). The metric inverse is MathTS `inv`. Kerr geodesics in
 * Boyer–Lindquist coordinates, including inclined ones, take their initial
 * data from the Carter constant and are integrated with the second-order
 * geodesic equation by `integrateGeodesic` (`geodesic-integrator.ts`).
 * This module holds no curvature or geodesic arithmetic of its own.
 *
 * @module numerical/spacetime-metrics
 * @internal
 */

import { det, inv } from '@danielsimonjr/mathts-functions';
import { C_SI, G_SI, M_SUN_SI } from '../core/constants.js';
import { DIMENSIONLESS, LENGTH, MASS, MASS_DENSITY, TIME, VELOCITY, type Dimension } from '../dimensional/types.js';
import { UnitError } from '../dimensional/units.js';
import { readParameter } from './binding-value.js';
import { computeChristoffelTensor } from './connection-lowering-helpers.js';
import { christoffelAt, lowerFirstIndex, riemannUpperAt } from './curvature-lowering-helpers.js';
import { integrateGeodesic as integrateGeodesicRK4 } from './geodesic-integrator.js';
import { computeKretschmann } from './kretschmann.js';
import { MathTSEngine } from './mathts-engine.js';
import type { NestedArray } from './types.js';

/** Coordinate order (t, r, θ, φ). */
type Pt = [number, number, number, number];

/** The signature this module differentiates; `CurvatureReport.signature` is its type. */
export const METRIC_SIGNATURE = '(-,+,+,+)';

/**
 * Printed with every curvature report. The line element and the canonical
 * Einstein-equation metric node share this mostly-plus signature.
 */
const METRIC_SIGNATURE_NOTE =
  'Line element signature (−,+,+,+), the same mostly-plus signature as the Schwarzschild fixture ' +
  'and as the canonical Einstein-equation metric node. ' +
  'The Kretschmann scalar does not depend on that choice.';

/** The spacetime metrics the curvature reports cover. */
export type MetricId = 'minkowski' | 'schwarzschild' | 'flrw' | 'kerr';

/** One nonzero component, for text output. @internal */
export interface Component {
  readonly index: string;
  readonly value: number;
}

/** What `upt metric` prints. @internal */
export interface CurvatureReport {
  readonly metric: MetricId;
  readonly signature: typeof METRIC_SIGNATURE;
  readonly signatureNote: string;
  readonly coordinates: string;
  readonly parameters: Readonly<Record<string, number>>;
  readonly point: Readonly<Record<string, number>>;
  readonly christoffel: readonly Component[];
  readonly ricci: readonly Component[];
  readonly ricciScalar: number;
  readonly kretschmann: number;
  /** Closed forms the numeric tensors are checked against. */
  readonly closedForm: Readonly<Record<string, number>>;
  readonly notes: readonly string[];
}

const Z = 1e-8;

function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

function mat4(): number[][] {
  return [zeros(4), zeros(4), zeros(4), zeros(4)];
}

/** The engine the curvature helpers carry their tensors on. */
const ENGINE = new MathTSEngine();

/**
 * The metric inverse, MathTS `inv`. A singular metric is this module's error,
 * decided by MathTS `det` before the inverse is asked for, so no error text is
 * read. `inv` and `det` are typed over every MathTS matrix kind, so their
 * results are read back as the number and the 4×4 number array they are for a
 * number[][] input.
 */
function invert4(src: number[][]): number[][] {
  const determinant: unknown = det(src);
  if (typeof determinant !== 'number' || !Number.isFinite(determinant) || determinant === 0) {
    throw new Error('metric is singular at this point');
  }
  const out: unknown = inv(src);
  if (!Array.isArray(out) || out.length !== 4) throw new Error('metric inverse is not a 4×4 matrix');
  return out.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== 4) throw new Error('metric inverse is not a 4×4 matrix');
    return row.map((v: unknown) => {
      if (typeof v !== 'number') throw new Error('metric inverse is not a 4×4 matrix');
      return v;
    });
  });
}

type MetricFn = (x: Pt) => number[][];

/** The nested-array closures the curvature helpers take, over a `MetricFn`. */
function closuresOf(g: MetricFn): {
  readonly gFn: (x: ReadonlyArray<number>) => NestedArray;
  readonly gInverseFn: (x: ReadonlyArray<number>) => NestedArray;
} {
  const at = (x: ReadonlyArray<number>): number[][] => g([x[0]!, x[1]!, x[2]!, x[3]!]);
  return { gFn: at, gInverseFn: (x) => invert4(at(x)) };
}

type Gamma = number[][][];

function blankGamma(): Gamma {
  return [0, 1, 2, 3].map(() => mat4());
}

/** Γ^ρ_{μν}(x) by the finite-difference Christoffel of the curvature helpers. */
function christoffelOf(g: MetricFn, x: Pt): Gamma {
  const { gFn, gInverseFn } = closuresOf(g);
  return christoffelAt(x, gFn, gInverseFn, 4, ENGINE);
}

interface Tensors {
  readonly ricciScalar: number;
  readonly kretschmann: number;
  readonly ricci: number[][];
  readonly christoffel: Gamma;
}

/**
 * Christoffel, Ricci, the Ricci scalar and the Kretschmann scalar at `x`:
 * `christoffelAt` and `riemannUpperAt` (the finite-difference Γ and R^ρ_{σμν}
 * of the curvature helpers), the Ricci contraction R_{σν} = R^ρ_{σρν}, and
 * `computeKretschmann` over the lowered Riemann. Checked against the
 * Schwarzschild Kretschmann closed form.
 */
function tensorsOf(g: MetricFn, x: Pt): Tensors {
  const { gFn, gInverseFn } = closuresOf(g);
  const g0 = g(x);
  const gi = invert4(g0);
  const gamma = christoffelAt(x, gFn, gInverseFn, 4, ENGINE);
  const up = riemannUpperAt(x, gFn, gInverseFn, 4, ENGINE, gamma);
  const ricci = mat4();
  for (let sigma = 0; sigma < 4; sigma++) {
    for (let nu = 0; nu < 4; nu++) {
      let s = 0;
      for (let rho = 0; rho < 4; rho++) s += up[rho]![sigma]![rho]![nu]!;
      ricci[sigma]![nu] = s;
    }
  }
  let ricciScalar = 0;
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) ricciScalar += gi[a]![b]! * ricci[a]![b]!;
  }
  const lower = lowerFirstIndex(up, g0.flat(), 4);
  const kretschmann = computeKretschmann(lower, gi);
  return { ricciScalar, kretschmann, ricci, christoffel: gamma };
}

function nonzeroMatrix(m: number[][], label: (i: number, j: number) => string): Component[] {
  const out: Component[] = [];
  const scale = Math.max(1, ...m.flat().map((v) => Math.abs(v)));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const v = m[i]![j]!;
      if (Math.abs(v) > Z * scale) out.push({ index: label(i, j), value: v });
    }
  }
  return out;
}

function nonzeroGamma(G: Gamma): Component[] {
  const names = ['t', 'r', 'θ', 'φ'];
  const out: Component[] = [];
  let scale = 1;
  for (const block of G) for (const row of block) for (const v of row) scale = Math.max(scale, Math.abs(v));
  for (let rho = 0; rho < 4; rho++) {
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = mu; nu < 4; nu++) {
        const v = G[rho]![mu]![nu]!;
        if (Math.abs(v) > Z * scale) {
          out.push({ index: `Γ^${names[rho]}_${names[mu]}${names[nu]}`, value: v });
        }
      }
    }
  }
  return out;
}

function schwarzschildMetric(M: number, c: number, G: number): MetricFn {
  const rs = (2 * G * M) / (c * c);
  return (x) => {
    const r = x[1];
    const th = x[2];
    const f = 1 - rs / r;
    const g = mat4();
    g[0]![0] = -(c * c) * f;
    g[1]![1] = 1 / f;
    g[2]![2] = r * r;
    g[3]![3] = r * r * Math.sin(th) * Math.sin(th);
    return g;
  };
}

/** Schwarzschild Kretschmann 48 G² M² / (c⁴ r⁶). @internal */
export function schwarzschildKretschmann(M: number, r: number, c = C_SI, G = G_SI): number {
  return (48 * G * G * M * M) / (c ** 4 * r ** 6);
}

function flrwScale(t: number, a0: number, t0: number, n: number): { a: number; adot: number; addot: number } {
  const a = a0 * Math.pow(t / t0, n);
  const adot = (n * a) / t;
  const addot = (n * (n - 1) * a) / (t * t);
  return { a, adot, addot };
}

function flrwMetric(a0: number, t0: number, n: number, k: number, c: number): MetricFn {
  return (x) => {
    const { a } = flrwScale(x[0], a0, t0, n);
    const r = x[1];
    const th = x[2];
    const g = mat4();
    g[0]![0] = -(c * c);
    g[1]![1] = (a * a) / (1 - k * r * r);
    g[2]![2] = a * a * r * r;
    g[3]![3] = a * a * r * r * Math.sin(th) * Math.sin(th);
    return g;
  };
}

/** FLRW Ricci scalar 6/c² (ä/a + H² + k c²/a²). @internal */
export function flrwRicciScalar(
  t: number,
  a0: number,
  t0: number,
  n: number,
  k: number,
  r: number,
  c = C_SI,
): number {
  const { a, adot, addot } = flrwScale(t, a0, t0, n);
  const H = adot / a;
  return (6 / (c * c)) * (addot / a + H * H + (k * c * c) / (a * a));
}

/** H² and the Friedmann right-hand side, including curvature and Λ. @internal */
export function friedmannSides(opts: {
  readonly t: number;
  readonly a0: number;
  readonly t0: number;
  readonly n: number;
  readonly k: number;
  readonly r: number;
  readonly rho: number;
  readonly lambda: number;
  readonly c?: number;
  readonly G?: number;
}): { readonly H2: number; readonly rhs: number } {
  const c = opts.c ?? C_SI;
  const G = opts.G ?? G_SI;
  const { a, adot } = flrwScale(opts.t, opts.a0, opts.t0, opts.n);
  const H2 = (adot / a) ** 2;
  const rhs = (8 * Math.PI * G * opts.rho) / 3 - (opts.k * c * c) / (a * a) + (opts.lambda * c * c) / 3;
  return { H2, rhs };
}

function kerrMetric(Mgeom: number, a: number): MetricFn {
  return (x) => {
    const r = x[1];
    const th = x[2];
    const cth = Math.cos(th);
    const sth = Math.sin(th);
    const Sigma = r * r + a * a * cth * cth;
    const Delta = r * r - 2 * Mgeom * r + a * a;
    const g = mat4();
    g[0]![0] = -(1 - (2 * Mgeom * r) / Sigma);
    g[0]![3] = g[3]![0] = -((2 * Mgeom * r * a * sth * sth) / Sigma);
    g[1]![1] = Sigma / Delta;
    g[2]![2] = Sigma;
    g[3]![3] = sth * sth * (r * r + a * a + (2 * Mgeom * r * a * a * sth * sth) / Sigma);
    return g;
  };
}

/**
 * Kerr Kretschmann in geometrized units (G = c = 1), 1/length⁴.
 * M, r and a are lengths. a = 0 is 48 M²/r⁶.
 * @internal
 */
export function kerrKretschmann(M: number, r: number, a: number, theta: number): number {
  const c2 = Math.cos(theta) ** 2;
  const Sigma = r * r + a * a * c2;
  const num =
    48 *
    M *
    M *
    (r * r - a * a * c2) *
    ((r * r + a * a * c2) ** 2 - 16 * r * r * a * a * c2);
  return num / Sigma ** 6;
}

/** A metric parameter that is not a point of the manifold: a mass that is not positive. */
export class MetricMassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetricMassError';
  }
}

/** A mass that is not positive is not a source. */
function requirePositiveMass(M: number): void {
  if (!(M > 0)) throw new MetricMassError(`${M <= 0 ? 'a non-positive' : 'a non-finite'} mass (M = ${M} kg) is not a source: the metric needs a positive mass`);
}

/**
 * The polar angle is a point of the spherical chart only on the open interval
 * (0, π). The poles are coordinate singularities: `sin π` is 1.2e-16, not 0, so
 * a test for exact zero lets θ = π through and the finite-difference stencil
 * divides by it.
 */
function requirePolarInterior(theta: number): void {
  if (!(theta > 0 && theta < Math.PI && Math.sin(theta) > 1e-9)) {
    throw new Error(
      `θ must be strictly between 0 and π (got ${theta}): the poles are coordinate singularities of the spherical chart`,
    );
  }
}

/** SI dimension of each metric parameter. A bare number is already in that unit. */
const PARAM_DIM: Readonly<Record<string, Dimension>> = {
  M: MASS,
  c: VELOCITY,
  G: { L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0 },
  r: LENGTH,
  a: LENGTH,
  t: TIME,
  theta: DIMENSIONLESS,
  phi: DIMENSIONLESS,
  a0: DIMENSIONLESS,
  t0: TIME,
  n: DIMENSIONLESS,
  k: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  Lambda: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  rho: MASS_DENSITY,
};

/** Parse `key=value` pairs. A value is a number, a unit, or a constant expression. @internal */
function metricParams(
  pairs: readonly string[],
  defaults: Readonly<Record<string, number>>,
): { values: Record<string, number>; notes: string[] } {
  const values: Record<string, number> = { ...defaults };
  const notes: string[] = [];
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq <= 0) throw new Error(`'${pair}' must be key=value`);
    const key = pair.slice(0, eq);
    if (!(key in defaults)) throw new Error(`unknown parameter '${key}' (expected ${Object.keys(defaults).join(', ')})`);
    let read: ReturnType<typeof readParameter>;
    try {
      read = readParameter(pair.slice(eq + 1), PARAM_DIM[key] ?? DIMENSIONLESS);
    } catch (e) {
      // The reader knows the text and the dimension it was given, not which parameter held them.
      if (e instanceof UnitError) throw new UnitError(`parameter ${key}: ${e.message}`);
      throw e;
    }
    values[key] = read.value;
    for (const note of read.notes) if (!notes.includes(note)) notes.push(note);
  }
  return { values, notes };
}

/**
 * Curvature at one point. `pairs` overrides the documented defaults.
 * @internal
 */
export function curvatureReport(metric: MetricId, pairs: readonly string[] = []): CurvatureReport {
  if (metric === 'minkowski') {
    const { values: p, notes } = metricParams(pairs, { c: C_SI, t: 0, r: 1, theta: 1, phi: 0 });
    const g: MetricFn = () => {
      const m = mat4();
      m[0]![0] = -(p.c! * p.c!);
      m[1]![1] = 1;
      m[2]![2] = 1;
      m[3]![3] = 1;
      return m;
    };
    const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
    const t = tensorsOf(g, x);
    return stateCurvature(pack('minkowski', p, x, t, { ricciScalar: 0, kretschmann: 0 }, [
      'Minkowski in Cartesian-like coordinates (the angular part is not a sphere here; g_θθ = g_φφ = 1).',
      ...notes,
    ]));
  }
  if (metric === 'schwarzschild') {
    // NaN marks r as not supplied. A supplied r = 0 is a point, not the default.
    const { values: p, notes } = metricParams(pairs, { M: M_SUN_SI, c: C_SI, G: G_SI, r: Number.NaN, theta: Math.PI / 2, phi: 0, t: 0 });
    requirePositiveMass(p.M!);
    requirePolarInterior(p.theta!);
    const rs = (2 * p.G! * p.M!) / (p.c! * p.c!);
    if (Number.isNaN(p.r)) p.r = 10 * rs;
    if (!(p.r! > rs)) throw new Error(`r must be outside the horizon (r = ${p.r} m, r_s = ${rs} m)`);
    const g = schwarzschildMetric(p.M!, p.c!, p.G!);
    const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
    const t = tensorsOf(g, x);
    const K = schwarzschildKretschmann(p.M!, p.r!, p.c!, p.G!);
    return stateCurvature(pack('schwarzschild', p, x, t, { kretschmann: K, ricciScalar: 0, horizon_m: rs }, [
      'Closed form: Kretschmann = 48 G² M² / (c⁴ r⁶), Ricci = 0.',
      'Christoffel symbols below are the finite-difference values.',
      ...notes,
    ]));
  }
  if (metric === 'flrw') {
    const { values: p, notes } = metricParams(pairs, {
      a0: 1,
      t0: 1,
      n: 2 / 3,
      k: 0,
      Lambda: 0,
      rho: 0,
      c: C_SI,
      G: G_SI,
      t: 2,
      r: 0.3,
      theta: 1,
      phi: 0.4,
    });
    const { a, adot } = flrwScale(p.t!, p.a0!, p.t0!, p.n!);
    const H2 = (adot / a) ** 2;
    if (p.rho === 0 && p.k === 0 && p.Lambda === 0) {
      p.rho = (3 * H2) / (8 * Math.PI * p.G!);
    }
    const g = flrwMetric(p.a0!, p.t0!, p.n!, p.k!, p.c!);
    const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
    // Christoffel in the SI metric. Ricci and Kretschmann are computed at c = 1
    // and divided by c² and c⁴: g_tt = −c² makes those scalars smaller than the
    // roundoff of an SI finite difference.
    const tSi = tensorsOf(g, x);
    const t1 = p.c === 1 ? tSi : tensorsOf(flrwMetric(p.a0!, p.t0!, p.n!, p.k!, 1), x);
    const c2 = p.c! * p.c!;
    const t = {
      christoffel: tSi.christoffel,
      ricci: t1.ricci.map((row) => row.map((v) => v / c2)),
      ricciScalar: t1.ricciScalar / c2,
      kretschmann: t1.kretschmann / (c2 * c2),
    };
    const R = flrwRicciScalar(p.t!, p.a0!, p.t0!, p.n!, p.k!, p.r!, p.c!);
    const sides = friedmannSides({
      t: p.t!,
      a0: p.a0!,
      t0: p.t0!,
      n: p.n!,
      k: p.k!,
      r: p.r!,
      rho: p.rho!,
      lambda: p.Lambda!,
      c: p.c,
      G: p.G,
    });
    return stateCurvature(pack('flrw', p, x, t, { ricciScalar: R, H2: sides.H2, friedmannRhs: sides.rhs }, [
      'ds² = −c² dt² + a(t)² [dr²/(1−k r²) + r² dΩ²], a(t) = a0 (t/t0)^n.',
      'Friedmann: H² = 8πGρ/3 − k c²/a² + Λ c²/3. Flat dust defaults n = 2/3 and ρ = 3 H²/(8πG). CE-friedmann is the flat term; CE-friedmann-curvature carries −k c²/a².',
      'Ricci scalar closed form: R = 6/c² (ä/a + H² + k c²/a²). Flat dust: R = 3 H²/c².',
      'Ricci and Kretschmann are finite-differenced at c = 1 and restored with 1/c² and 1/c⁴. Christoffel symbols are the SI difference.',
      ...notes,
    ]));
  }
  const { values: p, notes: paramNotes } = metricParams(pairs, {
    M: M_SUN_SI,
    a: 0,
    c: C_SI,
    G: G_SI,
    r: Number.NaN,
    theta: Math.PI / 2,
    phi: 0,
    t: 0,
  });
  requirePositiveMass(p.M!);
  requirePolarInterior(p.theta!);
  const Mgeom = (p.G! * p.M!) / (p.c! * p.c!);
  if (Number.isNaN(p.r)) p.r = 10 * Mgeom;
  if (!(p.r! > 0)) throw new Error(`r must be positive and outside the singularity (got r = ${p.r} m)`);
  if (Math.abs(p.a!) >= p.r!) throw new Error('Kerr finite difference wants |a| < r and r outside the ring');
  const g = kerrMetric(Mgeom, p.a!);
  const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
  const t = tensorsOf(g, x);
  const K = kerrKretschmann(Mgeom, p.r!, p.a!, p.theta!);
  const aOverM = p.a! / Mgeom;
  const kerrNotes = [
    'Boyer–Lindquist, geometrized lengths: M stands for GM/c² and a is a length. Kretschmann is 1/length⁴.',
  ];
  if (p.a! !== 0 && Math.abs(p.a!) <= 1 && Mgeom > 10) {
    kerrNotes.push(
      `a = ${p.a} m is a length, so a/M = ${aOverM}. A dimensionless spin is a/(GM/c²), not the number passed as a.`,
    );
  }
  return stateCurvature(pack('kerr', { ...p, M_geom_m: Mgeom, a_over_M: aOverM }, x, t, { kretschmann: K, ricciScalar: 0 }, [
    ...paramNotes,
    ...kerrNotes,
    'Closed form: K = 48 M² (r² − a² cos²θ) [(r² + a² cos²θ)² − 16 r² a² cos²θ] / (r² + a² cos²θ)⁶.',
    'a = 0 reduces to the Schwarzschild Kretschmann 48 M²/r⁶.',
    'Geodesics (--geodesic) use the Carter constant. θ = π/2 is an equatorial circular orbit. Any other θ is an inclined spherical orbit with that polar turning point. ISCO and photon radii are closed forms in r/M.',
  ]));
}

const relDiff = (got: number, want: number): number => Math.abs(got - want) / Math.max(Math.abs(want), 1e-30);

/**
 * The headline Ricci scalar is the closed form when the finite difference
 * does not match it. A vacuum metric's finite-difference residual is not
 * listed as Ricci. A scale factor that does not solve Friedmann says so.
 */
function stateCurvature(report: CurvatureReport): CurvatureReport {
  const notes = [...report.notes];
  let ricci = report.ricci;
  let ricciScalar = report.ricciScalar;
  const exactR = report.closedForm.ricciScalar;
  if (exactR === 0 && Math.abs(report.ricciScalar) < 1e-6) {
    ricciScalar = 0;
    ricci = [];
    notes.push('Ricci is 0 for this vacuum metric. A finite-difference residual is not listed.');
  } else if (exactR !== undefined && relDiff(report.ricciScalar, exactR) > 1e-2) {
    ricciScalar = exactR;
    ricci = [];
    notes.push(
      'Ricci scalar is the closed form. The finite-difference scalar, restored from a c = 1 difference by 1/c², does not match it when spatial curvature is present, so those components are not listed.',
    );
  }
  const H2 = report.closedForm.H2;
  const rhs = report.closedForm.friedmannRhs;
  if (H2 !== undefined && rhs !== undefined && relDiff(H2, rhs) > 1e-6) {
    notes.push(
      'H² and the Friedmann right-hand side differ, so this scale factor is not a solution of the Friedmann equation at the stated ρ, k and Λ. k is a curvature in 1/length²: k = 1 with c in m/s is a curvature radius of about a metre, not the dimensionless k = ±1 of geometrized cosmology.',
    );
  }
  return { ...report, ricci, ricciScalar, notes };
}

function pack(
  metric: MetricId,
  parameters: Readonly<Record<string, number>>,
  x: Pt,
  t: Tensors,
  closedForm: Readonly<Record<string, number>>,
  notes: readonly string[],
): CurvatureReport {
  const names = ['t', 'r', 'θ', 'φ'];
  return {
    metric,
    signature: METRIC_SIGNATURE,
    signatureNote: METRIC_SIGNATURE_NOTE,
    coordinates: '(t, r, θ, φ)',
    parameters,
    point: { t: x[0], r: x[1], theta: x[2], phi: x[3] },
    christoffel: nonzeroGamma(t.christoffel),
    ricci: nonzeroMatrix(t.ricci, (i, j) => `R_${names[i]}${names[j]}`),
    ricciScalar: t.ricciScalar,
    kretschmann: t.kretschmann,
    closedForm,
    notes,
  };
}

/**
 * A short Schwarzschild circular-orbit integration (analytic Christoffel, RK4).
 * Returns the radial drift relative to the start and the coordinate φ advance.
 * Kerr is refused.
 * @internal
 */
export function schwarzschildCircularOrbit(opts?: {
  readonly M?: number;
  readonly r?: number;
  readonly c?: number;
  readonly G?: number;
  readonly fraction?: number;
}): { readonly r0: number; readonly rEnd: number; readonly phiAdvance: number; readonly steps: number } {
  const Msi = opts?.M ?? M_SUN_SI;
  const c = opts?.c ?? C_SI;
  const G = opts?.G ?? G_SI;
  // Integrate in geometrized units (c = G = 1). An SI Γ^r_tt is ~c² and cancels
  // only after two huge terms; the residual then blows the step up.
  const M = (G * Msi) / (c * c);
  const rs = 2 * M;
  const r0 = opts?.r ?? 10 * rs;
  const f = 1 - rs / r0;
  const Omega = Math.sqrt(M / r0 ** 3);
  const ut = 1 / Math.sqrt(1 - (3 * rs) / (2 * r0));
  const uphi = Omega * ut;
  if (!(f > 0) || !Number.isFinite(ut)) throw new Error('circular orbit needs r > 1.5 r_s');

  // The closed-form Schwarzschild Christoffel symbols, polar terms included:
  // with u^θ = 0 and θ = π/2 the polar terms stay zero to roundoff.
  const period = (2 * Math.PI) / uphi;
  const fraction = opts?.fraction ?? 0.02;
  const steps = 400;
  const y = integrateWithChristoffel((r, theta) => schwarzschildChristoffel(M, r, theta), [0, r0, Math.PI / 2, 0, ut, 0, 0, uphi], period * fraction, steps);
  return { r0, rEnd: y[1]!, phiAdvance: y[3]!, steps };
}

/**
 * Kerr ISCO radii in units of M. χ = a/M, |χ| ≤ 1.
 * Bardeen, Press & Teukolsky 1972: r/M = 3 + Z2 ∓ √((3−Z1)(3+Z1+2 Z2)),
 * upper sign prograde.
 * @internal
 */
export function kerrIscoRadius(aOverM: number): { readonly prograde: number; readonly retrograde: number } {
  const chi = aOverM;
  if (!(Math.abs(chi) <= 1)) throw new Error('|a/M| must be at most 1');
  const z1 = 1 + Math.cbrt(1 - chi * chi) * (Math.cbrt(1 + chi) + Math.cbrt(1 - chi));
  const z2 = Math.sqrt(3 * chi * chi + z1 * z1);
  const inner = Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
  return { prograde: 3 + z2 - inner, retrograde: 3 + z2 + inner };
}

/**
 * Unstable equatorial photon orbits in units of M.
 * r/M = 2 (1 + cos(⅔ arccos(∓ a/M))), upper sign prograde.
 * @internal
 */
export function kerrPhotonRadius(aOverM: number): { readonly prograde: number; readonly retrograde: number } {
  const chi = aOverM;
  if (!(Math.abs(chi) <= 1)) throw new Error('|a/M| must be at most 1');
  return {
    prograde: 2 * (1 + Math.cos((2 / 3) * Math.acos(-chi))),
    retrograde: 2 * (1 + Math.cos((2 / 3) * Math.acos(chi))),
  };
}

/** One integrated geodesic in geometrized units. @internal */
export interface KerrGeodesicSample {
  readonly r0: number;
  readonly rEnd: number;
  readonly theta0: number;
  readonly thetaEnd: number;
  readonly phiAdvance: number;
  readonly steps: number;
  readonly E0: number;
  readonly EEnd: number;
  readonly L0: number;
  readonly LEnd: number;
  readonly Q0: number;
  readonly QEnd: number;
  readonly norm0: number;
  readonly normEnd: number;
  readonly mu2: number;
}

interface SphericalConstants {
  readonly E: number;
  readonly L: number;
  readonly Q: number;
}

function radialPotential(M: number, a: number, r: number, E: number, L: number, Q: number, mu2: number): number {
  const Delta = r * r - 2 * M * r + a * a;
  const P = E * (r * r + a * a) - a * L;
  return P * P - Delta * (mu2 * r * r + (L - a * E) ** 2 + Q);
}

function radialPotentialPrime(M: number, a: number, r: number, E: number, L: number, Q: number, mu2: number): number {
  const Delta = r * r - 2 * M * r + a * a;
  const dDelta = 2 * (r - M);
  const P = E * (r * r + a * a) - a * L;
  const separated = mu2 * r * r + (L - a * E) ** 2 + Q;
  return 4 * r * E * P - dDelta * separated - 2 * mu2 * r * Delta;
}

/** Equatorial circular energy and axial angular momentum. Upper sign is prograde. */
function equatorialCircular(M: number, a: number, r: number, prograde: boolean): { readonly E: number; readonly L: number; readonly uphi: number } {
  const sign = prograde ? 1 : -1;
  const sqrtM = Math.sqrt(M);
  const Omega = (sign * sqrtM) / (r ** 1.5 + sign * a * sqrtM);
  const g0 = kerrMetric(M, a)([0, r, Math.PI / 2, 0]);
  const norm = -(g0[0]![0]! + 2 * Omega * g0[0]![3]! + Omega * Omega * g0[3]![3]!);
  if (!(norm > 0) || !Number.isFinite(Omega)) throw new Error('circular orbit is not timelike at this radius');
  const ut = 1 / Math.sqrt(norm);
  const uphi = Omega * ut;
  return {
    E: -(g0[0]![0]! * ut + g0[0]![3]! * uphi),
    L: g0[3]![0]! * ut + g0[3]![3]! * uphi,
    uphi,
  };
}

/** ∂(R, R')/∂(E, L). Lengths are in units of M, so L and Q are L/M and Q/M². */
function sphericalJacobian(
  a: number,
  r: number,
  E: number,
  L: number,
): { readonly j11: number; readonly j12: number; readonly j21: number; readonly j22: number } {
  const Delta = r * r - 2 * r + a * a;
  const dDelta = 2 * (r - 1);
  const alpha = r * r + a * a;
  const P = E * alpha - a * L;
  const x = L - a * E;
  const dPdE = alpha;
  const dPdL = -a;
  const dSdE = -2 * a * x;
  const dSdL = 2 * x;
  return {
    j11: 2 * P * dPdE - Delta * dSdE,
    j12: 2 * P * dPdL - Delta * dSdL,
    j21: 4 * r * P + 4 * r * E * dPdE - dDelta * dSdE,
    j22: 4 * r * E * dPdL - dDelta * dSdL,
  };
}

function solveSpherical(M: number, a: number, r: number, Q: number, mu2: number, prograde: boolean): { readonly E: number; readonly L: number } {
  // R is a difference of terms ~ r⁴. Solve in units of M so a solar radius
  // does not wipe the L-column of a finite-difference Jacobian.
  const aHat = a / M;
  const rHat = r / M;
  const QHat = Q / (M * M);
  const seed = equatorialCircular(1, aHat, rHat, prograde);
  let E = seed.E;
  let L = seed.L;
  for (let n = 0; n < 30; n++) {
    const f1 = radialPotential(1, aHat, rHat, E, L, QHat, mu2);
    const f2 = radialPotentialPrime(1, aHat, rHat, E, L, QHat, mu2);
    const { j11, j12, j21, j22 } = sphericalJacobian(aHat, rHat, E, L);
    const det = j11 * j22 - j12 * j21;
    const scale = Math.max(1, Math.abs(j11), Math.abs(j12), Math.abs(j21), Math.abs(j22));
    if (!Number.isFinite(det) || Math.abs(det) < 1e-18 * scale * scale) throw new Error('spherical-orbit Jacobian is singular');
    const stepE = (j22 * f1 - j12 * f2) / det;
    const stepL = (-j21 * f1 + j11 * f2) / det;
    E -= stepE;
    L -= stepL;
    // r⁴ cancellation leaves R' uncertain by a fraction of a unit at large r/M.
    const room = Math.max(1, rHat ** 4);
    const settled =
      Math.abs(stepE) < 1e-10 &&
      Math.abs(stepL) < 1e-8 * Math.max(1, Math.abs(L)) &&
      Math.abs(f1) < 1e-6 * room &&
      Math.abs(f2) < 1e-6 * room;
    if (settled) return { E, L: L * M };
  }
  throw new Error('spherical orbit did not converge');
}

/**
 * Timelike spherical orbit at fixed r: R = R' = 0. `Q` is the Carter constant
 * (0 on the equator). E and L come from that pair of conditions.
 * @internal
 */
export function kerrSphericalTimelike(opts?: {
  readonly M?: number;
  readonly aOverM?: number;
  readonly rOverM?: number;
  readonly Q?: number;
  readonly prograde?: boolean;
}): SphericalConstants & { readonly R: number; readonly Rp: number } {
  const M = opts?.M ?? 1;
  const chi = opts?.aOverM ?? 0;
  if (!(M > 0) || !(Math.abs(chi) <= 1)) throw new Error('spherical orbit wants M > 0 and |a/M| ≤ 1');
  const a = chi * M;
  const r = (opts?.rOverM ?? 10) * M;
  const Q = opts?.Q ?? 0;
  const solved = solveSpherical(M, a, r, Q, 1, opts?.prograde !== false);
  return {
    E: solved.E,
    L: solved.L,
    Q,
    R: radialPotential(M, a, r, solved.E, solved.L, Q, 1),
    Rp: radialPotentialPrime(M, a, r, solved.E, solved.L, Q, 1),
  };
}

/**
 * Spherical photon orbit between the equatorial photon radii.
 * E is fixed at 1 (null affine scale). L/E and Q/E² are the separated
 * constants with R = R' = 0 and μ² = 0. Q = 0 on either equatorial photon orbit.
 * @internal
 */
export function kerrSphericalPhoton(opts?: {
  readonly M?: number;
  readonly aOverM?: number;
  readonly rOverM?: number;
}): SphericalConstants {
  const M = opts?.M ?? 1;
  const chi = opts?.aOverM ?? 0;
  const rHat = opts?.rOverM;
  if (!(M > 0) || !(Math.abs(chi) > 0 && Math.abs(chi) <= 1)) throw new Error('spherical photon orbit wants M > 0 and 0 < |a/M| ≤ 1');
  if (rHat === undefined) throw new Error('spherical photon orbit needs rOverM');
  const ends = kerrPhotonRadius(chi);
  const lo = Math.min(ends.prograde, ends.retrograde);
  const hi = Math.max(ends.prograde, ends.retrograde);
  if (!(rHat >= lo - 1e-9 && rHat <= hi + 1e-9)) {
    throw new Error('spherical photon radius lies between the prograde and retrograde photon orbits');
  }
  const a = chi * M;
  const r = rHat * M;
  if (!(Math.abs(r - M) > 1e-9 * M)) throw new Error('extremal prograde photon orbit sits on the horizon');
  const Delta = r * r - 2 * M * r + a * a;
  const E = 1;
  const L = E * ((r * r + a * a) / a - (2 * r * Delta) / (a * (r - M)));
  const P = E * (r * r + a * a) - a * L;
  const Q = (P * P) / Delta - (L - a * E) ** 2;
  if (Q < -1e-8 * M * M) throw new Error('no spherical photon orbit at this radius');
  return { E, L, Q: Q < 0 ? 0 : Q };
}

/**
 * Spherical timelike orbit whose polar turning point is `theta`.
 * The Carter constant is the value that makes Θ(θ) = 0 there.
 * @internal
 */
export function kerrTurningPointOrbit(opts: {
  readonly M?: number;
  readonly aOverM?: number;
  readonly rOverM?: number;
  readonly theta: number;
  readonly prograde?: boolean;
}): SphericalConstants {
  const M = opts.M ?? 1;
  const chi = opts.aOverM ?? 0;
  if (!(M > 0) || !(Math.abs(chi) <= 1)) throw new Error('turning-point orbit wants M > 0 and |a/M| ≤ 1');
  const a = chi * M;
  const r = (opts.rOverM ?? 10) * M;
  const theta = opts.theta;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  if (!(Math.abs(s) > 1e-3) || !(Math.abs(c) > 1e-4)) {
    throw new Error('turning-point θ must sit off the equator and off the pole');
  }
  const seed = equatorialCircular(M, a, r, opts.prograde !== false);
  let Q = seed.L * seed.L * c * c;
  let E = seed.E;
  let L = seed.L;
  for (let n = 0; n < 16; n++) {
    const solved = solveSpherical(M, a, r, Q, 1, opts.prograde !== false);
    E = solved.E;
    L = solved.L;
    const next = c * c * (a * a * (1 - E * E) + (L * L) / (s * s));
    if (!Number.isFinite(next) || next < 0) throw new Error('turning-point Carter constant left the physical range');
    if (Math.abs(next - Q) <= 1e-9 * Math.max(1, Math.abs(next))) return { E, L, Q: next };
    Q = next;
  }
  throw new Error('turning-point Carter constant did not converge');
}

function kerrMetricDerivatives(M: number, a: number, r: number, theta: number): { readonly dr: number[][]; readonly dth: number[][] } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const Sigma = r * r + a * a * c * c;
  const dSr = 2 * r;
  const dSt = -2 * a * a * c * s;
  const Delta = r * r - 2 * M * r + a * a;
  const dDr = 2 * (r - M);
  const Sigma2 = Sigma * Sigma;
  const dr = mat4();
  const dth = mat4();
  dr[0]![0] = (2 * M * (a * a * c * c - r * r)) / Sigma2;
  dth[0]![0] = (4 * M * r * a * a * c * s) / Sigma2;
  const dtpR = (-2 * M * a * s * s * (a * a * c * c - r * r)) / Sigma2;
  const dtpT = (-4 * M * a * r * s * c * (Sigma + a * a * s * s)) / Sigma2;
  dr[0]![3] = dr[3]![0] = dtpR;
  dth[0]![3] = dth[3]![0] = dtpT;
  dr[1]![1] = (dSr * Delta - Sigma * dDr) / (Delta * Delta);
  dth[1]![1] = dSt / Delta;
  dr[2]![2] = dSr;
  dth[2]![2] = dSt;
  const A = (r * r + a * a) ** 2 - a * a * Delta * s * s;
  const dAr = 4 * r * (r * r + a * a) - a * a * dDr * s * s;
  const dAt = -2 * a * a * Delta * s * c;
  dr[3]![3] = (s * s * (dAr * Sigma - A * dSr)) / Sigma2;
  dth[3]![3] = ((2 * s * c * A + s * s * dAt) * Sigma - s * s * A * dSt) / Sigma2;
  return { dr, dth };
}

/**
 * Γ^ρ_{μν} from a metric and its analytic partial derivatives, through the
 * one Christoffel builder (`computeChristoffelTensor`). A `null` derivative
 * is a coordinate the metric does not depend on.
 */
function christoffelFrom(g: number[][], dg: readonly (number[][] | null)[]): Gamma {
  const gInverseFlat = invert4(g).flat();
  const tensor = computeChristoffelTensor(gInverseFlat, (mu) => (dg[mu] ?? mat4()).flat(), 4, ENGINE);
  return ENGINE.toNested(tensor) as Gamma;
}

function kerrChristoffel(M: number, a: number, r: number, theta: number): Gamma {
  const partial = kerrMetricDerivatives(M, a, r, theta);
  return christoffelFrom(kerrMetric(M, a)([0, r, theta, 0]), [null, partial.dr, partial.dth, null]);
}

/** Largest |Γ_analytic − Γ_finite_difference| at one Boyer–Lindquist point. @internal */
export function kerrChristoffelFdGap(M: number, a: number, r: number, theta: number): number {
  const x: Pt = [0, r, theta, 0];
  const analytic = kerrChristoffel(M, a, r, theta);
  const fd = christoffelOf(kerrMetric(M, a), x);
  let gap = 0;
  for (let rho = 0; rho < 4; rho++) {
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) gap = Math.max(gap, Math.abs(analytic[rho]![mu]![nu]! - fd[rho]![mu]![nu]!));
    }
  }
  return gap;
}

function schwarzschildChristoffel(M: number, r: number, theta: number): Gamma {
  const rs = 2 * M;
  const ff = 1 - rs / r;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const Gma: Gamma = blankGamma();
  const set = (rho: number, mu: number, nu: number, v: number) => {
    Gma[rho]![mu]![nu] = v;
    Gma[rho]![nu]![mu] = v;
  };
  set(0, 0, 1, rs / (2 * r * (r - rs)));
  set(1, 0, 0, (rs * ff) / (2 * r * r));
  set(1, 1, 1, -rs / (2 * r * (r - rs)));
  set(1, 2, 2, -(r - rs));
  set(1, 3, 3, -(r - rs) * s * s);
  set(2, 1, 2, 1 / r);
  set(2, 3, 3, -s * c);
  set(3, 1, 3, 1 / r);
  set(3, 2, 3, c / s);
  return Gma;
}

function conservedOf(metric: MetricFn, a: number, y: readonly number[], mu2: number): { readonly E: number; readonly L: number; readonly Q: number; readonly norm: number } {
  const g = metric([y[0]!, y[1]!, y[2]!, y[3]!]);
  const u = [y[4]!, y[5]!, y[6]!, y[7]!];
  let norm = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) norm += g[i]![j]! * u[i]! * u[j]!;
  const E = -(g[0]![0]! * u[0]! + g[0]![3]! * u[3]!);
  const L = g[3]![0]! * u[0]! + g[3]![3]! * u[3]!;
  const pTheta = g[2]![2]! * u[2]!;
  const c = Math.cos(y[2]!);
  const s = Math.sin(y[2]!);
  const Q = pTheta * pTheta + c * c * (a * a * (mu2 - E * E) + (L * L) / (s * s));
  return { E, L, Q, norm };
}

function carterState(
  M: number,
  a: number,
  r: number,
  theta: number,
  E: number,
  L: number,
  Q: number,
  mu2: number,
  signR: number,
  signTheta: number,
  allowOffShell: boolean,
): number[] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  if (!(Math.abs(s) > 1e-6)) throw new Error('Boyer–Lindquist geodesic wants θ away from the poles');
  const Sigma = r * r + a * a * c * c;
  const Delta = r * r - 2 * M * r + a * a;
  if (!(Delta > 0)) throw new Error('geodesic start must be outside the horizon');
  const R = radialPotential(M, a, r, E, L, Q, mu2);
  const Theta = Q - c * c * (a * a * (mu2 - E * E) + (L * L) / (s * s));
  const scale = Math.max(1, E * E, L * L, Math.abs(Q));
  if (R < -1e-8 * scale && !allowOffShell) throw new Error('radial potential is negative at the start');
  if (Theta < -1e-8 * scale && !allowOffShell) throw new Error('polar potential is negative at the start');
  const g = kerrMetric(M, a)([0, r, theta, 0]);
  const det = g[0]![0]! * g[3]![3]! - g[0]![3]! * g[0]![3]!;
  const ut = (g[3]![3]! * -E - g[0]![3]! * L) / det;
  const uphi = (g[0]![0]! * L - g[0]![3]! * -E) / det;
  const ur = signR * Math.sqrt(Math.max(R, 0)) / Sigma;
  const uth = signTheta * Math.sqrt(Math.max(Theta, 0)) / Sigma;
  return [0, r, theta, 0, ut, ur, uth, uphi];
}

/**
 * The state `[t, r, θ, φ, u^t, u^r, u^θ, u^φ]` after `steps` RK4 steps of
 * the second-order geodesic equation over an affine extent `tauEnd`, by
 * `integrateGeodesic` of `geodesic-integrator.ts` with `gammaAt` packed into
 * its flat layout `G[16·μ + 4·ν + ρ] = Γ^μ_{νρ}`.
 */
function integrateWithChristoffel(
  gammaAt: (r: number, theta: number) => Gamma,
  y0: readonly number[],
  tauEnd: number,
  steps: number,
): number[] {
  const christoffelFn = (x: ReadonlyArray<number>, out?: Float64Array): Float64Array => {
    const flat = out ?? new Float64Array(64);
    const gamma = gammaAt(x[1]!, x[2]!);
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        for (let rho = 0; rho < 4; rho++) flat[16 * mu + 4 * nu + rho] = gamma[mu]![nu]![rho]!;
      }
    }
    return flat;
  };
  const result = integrateGeodesicRK4({
    christoffelFn,
    x0: [y0[0]!, y0[1]!, y0[2]!, y0[3]!],
    v0: [y0[4]!, y0[5]!, y0[6]!, y0[7]!],
    tauStart: 0,
    tauEnd,
    steps,
  });
  return [...result.xFinal, ...result.vFinal];
}

/** `fraction` of an orbit's angular period, from the start's angular rate. */
function orbitExtent(y0: readonly number[], fraction: number): number {
  const angular = Math.max(Math.abs(y0[7]!), Math.abs(y0[6]!), 1e-12);
  return ((2 * Math.PI) / angular) * fraction;
}

function sampleOf(metric: MetricFn, a: number, y0: readonly number[], y1: readonly number[], steps: number, mu2: number): KerrGeodesicSample {
  const start = conservedOf(metric, a, y0, mu2);
  const end = conservedOf(metric, a, y1, mu2);
  return {
    r0: y0[1]!,
    rEnd: y1[1]!,
    theta0: y0[2]!,
    thetaEnd: y1[2]!,
    phiAdvance: y1[3]!,
    steps,
    E0: start.E,
    EEnd: end.E,
    L0: start.L,
    LEnd: end.L,
    Q0: start.Q,
    QEnd: end.Q,
    norm0: start.norm,
    normEnd: end.norm,
    mu2,
  };
}

/**
 * Integrate a Kerr geodesic in Boyer–Lindquist coordinates, geometrized (G = c = 1).
 * Initial u^μ comes from the Carter first-order potentials (E, L, Q, μ²).
 * The step is the second-order geodesic equation with analytic Christoffel symbols,
 * so E, L, Q and g_μν u^μ u^ν are evolved quantities and can drift.
 * `mu2` is 1 for timelike and 0 for null. `allowOffShell` starts the second-order
 * equation even when a potential is negative; that is the control that r can move.
 * @internal
 */
export function kerrGeodesic(opts: {
  readonly M?: number;
  readonly aOverM?: number;
  readonly rOverM?: number;
  readonly theta?: number;
  readonly E: number;
  readonly L: number;
  readonly Q: number;
  readonly mu2?: number;
  readonly signR?: number;
  readonly signTheta?: number;
  readonly fraction?: number;
  readonly steps?: number;
  readonly allowOffShell?: boolean;
}): KerrGeodesicSample {
  const M = opts.M ?? 1;
  const chi = opts.aOverM ?? 0;
  if (!(M > 0) || !(Math.abs(chi) <= 1)) throw new Error('Kerr geodesic wants M > 0 and |a/M| ≤ 1');
  const a = chi * M;
  const r = (opts.rOverM ?? 10) * M;
  const theta = opts.theta ?? Math.PI / 2;
  const mu2 = opts.mu2 ?? 1;
  const steps = opts.steps ?? 80;
  const fraction = opts.fraction ?? 0.01;
  const metric = kerrMetric(M, a);
  const y0 = carterState(M, a, r, theta, opts.E, opts.L, opts.Q, mu2, opts.signR ?? 1, opts.signTheta ?? 1, opts.allowOffShell === true);
  const y1 = integrateWithChristoffel((rr, th) => kerrChristoffel(M, a, rr, th), y0, orbitExtent(y0, fraction), steps);
  return sampleOf(metric, a, y0, y1, steps, mu2);
}

/**
 * Schwarzschild geodesic in geometrized units, with the closed-form Christoffel
 * symbols (the polar terms included). The initial 4-velocity is the a = 0 Carter
 * state, so a Kerr run at a = 0 can be compared coordinate by coordinate.
 * @internal
 */
export function schwarzschildGeodesic(opts: {
  readonly M?: number;
  readonly rOverM?: number;
  readonly theta?: number;
  readonly E: number;
  readonly L: number;
  readonly Q: number;
  readonly signR?: number;
  readonly signTheta?: number;
  readonly fraction?: number;
  readonly steps?: number;
}): KerrGeodesicSample {
  const M = opts.M ?? 1;
  if (!(M > 0)) throw new Error('Schwarzschild geodesic wants M > 0');
  const r = (opts.rOverM ?? 10) * M;
  const theta = opts.theta ?? Math.PI / 2;
  const steps = opts.steps ?? 80;
  const fraction = opts.fraction ?? 0.01;
  const metric = schwarzschildMetric(M, 1, 1);
  const y0 = carterState(M, 0, r, theta, opts.E, opts.L, opts.Q, 1, opts.signR ?? 1, opts.signTheta ?? 1, false);
  const y1 = integrateWithChristoffel((rr, th) => schwarzschildChristoffel(M, rr, th), y0, orbitExtent(y0, fraction), steps);
  return sampleOf(metric, 0, y0, y1, steps, 1);
}

/**
 * Integrate a Kerr equatorial circular orbit in geometrized units (G = c = 1).
 * Q is 0 and θ starts at π/2. E = −u_t and L = u_φ are evolved with the
 * second-order equation. `rOverM` must sit outside the photon orbit.
 * @internal
 */
export function kerrEquatorialCircular(opts?: {
  readonly M?: number;
  readonly aOverM?: number;
  readonly rOverM?: number;
  readonly prograde?: boolean;
  readonly fraction?: number;
  readonly steps?: number;
}): KerrGeodesicSample {
  const M = opts?.M ?? 1;
  const chi = opts?.aOverM ?? 0;
  const rOverM = opts?.rOverM ?? 10;
  if (!(M > 0) || !(Math.abs(chi) <= 1)) throw new Error('|a/M| must be at most 1');
  const eq = equatorialCircular(M, chi * M, rOverM * M, opts?.prograde !== false);
  return kerrGeodesic({
    M,
    aOverM: chi,
    rOverM,
    theta: Math.PI / 2,
    E: eq.E,
    L: eq.L,
    Q: 0,
    mu2: 1,
    fraction: opts?.fraction ?? 0.01,
    steps: opts?.steps ?? 80,
  });
}
