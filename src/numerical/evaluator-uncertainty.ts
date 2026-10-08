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
import { propagateUncertainty as propagateScalarUncertainty } from '@danielsimonjr/mathts-functions';
import { eigvals } from '@danielsimonjr/mathts-matrix';

/** A curvature term above this fraction of the linear term marks the linearization unreliable. */
export const NONLINEAR_FRACTION = 0.1;

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
 * GUM's law of propagation, u² = Σᵢⱼ cᵢ cⱼ ρᵢⱼ uᵢ uⱼ, with cᵢ by central
 * difference over `f`. Each input is also stepped by ±uᵢ, so a curvature term
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
      // The step is per input (`u·10⁻³`, or a relative step when u is 0).
      // MathTS differentiates every key of `values` with one `relativeStep`, so
      // this call's values object is only `k`. The callback puts the other
      // inputs back. Passing them as values would step an exact input (f_lo = 0
      // goes negative) and discard this partial. The correlation sum stays here.
      const h = u > 0 ? u * 1e-3 : Math.abs(x) * 1e-6 || 1e-6;
      const relativeStep = h / Math.max(Math.abs(x), 1e-30);
      let probed: ReturnType<typeof propagateScalarUncertainty> | undefined;
      try {
        probed = propagateScalarUncertainty(
          (vals) => {
            const out = f({ ...inputs, ...vals })[name];
            if (typeof out !== 'number' || !Number.isFinite(out)) throw new Error('non-numeric');
            return out;
          },
          { [k]: x },
          { [k]: u },
          u > 0 ? { relativeStep, curvatureOffsets: { [k]: u } } : { relativeStep },
        );
      } catch {
        probed = undefined;
      }
      const ck = probed?.partials[k];
      if (probed === undefined || typeof ck !== 'number' || !Number.isFinite(ck)) {
        c[k] = null;
        contributions[k] = {
          sensitivity: null,
          contribution: null,
          curvatureRatio: null,
          note: 'the evaluator is undefined next to this input',
        };
        unreliable.push(k);
        continue;
      }
      c[k] = ck;
      let curvatureRatio: number | null = null;
      let note: string | undefined;
      if (u > 0 && ck * u !== 0) {
        const reported = probed.curvature?.[k];
        if (reported === undefined || reported === null || !Number.isFinite(reported)) {
          note = "±u reaches outside the evaluator's domain";
          unreliable.push(k);
        } else {
          curvatureRatio = reported;
          if (curvatureRatio > NONLINEAR_FRACTION) unreliable.push(k);
        }
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
