/**
 * Curvature of a few exact metrics for `upt metric`.
 *
 * The line element is mostly-plus, (−,+,+,+), the signature of the
 * Schwarzschild fixture in this repo. The canonical Einstein-equation metric
 * node uses the same mostly-plus signature. The Kretschmann scalar does not
 * depend on that choice.
 *
 * Schwarzschild Christoffel symbols are the closed form. Riemann, Ricci and
 * Kretschmann are a 4th-order finite difference of the metric, checked in
 * tests against the closed forms (Schwarzschild Kretschmann, flat-dust FLRW
 * Ricci scalar, Kerr Kretschmann). Kerr geodesics in Boyer–Lindquist
 * coordinates, including inclined ones, take their initial data from the
 * Carter constant and are integrated with the second-order geodesic equation.
 *
 * @module numerical/spacetime-metrics
 * @internal
 */

import { C_SI, G_SI, M_SUN_SI } from '../core/constants.js';

/** Coordinate order (t, r, θ, φ). */
export type Pt = [number, number, number, number];

/** The signature this module differentiates. */
export const METRIC_SIGNATURE = '(-,+,+,+)';

/**
 * Printed with every curvature report. The line element and the canonical
 * Einstein-equation metric node share this mostly-plus signature.
 */
export const METRIC_SIGNATURE_NOTE =
  'Line element signature (−,+,+,+), the same mostly-plus signature as the Schwarzschild fixture ' +
  'and as the canonical Einstein-equation metric node. ' +
  'The Kretschmann scalar does not depend on that choice.';

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

function invert4(src: number[][]): number[][] {
  const a = src.map((row, i) => {
    const out = zeros(8);
    for (let j = 0; j < 4; j++) out[j] = row[j]!;
    out[4 + i] = 1;
    return out;
  });
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    for (let r = col + 1; r < 4; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    }
    const tmp = a[col]!;
    a[col] = a[pivot]!;
    a[pivot] = tmp;
    const div = a[col]![col]!;
    if (!Number.isFinite(div) || Math.abs(div) < 1e-18) throw new Error('metric is singular at this point');
    for (let j = 0; j < 8; j++) a[col]![j] = a[col]![j]! / div;
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const f = a[r]![col]!;
      for (let j = 0; j < 8; j++) a[r]![j] = a[r]![j]! - f * a[col]![j]!;
    }
  }
  return a.map((row) => row.slice(4));
}

type MetricFn = (x: Pt) => number[][];

function shift(x: Pt, mu: number, delta: number): Pt {
  const y: Pt = [x[0], x[1], x[2], x[3]];
  y[mu] += delta;
  return y;
}

/** 4th-order central difference of a matrix-valued function. */
function dMetric(g: MetricFn, x: Pt, mu: number, h: number): number[][] {
  const at = (s: number) => g(shift(x, mu, s * h));
  const a = at(-2);
  const b = at(-1);
  const c = at(1);
  const d = at(2);
  const out = mat4();
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const av = a[i]![j]!;
      const bv = b[i]![j]!;
      const cv = c[i]![j]!;
      const dv = d[i]![j]!;
      // A component that does not change must not differentiate a huge constant
      // (g_tt = −c²): the stencil cancels only up to a roundoff, and that
      // roundoff divided by h is a fake Christoffel.
      out[i]![j] = av === bv && bv === cv && cv === dv ? 0 : (-dv + 8 * cv - 8 * bv + av) / (12 * h);
    }
  }
  return out;
}

type Gamma = number[][][];

function blankGamma(): Gamma {
  return [0, 1, 2, 3].map(() => mat4());
}

/** A rank-4 array of numbers, indexed [a][b][c][d]. */
function tensor4(): number[][][][] {
  return [0, 1, 2, 3].map(() => [0, 1, 2, 3].map(() => [0, 1, 2, 3].map(() => [0, 0, 0, 0])));
}

function christoffelOf(g: MetricFn, x: Pt, steps: readonly number[]): Gamma {
  const gi = invert4(g(x));
  const dg = [0, 1, 2, 3].map((mu) => dMetric(g, x, mu, steps[mu]!));
  const G: Gamma = blankGamma();
  for (let rho = 0; rho < 4; rho++) {
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = mu; nu < 4; nu++) {
        let s = 0;
        for (let sigma = 0; sigma < 4; sigma++) {
          s += gi[rho]![sigma]! * (dg[mu]![nu]![sigma]! + dg[nu]![mu]![sigma]! - dg[sigma]![mu]![nu]!);
        }
        const v = 0.5 * s;
        G[rho]![mu]![nu] = v;
        G[rho]![nu]![mu] = v;
      }
    }
  }
  return G;
}

