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
 * Ricci scalar, Kerr Kretschmann). Kerr equatorial circular geodesics are
 * integrated with the Carter constant held at the equator.
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
 * The canonical Einstein-equation AST was not edited. Say so wherever a
 * curvature number is printed.
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
    'Equatorial circular geodesics: --geodesic. ISCO and photon radii are closed forms in r/M.',
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

/** One Kerr equatorial circular orbit. @internal */
export interface KerrGeodesicSample {
  readonly r0: number;
  readonly rEnd: number;
  readonly phiAdvance: number;
  readonly steps: number;
  readonly E0: number;
  readonly EEnd: number;
  readonly L0: number;
  readonly LEnd: number;
  readonly Q0: number;
  readonly QEnd: number;
}

/**
 * Integrate a Kerr equatorial circular orbit in geometrized units (G = c = 1).
 * θ is held at π/2, so the Carter constant stays 0; E = −u_t and L = u_φ are
 * evolved and must not drift. `rOverM` must sit outside the photon orbit.
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
  if (!(Math.abs(chi) <= 1)) throw new Error('|a/M| must be at most 1');
  const a = chi * M;
  const sign = opts?.prograde === false ? -1 : 1;
  const r0 = (opts?.rOverM ?? 10) * M;
  const gfn = kerrMetric(M, a);
  const sqrtM = Math.sqrt(M);
  const Omega = (sign * sqrtM) / (r0 ** 1.5 + sign * a * sqrtM);
  const g0 = gfn([0, r0, Math.PI / 2, 0]);
  const norm = -(g0[0]![0]! + 2 * Omega * g0[0]![3]! + Omega * Omega * g0[3]![3]!);
  if (!(norm > 0) || !Number.isFinite(Omega)) throw new Error('circular orbit is not timelike at this radius');
  const ut = 1 / Math.sqrt(norm);
  const uphi = Omega * ut;

  const conserved = (s: number[]) => {
    const gg = gfn([s[0]!, s[1]!, Math.PI / 2, s[3]!]);
    const u0 = s[4]!;
    const u3 = s[7]!;
    const uTheta = gg[2]![2]! * s[6]!;
    const E = -(gg[0]![0]! * u0 + gg[0]![3]! * u3);
    const L = gg[3]![0]! * u0 + gg[3]![3]! * u3;
    const cth = Math.cos(s[2]!);
    const sth = Math.sin(s[2]!);
    const Q = uTheta * uTheta + cth * cth * (a * a * (1 - E * E) + (L * L) / (sth * sth));
    return { E, L, Q };
  };

  let y = [0, r0, Math.PI / 2, 0, ut, 0, 0, uphi];
  const start = conserved(y);
  const accel = (s: number[]): number[] => {
    const xx: Pt = [s[0]!, s[1]!, Math.PI / 2, s[3]!];
    const Gma = christoffelOf(gfn, xx, stepsFor(xx));
    const u = [s[4]!, s[5]!, 0, s[7]!];
    const du = [0, 0, 0, 0];
    for (let rho = 0; rho < 4; rho++) {
      let sum = 0;
      for (let mu = 0; mu < 4; mu++) for (let nu = 0; nu < 4; nu++) sum += Gma[rho]![mu]![nu]! * u[mu]! * u[nu]!;
      du[rho] = -sum;
    }
    return [u[0]!, u[1]!, 0, u[3]!, du[0]!, du[1]!, 0, du[3]!];
  };
  const add = (left: number[], right: number[], scale: number) => left.map((v, i) => v + scale * right[i]!);
  const period = (2 * Math.PI) / Math.abs(uphi);
  const fraction = opts?.fraction ?? 0.01;
  const steps = opts?.steps ?? 80;
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
  const end = conserved(y);
  return {
    r0,
    rEnd: y[1]!,
    phiAdvance: y[3]!,
    steps,
    E0: start.E,
    EEnd: end.E,
    L0: start.L,
    LEnd: end.L,
    Q0: start.Q,
    QEnd: end.Q,
  };
}
