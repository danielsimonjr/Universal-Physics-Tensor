/**
 * One sign rule for a positive transport coefficient built from a carrier
 * charge and a mobility.
 *
 * `D = μ k_B T / q` and `σ = n q μ` are positive when μ and q have the same
 * sign, and zero when either is zero. Opposite signs are not a negative
 * diffusivity or a negative conductivity. A Hall coefficient and a cyclotron
 * frequency are odd in charge alone; this rule does not apply to them.
 *
 * @module bridges/carrier-sign
 */

/**
 * Thrown when a positive transport coefficient would come out negative
 * because the carrier charge and the mobility have opposite signs.
 * @public
 */
export class CarrierSignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CarrierSignError';
  }
}

/** True when the product is positive or zero, including a zero factor. */
function sameCarrierSign(a: number, b: number): boolean {
  return a * b >= 0;
}

/**
 * Reject opposite signs. `left` and `right` are the names in the message.
 * Only {@link applyCarrierSignPolicy} calls this.
 */
function assertSameCarrierSign(a: number, b: number, left: string, right: string): void {
  const opposite = Number.isFinite(a) && Number.isFinite(b) ? !sameCarrierSign(a, b) : a * b < 0;
  if (opposite) throw new CarrierSignError(`${left} and ${right} must have the same sign`);
}

/** How many times the sign policy has run since the last reset. The once-check reads this. */
let carrierSignPolicyCalls = 0;

/**
 * Reset the sign-policy call count. The once-check reads the count after this.
 * @internal
 */
export function resetCarrierSignPolicyCalls(): void {
  carrierSignPolicyCalls = 0;
}

/**
 * How many times the sign policy has run since the last reset.
 * @internal
 */
export function readCarrierSignPolicyCalls(): number {
  return carrierSignPolicyCalls;
}

/** An integer exponent whose absolute value is odd. A half power is not odd. */
function oddIntegerExponent(exp: number): boolean {
  return Number.isInteger(exp) && Math.abs(exp) % 2 === 1;
}

/** A same-sign pair whose names are not `charge` and `carrier-mobility`. */
interface CarrierSignPair {
  readonly a: number;
  readonly b: number;
  readonly left: string;
  readonly right: string;
}

/**
 * One sign policy. A monomial odd in both `charge` and `carrier-mobility`
 * rejects opposite signs. `pair` is that same check for a formula whose
 * names are not those two (the Einstein relation). Inputs the scalar AST
 * is even in are replaced by their absolute values. The math underneath
 * does not apply this again.
 * @internal
 */
export function applyCarrierSignPolicy(
  monomial: Readonly<Record<string, number>> | null,
  inputs: Readonly<Record<string, number>>,
  even: ReadonlySet<string>,
  pair?: CarrierSignPair,
): Record<string, number> {
  carrierSignPolicyCalls += 1;
  let left: number | undefined;
  let right: number | undefined;
  let leftName = '';
  let rightName = '';
  if (pair !== undefined) {
    left = pair.a;
    right = pair.b;
    leftName = pair.left;
    rightName = pair.right;
  } else if (monomial !== null) {
    const qExp = monomial.charge;
    const muExp = monomial['carrier-mobility'];
    if (
      qExp !== undefined &&
      muExp !== undefined &&
      oddIntegerExponent(qExp) &&
      oddIntegerExponent(muExp)
    ) {
      left = inputs.charge;
      right = inputs['carrier-mobility'];
      leftName = 'charge';
      rightName = 'carrier-mobility';
    }
  }
  if (left !== undefined && right !== undefined && leftName !== '' && rightName !== '') {
    assertSameCarrierSign(left, right, leftName, rightName);
  }
  if (even.size === 0) return inputs;
  let out: Record<string, number> | undefined;
  for (const name of even) {
    const value = inputs[name];
    if (value === undefined || Object.is(value, Math.abs(value))) continue;
    out ??= { ...inputs };
    out[name] = Math.abs(value);
  }
  return out ?? inputs;
}
