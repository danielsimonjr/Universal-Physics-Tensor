/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Comp
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-192`. Bridge. Kondo temperature from two-loop scaling.

The catalog equation is

```
k_B T_K ≈ D √g exp(−1/g)
```

`D` is the bandwidth and `g` the dimensionless exchange coupling in the
convention where the poor-man's-scaling flow reads

```
dg / dℓ = g² − g³ / 2,        ℓ = ln(D₀ / D)
```

(in Hewson's convention `g = 2 ρ J` with `ρ` the density of states per spin;
in the convention `g = ρ J` of the persona report the same flow has other
coefficients, so the convention is part of the premise). `kondo_eq` derives
the scale from that flow. With `Φ(g) = −1/g + (1/2) ln g − (1/2) ln(1 − g/2)`,
`Φ'(g) = 1 / (g² − g³/2)`, so along any solution `Φ(g(ℓ)) − ℓ` is constant
(`constant_of_has_deriv_right_zero`). If the flow starts at `g(0) = g₀` and
reaches a reference strong-coupling value `g₁` at `ℓ₁`, then `ℓ₁ = Φ(g₁) −
Φ(g₀)` and `k_B T_K = D₀ e^{−ℓ₁}`. The result is

```
k_B T_K = D₀ K(g₁) √(g₀ / (1 − g₀/2)) exp(−1/g₀),      K(g₁) = exp(−Φ(g₁)).
```

The exponent `1/g₀` and the `√g₀` are derived. The factor `(1 − g₀/2)^{−1/2}`
tends to `1` as `g₀ → 0`. The overall constant `K(g₁)` depends on which
coupling `g₁` is called strong (`K_injective`: different `g₁` give different
`K`); this is a convention, so the catalog prefactor `1` is a hypothesis
(`K(g₁) = 1`), not a theorem. The scaling equation and the two-loop
coefficient are premises; the flow is not derived from the Kondo Hamiltonian,
and no Wilson-chain or Bethe-ansatz value is claimed. The numerical example
`D = 1 eV`, `ρ J = 0.2` in the report is the convention `K = 1`, `g = ρ J`.
-/

namespace PhysJS.KondoTemperature

open Real

/-- Antiderivative of `1 / (g² − g³/2)` on `0 < g < 2`. -/
noncomputable def Phi (g : ℝ) : ℝ := -1 / g + (1 / 2) * Real.log g - (1 / 2) * Real.log (1 - g / 2)

lemma hasDerivAt_Phi (g : ℝ) (h0 : 0 < g) (h2 : g < 2) :
    HasDerivAt Phi (1 / (g ^ 2 - g ^ 3 / 2)) g := by
  have hg : g ≠ 0 := h0.ne'
  have h1g : 0 < 1 - g / 2 := by linarith
  have hinv : HasDerivAt (fun g : ℝ => -1 / g) (1 / g ^ 2) g := by
    have := (hasDerivAt_inv hg).const_mul (-1 : ℝ)
    refine (this.congr_deriv ?_).congr_of_eventuallyEq ?_
    · field_simp
    · exact Filter.Eventually.of_forall fun x => by simp [div_eq_mul_inv]
  have hlog : HasDerivAt (fun g : ℝ => (1 / 2) * Real.log g) ((1 / 2) * g⁻¹) g :=
    (Real.hasDerivAt_log hg).const_mul (1 / 2)
  have hlin : HasDerivAt (fun g : ℝ => 1 - g / 2) (-(1 / 2)) g := by
    have := (hasDerivAt_id g).div_const 2
    have h' := HasDerivAt.sub (hasDerivAt_const g (1 : ℝ)) this
    exact h'.congr_deriv (by simp)
  have hlog2 : HasDerivAt (fun g : ℝ => (1 / 2) * Real.log (1 - g / 2))
      ((1 / 2) * (-(1 / 2) / (1 - g / 2))) g := by
    have := hlin.log h1g.ne'
    exact this.const_mul (1 / 2)
  have hall := (hinv.add hlog).sub hlog2
  refine hall.congr_deriv ?_
  have h2g : 2 - g ≠ 0 := by linarith
  have hden : g ^ 2 - g ^ 3 / 2 ≠ 0 := by
    have : g ^ 2 - g ^ 3 / 2 = g ^ 2 * (1 - g / 2) := by ring
    rw [this]; exact (mul_pos (by positivity) h1g).ne'
  have h1ne : 1 - g / 2 ≠ 0 := h1g.ne'
  field_simp
  ring

/-- `Φ` is strictly increasing on `(0, 2)`. -/
lemma Phi_strictMonoOn : StrictMonoOn Phi (Set.Ioo 0 2) := by
  apply strictMonoOn_of_deriv_pos (convex_Ioo 0 2)
  · intro g hg
    exact (hasDerivAt_Phi g hg.1 hg.2).continuousAt.continuousWithinAt
  · intro g hg
    rw [interior_Ioo] at hg
    rw [(hasDerivAt_Phi g hg.1 hg.2).deriv]
    have : 0 < g ^ 2 - g ^ 3 / 2 := by
      have : g ^ 2 - g ^ 3 / 2 = g ^ 2 * (1 - g / 2) := by ring
      rw [this]; apply mul_pos (by have := hg.1; positivity); linarith [hg.2]
    positivity

