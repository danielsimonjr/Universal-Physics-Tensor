/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-113`. Bridge. Landau damping of a Maxwellian, as an algebraic residue.

`be-113.bohmGross`. Derivation step. `bohm_gross_exponent`.

Proved under these hypotheses. The distribution is the one-dimensional
Maxwellian

```
f(v) = n / (v_t √(2π)) exp(−v² / (2 v_t²))
```

with `v_t² = k_B T / m`. Its slope is `∂f/∂v = −(v / v_t²) f`, proved
here by the chain rule. The Landau residue is a hypothesis, not a
contour integral:

```
γ = (π ω³ / (2 n k²)) (∂f/∂v)|_{ω/k}
```

From that residue and the Maxwellian slope,

```
γ = −√(π/8) ω (ω / (k v_t))³ exp(−ω² / (2 k² v_t²))
```

The plasma dispersion function is not evaluated. Bohm–Gross
`ω² = ω_p² (1 + 3 k² λ_D²)` fixes the exponent
`ω² / (2 k² v_t²) = 3/2 + 1/(2 k² λ_D²)` when `λ_D² = v_t² / ω_p²`.
Replacing the prefactor `ω (ω/(k v_t))³` by `ω_p /(k λ_D)³` is the
weak-damping hypothesis `k λ_D ≪ 1`. It is not implied by Bohm–Gross
alone, and `damping_eq` does not make that replacement.
-/

namespace PhysJS.LandauDamping

open Filter

noncomputable def maxwellian (n vt v : ℝ) : ℝ :=
  n / (vt * Real.sqrt (2 * Real.pi)) * Real.exp (-v ^ 2 / (2 * vt ^ 2))

lemma sqrt_pi_eight :
    Real.pi / (2 * Real.sqrt (2 * Real.pi)) = Real.sqrt (Real.pi / 8) := by
  have hpos : 0 < Real.pi / (2 * Real.sqrt (2 * Real.pi)) := by positivity
  refine (sq_eq_sq₀ hpos.le (Real.sqrt_nonneg _)).mp ?_
  rw [div_pow, mul_pow, Real.sq_sqrt (by positivity : (0 : ℝ) ≤ 2 * Real.pi),
    Real.sq_sqrt (by positivity : (0 : ℝ) ≤ Real.pi / 8)]
  field_simp
  ring

/-- Slope of the Maxwellian. The thermal speed is nonzero. -/
theorem maxwellian_slope (n vt v : ℝ) (hvt : vt ≠ 0) :
    deriv (fun u => maxwellian n vt u) v = -(v / vt ^ 2) * maxwellian n vt v := by
  have hden : (2 : ℝ) * vt ^ 2 ≠ 0 := mul_ne_zero two_ne_zero (pow_ne_zero 2 hvt)
  have hsq : HasDerivAt (fun u : ℝ => u ^ 2) (2 * v) v := by
    have hmul := ((hasDerivAt_id v).mul (hasDerivAt_id v)).congr_deriv
      (by ring : (1 : ℝ) * v + v * 1 = 2 * v)
    apply hmul.congr_of_eventuallyEq
    refine Filter.Eventually.of_forall fun u => ?_
    simp only [Pi.mul_apply, id_eq]
    ring
  have harg : HasDerivAt (fun u => -(u ^ 2) / (2 * vt ^ 2)) (-(v / vt ^ 2)) v := by
    have hdiv := (hsq.const_mul (-1)).div_const (2 * vt ^ 2)
    have hnum : (-1) * (2 * v) / (2 * vt ^ 2) = -(v / vt ^ 2) := by
      field_simp [hden]
    have hdiv' := hdiv.congr_deriv hnum
    apply hdiv'.congr_of_eventuallyEq
    refine Filter.Eventually.of_forall fun u => ?_
    ring
  have hfun : (fun u => maxwellian n vt u) =
      fun u => n / (vt * Real.sqrt (2 * Real.pi)) *
        Real.exp (-(u ^ 2) / (2 * vt ^ 2)) := by
    funext u
    rfl
  have hexp : HasDerivAt (fun u => Real.exp (-(u ^ 2) / (2 * vt ^ 2)))
      (Real.exp (-(v ^ 2) / (2 * vt ^ 2)) * -(v / vt ^ 2)) v := harg.exp
  have hmul := hexp.const_mul (n / (vt * Real.sqrt (2 * Real.pi)))
  rw [congrArg (fun f => deriv f v) hfun, hmul.deriv]
  unfold maxwellian
  ring

/-- Residue formula plus the Maxwellian slope. -/
theorem damping_eq (γ ω k n vt : ℝ)
    (hk : k ≠ 0) (hn : n ≠ 0) (hvt : vt ≠ 0)
    (hγ : γ = Real.pi * ω ^ 3 / (2 * n * k ^ 2) *
      deriv (fun v => maxwellian n vt v) (ω / k)) :
    γ = -Real.sqrt (Real.pi / 8) * ω * (ω / (k * vt)) ^ 3 *
      Real.exp (-ω ^ 2 / (2 * k ^ 2 * vt ^ 2)) := by
  have hslope := maxwellian_slope n vt (ω / k) hvt
  have hraw : γ = -(Real.pi / (2 * Real.sqrt (2 * Real.pi))) * ω * (ω / (k * vt)) ^ 3 *
      Real.exp (-ω ^ 2 / (2 * k ^ 2 * vt ^ 2)) := by
    rw [hγ, hslope]
    unfold maxwellian
    field_simp [hk, hn, hvt, Real.pi_ne_zero,
      Real.sqrt_ne_zero'.mpr (by positivity : (0 : ℝ) < 2 * Real.pi)]
  rw [hraw, sqrt_pi_eight]

/-- Bohm–Gross fixes the exponent. It does not replace `ω` by `ω_p` in the prefactor. -/
theorem bohm_gross_exponent (ω ωp k lam vt : ℝ)
    (hωp : ωp ≠ 0) (hk : k ≠ 0) (hlam : lam ≠ 0) (hvt : vt ≠ 0)
    (hω : ω ^ 2 = ωp ^ 2 * (1 + 3 * k ^ 2 * lam ^ 2))
    (hlamdef : lam ^ 2 = vt ^ 2 / ωp ^ 2) :
    ω ^ 2 / (2 * k ^ 2 * vt ^ 2) = 3 / 2 + 1 / (2 * k ^ 2 * lam ^ 2) := by
  rw [hω, hlamdef]
  field_simp [hωp, hk, hlam, hvt]
  ring

end PhysJS.LandauDamping
