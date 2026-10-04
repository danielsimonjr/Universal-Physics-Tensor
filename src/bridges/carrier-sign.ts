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
export function sameCarrierSign(a: number, b: number): boolean {
  return a * b >= 0;
}

/**
 * Reject opposite signs. `left` and `right` are the names in the message,
 * so `evaluateEinsteinRelation: mu_m2_per_Vs` and `q_C` keep that sentence.
 */
export function assertSameCarrierSign(a: number, b: number, left: string, right: string): void {
  if (a * b < 0) throw new CarrierSignError(`${left} and ${right} must have the same sign`);
}

/** An integer exponent whose absolute value is odd. A half power is not odd. */
function oddIntegerExponent(exp: number): boolean {
  return Number.isInteger(exp) && Math.abs(exp) % 2 === 1;
}

/**
 * A monomial that is odd in both `charge` and `carrier-mobility` is a
 * positive transport coefficient. Opposite signs throw. Any other shape,
 * including a Hall coefficient, is left alone.
 */
export function assertCarrierProductSign(
  monomial: Readonly<Record<string, number>>,
  inputs: Readonly<Record<string, number>>,
): void {
  const qExp = monomial.charge;
  const muExp = monomial['carrier-mobility'];
  if (qExp === undefined || muExp === undefined) return;
  if (!oddIntegerExponent(qExp) || !oddIntegerExponent(muExp)) return;
  const q = inputs.charge;
  const mu = inputs['carrier-mobility'];
  if (q === undefined || mu === undefined) return;
  assertSameCarrierSign(q, mu, 'charge', 'carrier-mobility');
}
