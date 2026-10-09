/**
 * Runtime input validation for numeric evaluators — `validateFiniteInputs`.
 *
 * A generic, dependency-free finite-and-in-range check for a numeric
 * evaluator's input record (`klein-gordon.ts` reads it). It is a leaf module
 * with no imports, so any layer may read it without an upward edge.
 *
 * @module numerical/input-validation
 */

/**
 * Declarative spec for a single field of an evaluator's `input` record.
 *
 * The default behaviour (no `min`/`max`) only verifies finiteness
 * (`Number.isFinite`). The bound predicates compose with `Number.isFinite`
 * so the resulting error always reads "finite ⟨adj⟩ number" — drop-in
 * compatible with the per-evaluator message format
 * `"<evaluator>: <field> must be a finite <adjective> number, got <v>"`.
 *
 * @internal
 */
export interface FieldSpec {
  /** Field name on the `input` record (e.g., `'M_kg'`). */
  readonly name: string;
  /** Inclusive lower bound (default `-Infinity`). */
  readonly min?: number;
  /** Inclusive upper bound (default `Infinity`). */
  readonly max?: number;
  /** Strict `>` instead of `≥` at the lower bound. */
  readonly excludeMin?: boolean;
  /** Strict `<` instead of `≤` at the upper bound. */
  readonly excludeMax?: boolean;
  /** Explicit override — when `min === 0` and you want to permit zero. */
  readonly allowZero?: boolean;
  /**
   * Optional domain-specific noun phrase (e.g., 'probability', 'angle').
   * When set, replaces the auto-generated "in range [a, b]" prose:
   *   "<evaluator>: <field> must be a finite <description> number, got <v>"
   * @internal
   */
  readonly description?: string;
}

/**
 * Compose the adjective phrase that appears in the error message, picked to
 * match the per-evaluator prose conventions:
 *   - `min=0, excludeMin=true`  → "positive"        (i.e., `> 0`)
 *   - `min=0`                   → "non-negative"    (i.e., `≥ 0`)
 *   - bounded but not a 0-pin   → "in range [a, b]" (closed/open as set)
 *   - unbounded                 → ""                (just "finite")
 */
function describeRange(spec: FieldSpec): string {
  if (spec.description !== undefined) return `${spec.description} `;

  const hasMin = spec.min !== undefined;
  const hasMax = spec.max !== undefined;
  const lowOpen = !!spec.excludeMin;
  const highOpen = !!spec.excludeMax;

  if (hasMin && !hasMax && spec.min === 0 && !spec.allowZero) {
    if (lowOpen) return 'positive ';
    return 'non-negative ';
  }

  if (!hasMin && !hasMax) return '';

  const lo = hasMin ? spec.min : -Infinity;
  const hi = hasMax ? spec.max : Infinity;
  const lb = lowOpen ? '(' : '[';
  const rb = highOpen ? ')' : ']';
  return `in range ${lb}${lo}, ${hi}${rb} `;
}

/**
 * Validate every field of `input` named by `fieldSpecs`. Throws a `RangeError`
 * on the first violation with a message containing the keywords (`"finite"`,
 * plus `"positive"` / `"non-negative"` / `"in range"`) the per-evaluator tests
 * pattern-match against. Format:
 *
 *   `<evaluatorName>: <fieldName> must be a finite <range> number, got <value>`
 *
 * @internal
 */
export function validateFiniteInputs<T extends object>(
  input: T,
  fieldSpecs: ReadonlyArray<FieldSpec>,
  evaluatorName: string,
): void {
  for (const spec of fieldSpecs) {
    const value: unknown = (input as Record<string, unknown>)[spec.name];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      const range = describeRange(spec);
      throw new RangeError(
        `${evaluatorName}: ${spec.name} must be a finite ${range}number, got ${String(value)}`,
      );
    }

    if (spec.min !== undefined) {
      const violatesMin = spec.excludeMin ? value <= spec.min : value < spec.min;
      if (violatesMin) {
        const range = describeRange(spec);
        throw new RangeError(
          `${evaluatorName}: ${spec.name} must be a finite ${range}number, got ${value}`,
        );
      }
    }

    if (spec.max !== undefined) {
      const violatesMax = spec.excludeMax ? value >= spec.max : value > spec.max;
      if (violatesMax) {
        const range = describeRange(spec);
        throw new RangeError(
          `${evaluatorName}: ${spec.name} must be a finite ${range}number, got ${value}`,
        );
      }
    }
  }
}