/-- `exp Φ(g)` in closed form. -/
lemma exp_Phi (g : ℝ) (h0 : 0 < g) (h2 : g < 2) :
    Real.exp (Phi g) = Real.exp (-1 / g) * √(g / (1 - g / 2)) := by
  have h1g : 0 < 1 - g / 2 := by linarith
  unfold Phi
  have e1 : Real.exp ((1 / 2) * Real.log g) = √g := by
    rw [Real.sqrt_eq_rpow, Real.rpow_def_of_pos h0]; ring_nf
  have e2 : Real.exp ((1 / 2) * Real.log (1 - g / 2)) = √(1 - g / 2) := by
    rw [Real.sqrt_eq_rpow, Real.rpow_def_of_pos h1g]; ring_nf
  have hsplit : -1 / g + (1 / 2) * Real.log g - (1 / 2) * Real.log (1 - g / 2) =
      -1 / g + (1 / 2) * Real.log g + -((1 / 2) * Real.log (1 - g / 2)) := by ring
  rw [hsplit, Real.exp_add, Real.exp_add, Real.exp_neg, e1, e2, Real.sqrt_div h0.le]
  ring

/-- Kondo scale from the two-loop scaling flow.

`hflow` is `dg/dℓ = g² − g³/2` along `0 ≤ ℓ ≤ ℓ₁` with `0 < g < 2`.
`hg0`, `hg1` are the initial and reference couplings. `hTK` is
`k_B T_K = D(ℓ₁) = D₀ exp(−ℓ₁)`. `K` is the convention constant
`exp(−Φ(g₁))`.

The flow, its
two-loop coefficient and the convention for `g` are hypotheses; the constant
`K(g₁)` depends on the reference coupling and is not fixed. -/
theorem kondo_eq (g : ℝ → ℝ) (ℓ1 g0 g1 D0 kTK : ℝ)
    (hℓ1 : 0 ≤ ℓ1) (hD0 : 0 < D0)
    (hrange : ∀ ℓ, 0 ≤ ℓ → ℓ ≤ ℓ1 → 0 < g ℓ ∧ g ℓ < 2)
    (hflow : ∀ ℓ, 0 ≤ ℓ → ℓ ≤ ℓ1 → HasDerivAt g (g ℓ ^ 2 - g ℓ ^ 3 / 2) ℓ)
    (hg0 : g 0 = g0) (hg1 : g ℓ1 = g1)
    (hTK : kTK = D0 * Real.exp (-ℓ1)) :
    kTK = D0 * Real.exp (-Phi g1) *
      (√(g0 / (1 - g0 / 2)) * Real.exp (-1 / g0)) := by
  have hF : ∀ ℓ ∈ Set.Icc 0 ℓ1, HasDerivAt (fun ℓ => Phi (g ℓ) - ℓ) 0 ℓ := by
    intro ℓ hℓ
    obtain ⟨h0, h2⟩ := hrange ℓ hℓ.1 hℓ.2
    have hΦ := (hasDerivAt_Phi (g ℓ) h0 h2).comp ℓ (hflow ℓ hℓ.1 hℓ.2)
    have := hΦ.sub (hasDerivAt_id ℓ)
    refine this.congr_deriv ?_
    have hpos : g ℓ ^ 2 - g ℓ ^ 3 / 2 ≠ 0 := by
      have : g ℓ ^ 2 - g ℓ ^ 3 / 2 = g ℓ ^ 2 * (1 - g ℓ / 2) := by ring
      rw [this]
      exact (mul_pos (by positivity) (by linarith)).ne'
    rw [one_div, inv_mul_cancel₀ hpos]
    ring
  have hconst := constant_of_has_deriv_right_zero
    (f := fun ℓ => Phi (g ℓ) - ℓ) (a := 0) (b := ℓ1)
    (fun ℓ hℓ => (hF ℓ hℓ).continuousAt.continuousWithinAt)
    (fun ℓ hℓ => (hF ℓ ⟨hℓ.1, hℓ.2.le⟩).hasDerivWithinAt) ℓ1 ⟨hℓ1, le_rfl⟩
  simp only [hg0, hg1] at hconst
  have hℓ : ℓ1 = Phi g1 - Phi g0 := by linarith
  have h00 := hrange 0 le_rfl hℓ1
  rw [hg0] at h00
  have e0 := exp_Phi g0 h00.1 h00.2
  rw [hTK, hℓ, neg_sub, Real.exp_sub, e0]
  have hs : 0 < √(g0 / (1 - g0 / 2)) := by
    apply Real.sqrt_pos.mpr
    have : 0 < 1 - g0 / 2 := by linarith [h00.2]
    exact div_pos h00.1 this
  rw [Real.exp_neg]
  field_simp

/-- Different reference couplings give different constants `K`. -/
theorem K_injective (g1 g1' : ℝ) (h0 : 0 < g1) (h2 : g1 < 2) (h0' : 0 < g1') (h2' : g1' < 2)
    (hne : g1 ≠ g1') : Real.exp (-Phi g1) ≠ Real.exp (-Phi g1') := by
  intro h
  have := Real.exp_injective h
  have hPhi : Phi g1 = Phi g1' := by linarith
  exact hne (Phi_strictMonoOn.injOn ⟨h0, h2⟩ ⟨h0', h2'⟩ hPhi)

/-- The radicand carries `1 / (1 − g/2) > 1`, so for finite `g` the exact
two-loop prefactor is not `√g`; the catalog form is the limit `g → 0`. -/
theorem correction_factor_gt_one (g : ℝ) (h0 : 0 < g) (h2 : g < 2) :
    1 < (1 - g / 2)⁻¹ := by
  have h1 : 0 < 1 - g / 2 := by linarith
  have h3 : 1 - g / 2 < 1 := by linarith
  exact one_lt_inv₀ h1 |>.2 h3

end PhysJS.KondoTemperature
