/**
 * BE-86 — Reynolds analogy at Prandtl number 1,
 *   St = C_f / 2.
 *
 * Wall fluxes τ = μ du/dy and q = k dT/dy, with
 * C_f = τ/(ρ U²/2), h = q/ΔT, St = h/(ρ U c_p), and Pr = μ c_p/k,
 * satisfy St Pr = C_f/2 when the normalized wall gradients agree.
 * That common slope is the equal-diffusivity hypothesis. At Pr = 1,
 * St = C_f/2. Pr ≠ 1 with nonzero skin friction is not this equality.
 * Not a Nusselt correlation.
 *
 * The overlay formalRef is `PhysJS.ReynoldsAnalogy.reynolds_eq`.
 *
 * @module bridges/be86-reynolds-analogy
 */

/**
 * Inputs for {@link evaluateReynoldsAnalogy}.
 * @internal
 */
export interface ReynoldsAnalogyInputs {
  /**
   * Skin-friction coefficient. The 1/2 in the catalog equation is the
   * normalization C_f = τ/(ρ U²/2), already inside this number.
   */
  readonly C_f: number;
}

/**
 * Result of {@link evaluateReynoldsAnalogy}.
 * @internal
 */
export interface ReynoldsAnalogyResult {
  readonly C_f: number;
  /** Stanton number at Pr = 1 with matched wall slopes. */
  readonly St: number;
}

/**
 * Evaluate `St = C_f / 2` under the matched-slope hypothesis at Pr = 1.
 *
 * Prandtl number and the wall slopes are hypotheses, not inputs. The
 * function does not accept Pr ≠ 1 and still return this equality.
 *
 * @internal
 */
export function evaluateReynoldsAnalogy({ C_f }: ReynoldsAnalogyInputs): ReynoldsAnalogyResult {
  if (!Number.isFinite(C_f)) {
    throw new Error('evaluateReynoldsAnalogy: C_f must be finite');
  }
  return { C_f, St: C_f / 2 };
}
