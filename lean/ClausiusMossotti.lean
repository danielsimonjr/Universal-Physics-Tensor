/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-185`. Bridge. Clausius–Mossotti relation.

The catalog equation is

```
(ε_r − 1) / (ε_r + 2) = N α / (3 ε₀)
```

`N` is the number density and `α` the molecular polarizability in `C m² / V`.
`clausius_mossotti_eq` derives it from three premises at a nonzero
macroscopic field `E`: the definition of the relative permittivity,
`P = ε₀ (ε_r − 1) E`; the induced moment of each molecule in the local field,
`P = N α E_loc`; and the Lorentz local field of a cubic or isotropic site,
`E_loc = E + P / (3 ε₀)`. Eliminating `P` and `E_loc` gives the relation.

`without_lorentz_field` is the same chain with `E_loc = E`: it gives
`ε_r − 1 = N α / ε₀`, which is a different relation whenever `N α ≠ 0`.
`units_do_not_fix_three` separates `N α / ε₀` from `N α / (3 ε₀)`. Not a
statement about polar molecules, anisotropic sites, or the frequency
dependence of `α`.
-/

namespace PhysJS.ClausiusMossotti

/-- Clausius–Mossotti from the Lorentz local field.

`hdef` is `P = ε₀ (ε_r − 1) E`. `hpol` is `P = N α E_loc`. `hlorentz` is
`E_loc = E + P / (3 ε₀)`.

Kind `bridge` on `PhysJS.ClausiusMossotti.clausius_mossotti_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not a derivation of the Lorentz field or of `α`. -/
theorem clausius_mossotti_eq (εr N α ε0 E P Eloc : ℝ)
    (hε0 : 0 < ε0) (hE : E ≠ 0) (hden : εr + 2 ≠ 0)
    (hdef : P = ε0 * (εr - 1) * E)
    (hpol : P = N * α * Eloc)
    (hlorentz : Eloc = E + P / (3 * ε0)) :
    (εr - 1) / (εr + 2) = N * α / (3 * ε0) := by
  have h0 := hε0.ne'
  rw [hlorentz, hdef] at hpol
  have key : (εr - 1) * (3 * ε0) = N * α * (εr + 2) := by
    field_simp at hpol
    linear_combination hpol
  rw [div_eq_div_iff hden (by positivity)]
  exact key

/-- Without the Lorentz field the relation is `ε_r − 1 = N α / ε₀`. -/
theorem without_lorentz_field (εr N α ε0 E P : ℝ)
    (hε0 : 0 < ε0) (hE : E ≠ 0)
    (hdef : P = ε0 * (εr - 1) * E)
    (hpol : P = N * α * E) :
    εr - 1 = N * α / ε0 := by
  have h0 := hε0.ne'
  rw [hdef] at hpol
  rw [eq_div_iff h0]
  have : (ε0 * (εr - 1) - N * α) * E = 0 := by linarith
  rcases mul_eq_zero.mp this with h | h
  · linarith
  · exact absurd h hE

/-- The no-Lorentz relation and Clausius–Mossotti cannot both hold for a
polarizable medium. -/
theorem lorentz_changes_relation (εr N α ε0 : ℝ) (hε0 : 0 < ε0) (hNα : N * α ≠ 0)
    (hden : εr + 2 ≠ 0) (h : εr - 1 = N * α / ε0) :
    (εr - 1) / (εr + 2) ≠ N * α / (3 * ε0) := by
  intro hcm
  have h0 := hε0.ne'
  rw [div_eq_div_iff hden (by positivity)] at hcm
  have h1 : (εr - 1) * (3 * ε0) = N * α * (εr + 2) := hcm
  have h2 : N * α = ε0 * (εr - 1) := by
    rw [h]; field_simp
  rw [h2] at h1
  have h3 : ε0 * (εr - 1) ^ 2 = 0 := by linear_combination -h1
  have h4 : εr - 1 = 0 := by
    rcases mul_eq_zero.mp h3 with h | h
    · exact absurd h h0
    · exact pow_eq_zero_iff (two_ne_zero) |>.mp h
  apply hNα
  rw [h2, h4, mul_zero]

/-- Any other numerical factor than `3` is a different relation. -/
theorem units_do_not_fix_three (N α ε0 c : ℝ) (hNα : N * α ≠ 0) (hε0 : 0 < ε0) (hc : c ≠ 3) :
    N * α / (c * ε0) ≠ N * α / (3 * ε0) := by
  intro h
  have h0 := hε0.ne'
  by_cases hc0 : c = 0
  · subst hc0
    rw [zero_mul, div_zero] at h
    have h' := h.symm
    rw [div_eq_zero_iff] at h'
    rcases h' with h' | h'
    · exact hNα h'
    · exact absurd h' (mul_ne_zero (by norm_num) h0)
  · rw [div_eq_div_iff (mul_ne_zero hc0 h0) (by positivity)] at h
    have : (3 - c) * (N * α * ε0) = 0 := by linarith
    rcases mul_eq_zero.mp this with h' | h'
    · exact hc (by linarith)
    · exact mul_ne_zero hNα h0 h'

end PhysJS.ClausiusMossotti