interface Tensors {
  readonly ricciScalar: number;
  readonly kretschmann: number;
  readonly ricci: number[][];
  readonly christoffel: Gamma;
}

/**
 * R^ρ_{σμν} = ∂_μ Γ^ρ_{νσ} − ∂_ν Γ^ρ_{μσ} + Γ^ρ_{μλ} Γ^λ_{νσ} − Γ^ρ_{νλ} Γ^λ_{μσ}.
 * Christoffel comes from a 4th-order difference of the metric; its coordinate
 * derivative is a central difference of that. Checked against the Schwarzschild
 * Kretschmann closed form.
 */
function tensorsOf(g: MetricFn, x: Pt, steps: readonly number[]): Tensors {
  const g0 = g(x);
  const gi = invert4(g0);
  const gamma = christoffelOf(g, x, steps);
  const partial: Gamma[] = [];
  for (let mu = 0; mu < 4; mu++) {
    const h = steps[mu]!;
    const plus = christoffelOf(g, shift(x, mu, h), steps);
    const minus = christoffelOf(g, shift(x, mu, -h), steps);
    const d: Gamma = blankGamma();
    for (let rho = 0; rho < 4; rho++) {
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          d[rho]![a]![b] = (plus[rho]![a]![b]! - minus[rho]![a]![b]!) / (2 * h);
        }
      }
    }
    partial.push(d);
  }
  const up = tensor4();
  for (let rho = 0; rho < 4; rho++) {
    for (let sigma = 0; sigma < 4; sigma++) {
      for (let mu = 0; mu < 4; mu++) {
        for (let nu = 0; nu < 4; nu++) {
          let s = partial[mu]![rho]![nu]![sigma]! - partial[nu]![rho]![mu]![sigma]!;
          for (let lam = 0; lam < 4; lam++) {
            s +=
              gamma[rho]![mu]![lam]! * gamma[lam]![nu]![sigma]! -
              gamma[rho]![nu]![lam]! * gamma[lam]![mu]![sigma]!;
          }
          up[rho]![sigma]![mu]![nu] = s;
        }
      }
    }
  }
  const lower = tensor4();
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) {
      for (let c = 0; c < 4; c++) {
        for (let d = 0; d < 4; d++) {
          let s = 0;
          for (let rho = 0; rho < 4; rho++) s += g0[a]![rho]! * up[rho]![b]![c]![d]!;
          lower[a]![b]![c]![d] = s;
        }
      }
    }
  }
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
  let kretschmann = 0;
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) {
      for (let c = 0; c < 4; c++) {
        for (let d = 0; d < 4; d++) {
          let raised = 0;
          for (let ap = 0; ap < 4; ap++) {
            for (let bp = 0; bp < 4; bp++) {
              for (let cp = 0; cp < 4; cp++) {
                for (let dp = 0; dp < 4; dp++) {
                  raised += gi[a]![ap]! * gi[b]![bp]! * gi[c]![cp]! * gi[d]![dp]! * lower[ap]![bp]![cp]![dp]!;
                }
              }
            }
          }
          kretschmann += lower[a]![b]![c]![d]! * raised;
        }
      }
    }
  }
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

function stepsFor(x: Pt): number[] {
  return [Math.max(Math.abs(x[0]), 1) * 1e-4, Math.max(Math.abs(x[1]), 1) * 1e-4, 1e-4, 1e-4];
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

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const v = Number(raw);
  if (!Number.isFinite(v)) throw new Error(`not a finite number: ${raw}`);
  return v;
}

/** Parse `key=value` pairs. Unknown keys are an error. @internal */
export function metricParams(
  pairs: readonly string[],
  defaults: Readonly<Record<string, number>>,
): Record<string, number> {
  const out: Record<string, number> = { ...defaults };
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq <= 0) throw new Error(`'${pair}' must be key=value`);
    const key = pair.slice(0, eq);
    if (!(key in defaults)) throw new Error(`unknown parameter '${key}' (expected ${Object.keys(defaults).join(', ')})`);
    out[key] = num(pair.slice(eq + 1), Number.NaN);
  }
  return out;
}

/**
 * Curvature at one point. `pairs` overrides the documented defaults.
 * @internal
 */
