/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import lean.MottGurney

/-!
`be-171`. Bridge. Cantilever tip stiffness.

The catalog equation is

```
k = 3 E I / L³
```

for a clamped–free Euler–Bernoulli beam with a point load `F` at the tip.
`stiffness_eq` derives it. The bending moment at `x` from the clamp is
`M(x) = F (L − x)`, and the beam equation is `E I w'' = M`. The clamp gives
`w(0) = 0` and `w'(0) = 0`. Integrating twice gives

```
w(x) = F (3 L x² − x³) / (6 E I),    w(L) = F L³ / (3 E I)
```

and `k = F / w(L)`. For a rectangle `I = w t³ / 12`, so `k = E w t³ / (4 L³)`.
Premises: small deflection, uniform section, slender (no shear), rigid
clamp. `coefficient_not_fixed` separates any prefactor other than `3`, and
`wrong_power` separates `L²`. This is not buckling (`be-78`), which also
uses `E I` but with an axial load.
-/

namespace PhysJS.CantileverStiffness

/-- Two functions with the same derivative everywhere and the same value at
`0` agree. -/
lemma eq_of_same_deriv (f G : ℝ → ℝ) (h : ℝ → ℝ)
    (hf : ∀ y, HasDerivAt f (h y) y) (hG : ∀ y, HasDerivAt G (h y) y)
    (h0 : f 0 = G 0) (x : ℝ) : f x = G x := by
  have hg : ∀ y, HasDerivAt (fun t => f t - G t) 0 y := fun y =>
    ((hf y).sub (hG y)).congr_deriv (by ring)
  have := PhysJS.MottGurney.eq_of_deriv_zero (fun t => f t - G t) hg x 0
  simp only [h0, sub_self] at this
  linarith

/-- Slope of a cantilever: `E I w' = F (L x − x² / 2)`. -/
theorem slope_eq (θ : ℝ → ℝ) (F L EI : ℝ)
    (hθ : ∀ y, HasDerivAt θ (F * (L - y) / EI) y) (h0 : θ 0 = 0) (x : ℝ) :
    θ x = F * (L * x - x ^ 2 / 2) / EI := by
  have hG : ∀ y, HasDerivAt (fun t => F * (L * t - t ^ 2 / 2) / EI)
      (F * (L - y) / EI) y := by
    intro y
    have hsq : HasDerivAt (fun t : ℝ => t ^ 2) (2 * y) y := by
      simpa using hasDerivAt_pow 2 y
    have hlin : HasDerivAt (fun t : ℝ => L * t) L y := by
      simpa using (hasDerivAt_id y).const_mul L
    have h1 := ((hlin.sub (hsq.div_const 2)).const_mul F).div_const EI
    exact h1.congr_deriv (by ring)
  exact eq_of_same_deriv θ _ _ hθ hG (by simp [h0]) x

/-- Cantilever tip stiffness from the beam equation.

`hbeam` is `E I w'' = F (L − x)`, with `w''` the derivative of the slope `θ`.
`hk` is `k = F / w(L)`. `hI` is the rectangular section `I = b t³ / 12`.

Kind `bridge` on `PhysJS.CantileverStiffness.stiffness_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not
shear deflection, not a rotating clamp, and not the effective-mass
frequency. -/
theorem stiffness_eq (w θ w2 : ℝ → ℝ) (F L E I k b t : ℝ)
    (hE : 0 < E) (hI : 0 < I) (hL : 0 < L) (hF : F ≠ 0)
    (hw : ∀ y, HasDerivAt w (θ y) y) (hθ : ∀ y, HasDerivAt θ (w2 y) y)
    (hbeam : ∀ y, E * I * w2 y = F * (L - y))
    (hw0 : w 0 = 0) (hθ0 : θ 0 = 0) (hk : k = F / w L) :
    (∀ x, w x = F * (3 * L * x ^ 2 - x ^ 3) / (6 * (E * I))) ∧
      w L = F * L ^ 3 / (3 * (E * I)) ∧
      k = 3 * E * I / L ^ 3 ∧
      (I = b * t ^ 3 / 12 → k = E * b * t ^ 3 / (4 * L ^ 3)) := by
  have hEI : E * I ≠ 0 := (mul_pos hE hI).ne'
  have hw2 : ∀ y, w2 y = F * (L - y) / (E * I) := by
    intro y
    field_simp [hEI]
    linarith [hbeam y]
  have hθ' : ∀ y, HasDerivAt θ (F * (L - y) / (E * I)) y := by
    intro y
    have := hθ y
    rwa [hw2 y] at this
  have hslope := slope_eq θ F L (E * I) hθ' hθ0
  have hw' : ∀ y, HasDerivAt w (F * (L * y - y ^ 2 / 2) / (E * I)) y := by
    intro y
    have := hw y
    rwa [hslope y] at this
  have hdefl : ∀ x, w x = F * (3 * L * x ^ 2 - x ^ 3) / (6 * (E * I)) := by
    intro x
    have hG : ∀ y, HasDerivAt (fun t => F * (3 * L * t ^ 2 - t ^ 3) / (6 * (E * I)))
        (F * (L * y - y ^ 2 / 2) / (E * I)) y := by
      intro y
      have h2 : HasDerivAt (fun t : ℝ => t ^ 2) (2 * y) y := by
        simpa using hasDerivAt_pow 2 y
      have h3 : HasDerivAt (fun t : ℝ => t ^ 3) (3 * y ^ 2) y := by
        simpa using hasDerivAt_pow 3 y
      have h1 := (((h2.const_mul (3 * L)).sub h3).const_mul F).div_const (6 * (E * I))
      exact h1.congr_deriv (by field_simp [hEI]; ring)
    exact eq_of_same_deriv w _ _ hw' hG (by simp [hw0]) x
  have htip : w L = F * L ^ 3 / (3 * (E * I)) := by
    rw [hdefl L]
    field_simp [hEI]
    ring
  have hkval : k = 3 * E * I / L ^ 3 := by
    rw [hk, htip]
    have hL3 : L ^ 3 ≠ 0 := by positivity
    field_simp [hEI, hF, hL3]
  refine ⟨hdefl, htip, hkval, ?_⟩
  intro hIb
  rw [hkval, hIb]
  field_simp [hL.ne']
  ring

/-- A prefactor other than `3` is a different stiffness. -/
theorem coefficient_not_fixed (c E I L : ℝ) (hc : c ≠ 3) (hEI : E * I ≠ 0) (hL : L ≠ 0) :
    c * E * I / L ^ 3 ≠ 3 * E * I / L ^ 3 := by
  intro h
  have hL3 : L ^ 3 ≠ 0 := pow_ne_zero 3 hL
  field_simp [hL3] at h
  apply hc
  have : (c - 3) * (E * I) = 0 := by linarith
  rcases mul_eq_zero.mp this with h1 | h1
  · linarith
  · exact absurd h1 hEI

/-- `L²` in place of `L³` is a different stiffness off `L = 1`. -/
theorem wrong_power (E I L : ℝ) (hEI : E * I ≠ 0) (hL : 0 < L) (hL1 : L ≠ 1) :
    3 * E * I / L ^ 2 ≠ 3 * E * I / L ^ 3 := by
  intro h
  have hL2 : L ^ 2 ≠ 0 := by positivity
  have hL3 : L ^ 3 ≠ 0 := by positivity
  field_simp [hL2, hL3] at h
  have h2 : (E * I) * (L - 1) = 0 := by linarith
  rcases mul_eq_zero.mp h2 with h3 | h3
  · exact hEI h3
  · exact hL1 (by linarith)

end PhysJS.CantileverStiffness
