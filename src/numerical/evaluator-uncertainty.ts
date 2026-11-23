/**
 * First-order propagation of input uncertainties through a closed-form
 * evaluator (GUM's law of propagation), with pairwise correlations and a
 * curvature check per input.
 *
 * This is the numerical engine behind `upt evaluate --sigma/--corr`. It is
 * not the public graph-layer `propagateUncertainty`, which takes a bridge
 * edge and folds neither correlations nor a curvature ratio.
 *
 * @internal
 * @module numerical/evaluator-uncertainty
 */
import { eigvals } from '@danielsimonjr/mathts-matrix';

/** A curvature term above this fraction of the linear term marks the linearization unreliable. */
const NONLINEAR_FRACTION = 0.1;

/** One input's share of an output's uncertainty. */
export interface UncertaintyContribution {
  readonly sensitivity: number | null;
  readonly contribution: number | null;
  /** |f(x+u) + f(x−u) − 2f(x)| / 2 over |c·u|: the second-order term against the first. */
  readonly curvatureRatio: number | null;
  readonly note?: string;
}

/** One output's propagated uncertainty. */
export interface PropagatedOutput {
  readonly value: number;
  readonly u: number | null;
  readonly relative: number | null;
  readonly contributions: Record<string, UncertaintyContribution>;
  readonly unreliable: string[];
}

/** A pairwise correlation table keyed `a,b`; either order is read. */
export type CorrelationTable = ReadonlyMap<string, number>;

function correlationOf(corr: CorrelationTable, i: string, j: string): number {
  return i === j ? 1 : (corr.get(`${i},${j}`) ?? corr.get(`${j},${i}`) ?? 0);
}

/**
 * GUM's law of propagation, u² = Σᵢⱼ cᵢ cⱼ ρᵢⱼ uᵢ uⱼ, with cᵢ by centered or one-sided
 * finite difference over `f`. Each input is also stepped by ±uᵢ, so a curvature term
 * comparable to the linear term is reported rather than hidden in a
 * small-looking σ. Every numeric field of `f`'s record that is not an input
 * is an output.
 */
export function propagateEvaluatorUncertainty(
  f: (inputs: Record<string, number>) => Record<string, unknown>,
  inputs: Readonly<Record<string, number>>,
  sigma: Readonly<Record<string, number>>,
  corr: CorrelationTable,
): Record<string, PropagatedOutput> {
  const base = f({ ...inputs });
  const keys = Object.keys(sigma);
  const out: Record<string, PropagatedOutput> = {};
  for (const [name, v] of Object.entries(base)) {
    if (typeof v !== 'number' || name in inputs) continue;
    const contributions: Record<string, UncertaintyContribution> = {};
    const c: Record<string, number | null> = {};
    const unreliable: string[] = [];
    for (const k of keys) {
      const u = sigma[k]!;
      const x = inputs[k]!;
      const sample = (at: number): number | undefined => {
        if (!Number.isFinite(at) || at === x) return undefined;
        try {
          const y = f({ ...inputs, [k]: at })[name];
          return typeof y === 'number' && Number.isFinite(y) ? y : undefined;
        } catch (error) {
          // Legacy case evaluators signal domain rejection with a plain Error.
          if (error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError) throw error;
          if (!(error instanceof Error)) throw error;
          return undefined;
        }
      };

      // Derivative probes and the interval check have different purposes.
      // Estimate a local derivative from representable points inside the domain;
      // inspect the full ±u interval separately for curvature or domain loss.
      const h = Math.max(u * 1e-3, Math.abs(x) * 1e-6) || 1e-6;
      let ck: number | undefined;
      let oneSided = false;
      for (let step = h, attempt = 0; attempt < 12; step /= 2, attempt++) {
        const lo = x - step;
        const hi = x + step;
        const lower = sample(lo);
        const upper = sample(hi);
        if (lower !== undefined && upper !== undefined) {
          ck = (upper - lower) / (hi - lo);
          oneSided = false;
          break;
        }
        const nearValue = upper ?? lower;
        if (nearValue === undefined) continue;
        const near = upper !== undefined ? hi : lo;
        const far = x + 2 * (near - x);
        const farValue = sample(far);
        if (farValue === undefined || far === near) continue;
        // Extrapolate the two secant slopes to x. This is exact for a quadratic,
        // including when floating-point rounding makes the spacing unequal.
        const d1 = near - x;
        const d2 = far - x;
        const slope1 = (nearValue - v) / d1;
        const slope2 = (farValue - v) / d2;
        ck = slope1 + (slope1 - slope2) * (d1 / (d2 - d1));
        oneSided = true;
        break;
      }
      if (ck === undefined || !Number.isFinite(ck)) {
        c[k] = null;
        contributions[k] = {
          sensitivity: null,
          contribution: null,
          curvatureRatio: null,
          note: 'the evaluator is undefined next to this input or the derivative cannot be resolved',
        };
        unreliable.push(k);
        continue;
      }
      c[k] = ck;
      let curvatureRatio: number | null = null;
      let note: string | undefined;
      if (u > 0 && x - u !== x && x + u !== x) {
        const lower = sample(x - u);
        const upper = sample(x + u);
        if (lower === undefined || upper === undefined) {
          note = "±u reaches outside the evaluator's domain";
          unreliable.push(k);
        } else {
          const departure = Math.abs((upper - v) + (lower - v)) / 2;
          const noise = 8 * Number.EPSILON * Math.max(Math.abs(v), Math.abs(upper), Math.abs(lower));
          if (departure <= noise) curvatureRatio = 0;
          else if (ck * u !== 0) curvatureRatio = departure / Math.abs(ck * u);
          if (departure > noise && (curvatureRatio === null || curvatureRatio > NONLINEAR_FRACTION)) {
            unreliable.push(k);
          }
        }
      }
      if (oneSided && note === undefined) {
        note = 'sensitivity uses a one-sided stencil at the evaluator domain';
        if (!unreliable.includes(k)) unreliable.push(k);
      }
      contributions[k] = { sensitivity: ck, contribution: ck * u, curvatureRatio, ...(note === undefined ? {} : { note }) };
    }
    let variance: number | null = 0;
    for (const i of keys) {
      for (const j of keys) {
        const rho = correlationOf(corr, i, j);
        if (rho === 0) continue;
        if (c[i] === null || c[j] === null) variance = null;
        if (variance !== null) variance += c[i]! * c[j]! * rho * sigma[i]! * sigma[j]!;
      }
    }
    const u = variance === null ? null : Math.sqrt(Math.max(variance, 0));
    out[name] = { value: v, u, relative: u === null || v === 0 ? null : u / Math.abs(v), contributions, unreliable };
  }
  return out;
}

/**
 * Whether the correlation matrix over `keys` describes a joint distribution:
 * symmetric with unit diagonal by construction, and positive semidefinite.
 * The eigenvalues are MathTS's; a singular matrix (ρ = ±1) is admitted, an
 * indefinite one is not.
 */
export function correlationIsPositiveSemidefinite(keys: readonly string[], corr: CorrelationTable): boolean {
  if (keys.length === 0) return true;
  const matrix = keys.map((ki) => keys.map((kj) => correlationOf(corr, ki, kj)));
  return eigvals(matrix).every((lambda) => lambda.re >= -1e-12);
}