export function curvatureReport(metric: MetricId, pairs: readonly string[] = []): CurvatureReport {
  if (metric === 'minkowski') {
    const p = metricParams(pairs, { c: C_SI, t: 0, r: 1, theta: 1, phi: 0 });
    const g: MetricFn = () => {
      const m = mat4();
      m[0]![0] = -(p.c! * p.c!);
      m[1]![1] = 1;
      m[2]![2] = 1;
      m[3]![3] = 1;
      return m;
    };
    const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
    const t = tensorsOf(g, x, stepsFor(x));
    return pack('minkowski', p, x, t, { ricciScalar: 0, kretschmann: 0 }, [
      'Minkowski in Cartesian-like coordinates (the angular part is not a sphere here; g_θθ = g_φφ = 1).',
    ]);
  }
  if (metric === 'schwarzschild') {
    const p = metricParams(pairs, { M: M_SUN_SI, c: C_SI, G: G_SI, r: 0, theta: Math.PI / 2, phi: 0, t: 0 });
    const rs = (2 * p.G! * p.M!) / (p.c! * p.c!);
    if (p.r === 0) p.r = 10 * rs;
    if (!(p.r! > rs)) throw new Error(`r must be outside the horizon (r_s = ${rs})`);
    const g = schwarzschildMetric(p.M!, p.c!, p.G!);
    const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
    const t = tensorsOf(g, x, stepsFor(x));
    const K = schwarzschildKretschmann(p.M!, p.r!, p.c!, p.G!);
    return pack('schwarzschild', p, x, t, { kretschmann: K, ricciScalar: 0, horizon_m: rs }, [
      'Closed form: Kretschmann = 48 G² M² / (c⁴ r⁶), Ricci = 0.',
      'Christoffel symbols below are the finite-difference values.',
    ]);
  }
  if (metric === 'flrw') {
    const p = metricParams(pairs, {
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
    const tSi = tensorsOf(g, x, stepsFor(x));
    const t1 = p.c === 1 ? tSi : tensorsOf(flrwMetric(p.a0!, p.t0!, p.n!, p.k!, 1), x, stepsFor(x));
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
    return pack('flrw', p, x, t, { ricciScalar: R, H2: sides.H2, friedmannRhs: sides.rhs }, [
      'ds² = −c² dt² + a(t)² [dr²/(1−k r²) + r² dΩ²], a(t) = a0 (t/t0)^n.',
      'Friedmann: H² = 8πGρ/3 − k c²/a² + Λ c²/3. Flat dust defaults n = 2/3 and ρ = 3 H²/(8πG). CE-friedmann is the flat term; CE-friedmann-curvature carries −k c²/a².',
      'Ricci scalar closed form: R = 6/c² (ä/a + H² + k c²/a²). Flat dust: R = 3 H²/c².',
      'Ricci and Kretschmann are finite-differenced at c = 1 and restored with 1/c² and 1/c⁴. Christoffel symbols are the SI difference.',
    ]);
  }
  const p = metricParams(pairs, {
    M: M_SUN_SI,
    a: 0,
    c: C_SI,
    G: G_SI,
    r: 0,
    theta: Math.PI / 2,
    phi: 0,
    t: 0,
  });
  const Mgeom = (p.G! * p.M!) / (p.c! * p.c!);
  if (p.r === 0) p.r = 10 * Mgeom;
  if (Math.abs(p.a!) >= p.r!) throw new Error('Kerr finite difference wants |a| < r and r outside the ring');
  const g = kerrMetric(Mgeom, p.a!);
  const x: Pt = [p.t!, p.r!, p.theta!, p.phi!];
  const t = tensorsOf(g, x, stepsFor(x));
  const K = kerrKretschmann(Mgeom, p.r!, p.a!, p.theta!);
  return pack('kerr', { ...p, M_geom_m: Mgeom }, x, t, { kretschmann: K }, [
    'Boyer–Lindquist, geometrized lengths: M stands for GM/c² and a is a length. Kretschmann is 1/length⁴.',
    'Closed form: K = 48 M² (r² − a² cos²θ) [(r² + a² cos²θ)² − 16 r² a² cos²θ] / (r² + a² cos²θ)⁶.',
    'a = 0 reduces to the Schwarzschild Kretschmann 48 M²/r⁶.',
    'Geodesics (--geodesic) use the Carter constant. θ = π/2 is an equatorial circular orbit. Any other θ is an inclined spherical orbit with that polar turning point. ISCO and photon radii are closed forms in r/M.',
  ]);
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

  // Analytic Γ for the equatorial circular orbit (θ = π/2, sin = 1, cos = 0).
  // Equatorial reduction. The polar symbols that carry cot θ are omitted:
  // a floating-point step off θ = π/2 makes cot θ explode.
  const gamma = (r: number): Gamma => {
    const ff = 1 - rs / r;
    const Gma: Gamma = blankGamma();
    const set = (rho: number, mu: number, nu: number, v: number) => {
      Gma[rho]![mu]![nu] = v;
      Gma[rho]![nu]![mu] = v;
    };
    set(0, 0, 1, rs / (2 * r * (r - rs)));
    set(1, 0, 0, (rs * ff) / (2 * r * r));
    set(1, 1, 1, -rs / (2 * r * (r - rs)));
    set(1, 2, 2, -(r - rs));
    set(1, 3, 3, -(r - rs));
    set(2, 1, 2, 1 / r);
    set(3, 1, 3, 1 / r);
    return Gma;
  };

  // state: t, r, th, phi, ut, ur, uth, uphi
  let y = [0, r0, Math.PI / 2, 0, ut, 0, 0, uphi];
  const accel = (s: number[]): number[] => {
    const Gma = gamma(s[1]!);
    const u = [s[4]!, s[5]!, s[6]!, s[7]!];
    const du = [0, 0, 0, 0];
    for (let rho = 0; rho < 4; rho++) {
      let sum = 0;
      for (let mu = 0; mu < 4; mu++) {
        for (let nu = 0; nu < 4; nu++) sum += Gma[rho]![mu]![nu]! * u[mu]! * u[nu]!;
      }
      du[rho] = -sum;
    }
    return [u[0]!, u[1]!, u[2]!, u[3]!, du[0]!, du[1]!, du[2]!, du[3]!];
  };
  const add = (a: number[], b: number[], scale: number) => a.map((v, i) => v + scale * b[i]!);
  const period = (2 * Math.PI) / uphi;
  const fraction = opts?.fraction ?? 0.02;
  const steps = 400;
  const h = (period * fraction) / steps;
  for (let n = 0; n < steps; n++) {
    const k1 = accel(y);
    const k2 = accel(add(y, k1, h / 2));
    const k3 = accel(add(y, k2, h / 2));
    const k4 = accel(add(y, k3, h));
    y = y.map((v, i) => v + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
    y[2] = Math.PI / 2;
    y[6] = 0;
  }
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

function christoffelFrom(g: number[][], dg: readonly (number[][] | null)[]): Gamma {
  const gi = invert4(g);
  const G: Gamma = blankGamma();
  for (let rho = 0; rho < 4; rho++) {
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = mu; nu < 4; nu++) {
        let s = 0;
        for (let sigma = 0; sigma < 4; sigma++) {
          const dmu = dg[mu]?.[nu]![sigma] ?? 0;
          const dnu = dg[nu]?.[mu]![sigma] ?? 0;
          const dsig = dg[sigma]?.[mu]![nu] ?? 0;
          s += gi[rho]![sigma]! * (dmu + dnu - dsig);
        }
        const v = 0.5 * s;
        G[rho]![mu]![nu] = v;
        G[rho]![nu]![mu] = v;
      }
    }
  }
  return G;
}

function kerrChristoffel(M: number, a: number, r: number, theta: number): Gamma {
  const partial = kerrMetricDerivatives(M, a, r, theta);
  return christoffelFrom(kerrMetric(M, a)([0, r, theta, 0]), [null, partial.dr, partial.dth, null]);
}

/** Largest |Γ_analytic − Γ_finite_difference| at one Boyer–Lindquist point. @internal */
export function kerrChristoffelFdGap(M: number, a: number, r: number, theta: number): number {
  const x: Pt = [0, r, theta, 0];
  const analytic = kerrChristoffel(M, a, r, theta);
  const fd = christoffelOf(kerrMetric(M, a), x, stepsFor(x));
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

function integrateGeodesic(gammaAt: (r: number, theta: number) => Gamma, y0: readonly number[], fraction: number, steps: number): number[] {
  const accel = (s: number[]): number[] => {
    const Gma = gammaAt(s[1]!, s[2]!);
    const u = [s[4]!, s[5]!, s[6]!, s[7]!];
    const du = [0, 0, 0, 0];
    for (let rho = 0; rho < 4; rho++) {
      let sum = 0;
      for (let mu = 0; mu < 4; mu++) for (let nu = 0; nu < 4; nu++) sum += Gma[rho]![mu]![nu]! * u[mu]! * u[nu]!;
      du[rho] = -sum;
    }
    return [u[0]!, u[1]!, u[2]!, u[3]!, du[0]!, du[1]!, du[2]!, du[3]!];
  };
  const add = (left: number[], right: number[], scale: number) => left.map((v, i) => v + scale * right[i]!);
  const angular = Math.max(Math.abs(y0[7]!), Math.abs(y0[6]!), 1e-12);
  const h = ((2 * Math.PI) / angular) * fraction / steps;
  let y = y0.slice();
  for (let n = 0; n < steps; n++) {
    const k1 = accel(y);
    const k2 = accel(add(y, k1, h / 2));
    const k3 = accel(add(y, k2, h / 2));
    const k4 = accel(add(y, k3, h));
    y = y.map((v, i) => v + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
  }
  return y;
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
  const y1 = integrateGeodesic((rr, th) => kerrChristoffel(M, a, rr, th), y0, fraction, steps);
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
  const y1 = integrateGeodesic((rr, th) => schwarzschildChristoffel(M, rr, th), y0, fraction, steps);
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
