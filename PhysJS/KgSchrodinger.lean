/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Inequalities

/-!
`ab-kg-schrodinger`. Covers `bound.delta` exactly, at the dispersion relation.

The non-relativistic kinetic frequency is `ω₀ x² / 2` with `x = ck/ω₀`.
The Klein–Gordon branch contributes `ω₀ (√(1 + x²) - 1)`. Their relative
error simplifies to `(√(1 + x²) - 1) / (√(1 + x²) + 1)`, which is the closed
form in the scoping report §4.3. UPT's `kgNonrelativisticError` is the same
quantity written as `|(√(1 + x²) - 1) / (x²/2) - 1|`.

The regime is `x ≤ 1/10`. The error increases with `x`, so the value at the
edge is the supremum: that supremum is `bound.delta`. This does not derive
the dispersion relation from the PDE.
-/

namespace PhysJS.KgSchrodinger

open Real PhysJS

/-- Regime edge `ck/ω₀ ≤ 0.1`. -/
noncomputable def regimeEdge : ℝ := 1 / 10

/-- Relative kinetic-frequency error `(√(1 + x²) - 1) / (√(1 + x²) + 1)`. -/
noncomputable def kgSchrodingerError (x : ℝ) : ℝ :=
  (sqrt (1 + x ^ 2) - 1) / (sqrt (1 + x ^ 2) + 1)

/-- UPT's `kgNonrelativisticError` at the regime edge. -/
noncomputable def delta : ℝ :=
  |(sqrt (1 + regimeEdge ^ 2) - 1) / (regimeEdge ^ 2 / 2) - 1|

theorem kgSchrodingerError_eq_relative (x : ℝ) (hx : x ≠ 0) :
    kgSchrodingerError x = |(sqrt (1 + x ^ 2) - 1) / (x ^ 2 / 2) - 1| := by
  have hx2 : 0 < x ^ 2 := sq_pos_of_ne_zero hx
  set s := sqrt (1 + x ^ 2)
  have hs0 : 0 ≤ 1 + x ^ 2 := by nlinarith [sq_nonneg x]
  have hs_sq : s ^ 2 = 1 + x ^ 2 := sq_sqrt hs0
  have hs1 : 1 ≤ s := sqrt_one_le_sqrt_one_add_sq x
  have hfac : x ^ 2 = (s - 1) * (s + 1) := by nlinarith [hs_sq]
  have hden : s + 1 ≠ 0 := by linarith
  have hrel : (s - 1) / (x ^ 2 / 2) = 2 / (s + 1) := by
    symm
    rw [div_eq_div_iff hden (div_ne_zero hx2.ne' two_ne_zero)]
    nlinarith [hfac]
  have hdiff : 2 / (s + 1) - 1 = (1 - s) / (s + 1) := by
    calc
      2 / (s + 1) - 1 = 2 / (s + 1) - (s + 1) / (s + 1) := by rw [div_self hden]
      _ = (2 - (s + 1)) / (s + 1) := by rw [div_sub_div_same]
      _ = (1 - s) / (s + 1) := by ring
  have hnonpos : (1 - s) / (s + 1) ≤ 0 :=
    div_nonpos_of_nonpos_of_nonneg (by linarith) (by linarith)
  calc
    kgSchrodingerError x = (s - 1) / (s + 1) := by simp [kgSchrodingerError, s]
    _ = -((1 - s) / (s + 1)) := by
      calc
        (s - 1) / (s + 1) = (-(1 - s)) / (s + 1) := by ring
        _ = -((1 - s) / (s + 1)) := by rw [neg_div]
    _ = |(s - 1) / (x ^ 2 / 2) - 1| := by
      rw [hrel, hdiff, abs_of_nonpos hnonpos]

theorem kgSchrodingerError_monotone {x y : ℝ} (hx : 0 ≤ x) (hxy : x ≤ y) :
    kgSchrodingerError x ≤ kgSchrodingerError y := by
  have hs : sqrt (1 + x ^ 2) ≤ sqrt (1 + y ^ 2) := by
    apply sqrt_le_sqrt
    have : x ^ 2 ≤ y ^ 2 := pow_le_pow_left₀ hx hxy 2
    linarith
  unfold kgSchrodingerError
  exact div_sub_one_mono (sqrt_one_le_sqrt_one_add_sq x) hs

/-- The error is monotone on `0 ≤ x ≤ 1/10`, and its edge value is `delta`.

Covers `bound.delta` of `ab-kg-schrodinger` at the dispersion relation. -/
theorem covers_bound_delta :
    (∀ x y : ℝ, 0 ≤ x → x ≤ y → y ≤ regimeEdge →
      kgSchrodingerError x ≤ kgSchrodingerError y) ∧
    kgSchrodingerError regimeEdge = delta := by
  refine ⟨?_, ?_⟩
  · intro x y hx hxy _hy
    exact kgSchrodingerError_monotone hx hxy
  · simpa [delta] using kgSchrodingerError_eq_relative regimeEdge (by norm_num [regimeEdge])

/-- The phase-velocity error `√(1 + x²) - 1` is a different dictionary.
It is the `ab-klein-gordon-wave` error, not the kinetic-frequency error. -/
theorem wrong_dictionary :
    sqrt (1 + regimeEdge ^ 2) - 1 ≠ kgSchrodingerError regimeEdge := by
  intro h
  have hs : (1 : ℝ) < sqrt (1 + regimeEdge ^ 2) := by
    rw [← sqrt_one]
    exact sqrt_lt_sqrt (by norm_num) (by norm_num [regimeEdge])
  set s := sqrt (1 + regimeEdge ^ 2)
  have hEq : (s - 1) / (s + 1) = s - 1 := by
    simpa [kgSchrodingerError, s] using h.symm
  have hden : s + 1 ≠ 0 := by linarith
  have hmul : s - 1 = (s - 1) * (s + 1) := by
    calc
      s - 1 = (s - 1) / (s + 1) * (s + 1) := by rw [div_mul_cancel₀ _ hden]
      _ = (s - 1) * (s + 1) := by rw [hEq]
  have : (s - 1) * s = 0 := by nlinarith [hmul]
  rcases mul_eq_zero.mp this with h0 | h0
  · linarith
  · linarith

end PhysJS.KgSchrodinger
