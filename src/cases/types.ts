/**
 * An applied case: one complete measurement problem, qualified end to end.
 *
 * A bridge evaluator answers "what does this formula give"; a case answers
 * "what should this experiment read, under which premises, and how would I
 * know the premises fail". Each case states the parent (field, vector or
 * frequency-resolved) equation beside the scalar simplification it evaluates,
 * the observable with its unit, the boundary and initial conditions, the
 * regime checks with their thresholds, what the uncertainty treatment does not
 * cover, and the route to a measurement comparison.
 *
 * A case carries no evidence tag. Where it rests on a catalog bridge or an
 * atlas bridge it names the record, and the evidence stays that record's.
 *
 * @module cases/types
 */
import type { EvaluatorParameter } from '../bridges/evaluators.js';

/** One derived number a case reports. @internal */
export interface CaseOutput {
  readonly key: string;
  readonly symbol: string;
  /** A unit expression; `''` for dimensionless. */
  readonly unit: string;
  readonly meaning: string;
}

/**
 * One regime inequality, evaluated at the given inputs. The bound is a chosen
 * numerical reading of a "≪" and says so in `threshold`.
 * @internal
 */
export interface CaseCheck {
  readonly id: string;
  /** The physical premise the inequality stands for. */
  readonly premise: string;
  /** The checked quantity, written out. */
  readonly quantity: string;
  readonly value: number;
  readonly op: '<=' | '>=' | '>';
  readonly bound: number;
  /** Why this bound: what it guarantees, or that it is a chosen threshold. */
  readonly threshold: string;
  readonly holds: boolean;
}

/**
 * A comparison of one output with a reference — the parent model evaluated
 * numerically, or the ideal a finite measurement approaches. Reported beside
 * the checks, never merged into them: a small deviation at one point does not
 * establish the premises.
 * @internal
 */
export interface CaseComparison {
  /** What the reference is. */
  readonly reference: string;
  readonly valueKey: string;
  readonly referenceKey: string;
  /** Output holding value/reference − 1. */
  readonly deviationKey: string;
  readonly method: string;
}

/** A worked invocation. `fails` lists exactly the checks it violates. @internal */
export interface CaseExample {
  readonly args: readonly string[];
  readonly note: string;
  readonly fails: readonly string[];
}

/** What a case evaluates to. A `null` output is undefined outside its premise. @internal */
export interface CaseResult {
  readonly outputs: Readonly<Record<string, number | null>>;
  readonly checks: readonly CaseCheck[];
  /** Premises stated but not checked at these inputs. */
  readonly unchecked: readonly string[];
}

/** An applied case. @internal */
export interface AppliedCase {
  readonly id: string;
  readonly title: string;
  readonly parameters: readonly EvaluatorParameter[];
  readonly governing: {
    /** The parent equations, which this case does NOT evaluate as its answer. */
    readonly parent: readonly string[];
    /** The scalar simplification it evaluates. */
    readonly scalar: readonly string[];
    /** What the simplification keeps and what it drops. */
    readonly distinction: string;
  };
  /** Key of the output a measurement reads. */
  readonly observable: string;
  readonly outputs: readonly CaseOutput[];
  readonly conditions: readonly string[];
  readonly comparison?: CaseComparison;
  /** Left out of the model and of any --sigma propagation. */
  readonly notIncluded: readonly string[];
  readonly measurement: readonly string[];
  /** Catalog bridges (`be-58`), atlas records (`ab-…`, `model-…`) and canonical entries it rests on. */
  readonly links: readonly { readonly id: string; readonly role: string }[];
  readonly examples: { readonly valid: CaseExample; readonly failures: readonly CaseExample[] };
  /** @throws Error on an input outside the model's domain (a negative radius, f_lo ≥ f_hi). */
  run(inputs: Readonly<Record<string, number>>): CaseResult;
}

/** @internal */
export const check = (
  id: string,
  premise: string,
  quantity: string,
  value: number,
  op: CaseCheck['op'],
  bound: number,
  threshold: string,
): CaseCheck => ({
  id,
  premise,
  quantity,
  value,
  op,
  bound,
  threshold,
  holds: op === '<=' ? value <= bound : op === '>=' ? value >= bound : value > bound,
});

/** @internal */
export function requirePositive(caseId: string, inputs: Readonly<Record<string, number>>, keys: readonly string[]): void {
  for (const k of keys) {
    const v = inputs[k];
    if (v === undefined || !Number.isFinite(v) || !(v > 0)) throw new Error(`${caseId}: ${k} must be a finite number > 0 (got ${v})`);
  }
}
