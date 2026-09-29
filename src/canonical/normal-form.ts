/**
 * Normalized structural form of a scalar `ExprNode`, **up to dimensionless
 * multiplicative factors** — the hash the F4 circularity guard uses to decide
 * whether a bridge's RHS and a canonical equation encode the same relation.
 *
 * Two expressions hash equal when they differ only by:
 *   - dimensionless multiplicative CONSTANTS (numeric literals + registered
 *     named constants: ln2, 4π, …),
 *   - product nesting (`(a·b)·c` vs `a·b·c`),
 *   - commutative reordering of `*` / `+` operands.
 *
 * They hash DIFFERENT when an exponent differs (T⁴ ≠ T), the non-dimensionless
 * factor set differs, OR a dimensionless **stub** differs. A dimensionless
 * symbol that is NOT a recognized constant is a STUB for an unknown
 * dimensionless quantity (e.g. `ln⟨exp(−βW)⟩` in BE-29) — it is kept as a
 * distinct structural token, so Jarzynski's `ln⟨e^−βW⟩` and Landauer's `ln2`
 * no longer collapse to the same form ("up to a *constant*" must not absorb a
 * differing functional). Sums keep every term; `^` keeps its exponent; `/`
 * keeps the numerator/denominator split.
 *
 * @module canonical/normal-form
 */
import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';
import { MASS, TEMPERATURE } from '../dimensional/types.js';
import { equals } from '../dimensional/algebra.js';
import { CONSTANTS, piMultipleValue } from '../composition/symbolic-constants.js';

const isDimensionless = (d: Dimension): boolean =>
  d.L === 0 &&
  d.M === 0 &&
  d.T === 0 &&
  d.I === 0 &&
  d.Theta === 0 &&
  d.N === 0 &&
  d.J === 0;

/** Token for a node that carries no structural content (a dimensionless factor). */
const UNIT = '1';

/**
 * Spelled-out dimensionless numeric constants some encoders write as a named
 * symbol rather than a literal — genuine constants the eval `CONSTANTS`
 * registry happens not to list (it carries only `ln2`/`4pi`/`8pi`). The
 * `\d*pi` pattern covers `pi`/`2pi`/`6pi`/…; `ln_2_constant` is BE-16's spelling
 * of `ln 2`. These stay droppable; everything else dimensionless-and-named is a
 * PARAMETER stub (`alpha`, `lambda`, `g_dark`, `ln⟨e^−βW⟩`, …) and is kept.
 */
const NAMED_DIMENSIONLESS_CONSTANTS = new Set(['ln_2_constant']);

/**
 * A dimensionless symbol is a droppable "up to a constant" factor only when it
 * is a numeric literal (`2`, `-1`, `0.5`), a registered named constant
 * (`ln2`, `4pi`, …), or a spelled-out numeric constant (`6pi`, `ln_2_constant`).
 * Any OTHER dimensionless symbol is a stub for an unknown dimensionless quantity
 * (a parameter or a functional like `ln⟨exp(−βW)⟩`) and is structural —
 * dropping it would conflate distinct interiors.
 */
/**
 * Bridge ASTs still spell a governing quantity with the short symbol (`T`, `M`,
 * `m_1`, `m_2`). The registry uses one name. The structural hash treats the
 * short spelling as that name when the dimension is the quantity's dimension,
 * so a time coordinate named `T` stays a different symbol.
 */
function canonicalQuantityName(name: string, dim: Dimension): string {
  if (name === 'T' && equals(dim, TEMPERATURE)) return 'temperature';
  if ((name === 'M' || name === 'm_1') && equals(dim, MASS)) return 'mass';
  if (name === 'm_2' && equals(dim, MASS)) return 'secondary-mass';
  return name;
}

function isDroppableConstant(name: string): boolean {
  return (
    name in CONSTANTS ||
    Number.isFinite(Number(name)) ||
    NAMED_DIMENSIONLESS_CONSTANTS.has(name) ||
    piMultipleValue(name) !== undefined
  );
}

/**
 * Full structural serialization that NEVER drops dimensionless factors — used
 * for `^` exponents, which are structural (T⁴ ≠ T) and must not be treated
 * "up to dimensionless factors". Commutative operands are still sorted so the
 * exponent comparison is robust to reordering.
 */
function rawForm(node: ExprNode): string {
  switch (node.kind) {
    case 'symbol':
      return `s:${node.name}`;
    case 'op': {
      const parts = node.args.map(rawForm);
      if (node.op === '*' || node.op === '+') parts.sort();
      return `${node.op}(${parts.join(',')})`;
    }
    case 'transcendental':
      return `${node.fn}[${rawForm(node.arg)}]`;
    case 'abs':
      return `abs[${rawForm(node.arg)}]`;
    default:
      return `${node.kind}:${JSON.stringify(node)}`;
  }
}

/** Collect the factors of a (possibly nested) `*` product. */
function flattenProduct(node: ExprNode, out: ExprNode[]): void {
  if (node.kind === 'op' && node.op === '*') {
    for (const a of node.args) flattenProduct(a, out);
  } else {
    out.push(node);
  }
}

/**
 * The normalized structural form of `node`. Equal strings ⇒ same relation up to
 * dimensionless multiplicative factors.
 */
export function normalForm(node: ExprNode): string {
  switch (node.kind) {
    case 'symbol':
      // A non-dimensionless symbol is structural. A dimensionless symbol is a
      // droppable factor ONLY when it is a recognized constant; otherwise it is
      // a stub for an unknown dimensionless quantity and is kept (tagged) so two
      // different stubs do not collapse to the same form.
      if (!isDimensionless(node.dim)) return `sym:${canonicalQuantityName(node.name, node.dim)}`;
      return isDroppableConstant(node.name) ? UNIT : `stub:${node.name}`;

    case 'op': {
      switch (node.op) {
        case '*': {
          const factors: ExprNode[] = [];
          flattenProduct(node, factors);
          const kept = factors
            .map(normalForm)
            .filter((f) => f !== UNIT) // drop dimensionless factors
            .sort();
          if (kept.length === 0) return UNIT;
          if (kept.length === 1) return kept[0];
          return `*(${kept.join(',')})`;
        }
        case '/': {
          const num = normalForm(node.args[0]);
          const den = normalForm(node.args[1]);
          if (den === UNIT) return num; // ÷ dimensionless ⇒ the numerator
          return `/(${num},${den})`;
        }
        case '^': {
          // The exponent is structural (T⁴ ≠ T) and must NOT be reduced
          // "up to dimensionless factors" — serialize it with rawForm so a
          // dimensionless exponent is never dropped (symmetric for direct
          // symbols and op sub-expressions alike).
          const base = normalForm(node.args[0]);
          return `^(${base},${rawForm(node.args[1])})`;
        }
        case '+':
        case '-': {
          const parts = node.args.map(normalForm);
          if (node.op === '+') parts.sort();
          return `${node.op}(${parts.join(',')})`;
        }
        default:
          return `op:${JSON.stringify(node)}`;
      }
    }

    case 'transcendental':
      return `${node.fn}(${normalForm(node.arg)})`;

    case 'abs':
      return `abs(${normalForm(node.arg)})`;

    default:
      // integral / derivative / tensor arms: compare structurally by kind+shape.
      return `${node.kind}:${JSON.stringify(node)}`;
  }
}

/** Whether two scalar ASTs are the same relation up to dimensionless factors. */
export function structurallyEqual(a: ExprNode, b: ExprNode): boolean {
  return normalForm(a) === normalForm(b);
}
