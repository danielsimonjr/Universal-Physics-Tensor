/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Normed.Group.FunctionSeries
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Analysis.SpecificLimits.Basic
import Mathlib.Topology.Order.IntermediateValue
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-228`. Bridge. Rayleigh diffraction limit of a circular aperture.

The catalog equation is

```
θ = 1.22 λ / D
```

`rayleigh_eq` derives the form `θ = (j / π) λ / D`. The far-field
amplitude of a uniformly lit circular aperture of diameter `D` is
proportional to `2 J₁(x) / x` with `x = π D sin θ / λ`. The first dark ring
is the first positive zero `j` of the Bessel function `J₁`. The Rayleigh
criterion puts the peak of one point image on that zero of the other,
so `π D sin θ / λ = j`, and for small `θ` (`sin θ = θ`)
`θ = (j/π) λ/D`. The `1.22` is `j / π` with `j = j₁,₁ ≈ 3.8317`.

Scope. The Fraunhofer disc integral that produces `J₁` is a premise, not
derived here. `J1` is defined by its power series
`Σ (−1)^k (x/2)^{2k+1} / (k! (k+1)!)`. `exists_zero_bracket` proves, by
the alternating-series error bound and the intermediate value theorem,
that `J1` has a zero in `(3.8, 3.9)`; `coefficient_bracket` turns that into
`1.2 < j/π < 1.25`. That the zero is the *first* positive zero is a premise
(`hfirst`), and the decimal `3.8317` is not computed: `catalog_value` takes
it as a hypothesis on `j` and shows `j / π` is within `0.001` of `1.22`.
The Rayleigh peak-on-first-zero criterion is a convention for resolvability,
not a measurement limit.
-/

namespace PhysJS.RayleighCriterion

open Real Filter Finset Set

/-- Series term `(x/2)^{2k+1} / (k! (k+1)!)` of `J₁`. -/
noncomputable def term (x : ℝ) (k : ℕ) : ℝ :=
  (x / 2) ^ (2 * k + 1) / ((k.factorial : ℝ) * ((k + 1).factorial : ℝ))

/-- Bessel function `J₁` by its power series. -/
noncomputable def J1 (x : ℝ) : ℝ := ∑' k : ℕ, (-1 : ℝ) ^ k * term x k

theorem term_nonneg (x : ℝ) (hx : 0 ≤ x) (k : ℕ) : 0 ≤ term x k := by
  unfold term
  positivity

theorem term_le (x : ℝ) (hx : 0 ≤ x) (hx4 : x ≤ 4) (k : ℕ) :
    term x k ≤ 2 * (4 ^ k / (k.factorial : ℝ)) := by
  unfold term
  have hf : (0 : ℝ) < k.factorial := by exact_mod_cast Nat.factorial_pos k
  have hf1 : (1 : ℝ) ≤ ((k + 1).factorial : ℝ) := by
    have : 1 ≤ (k + 1).factorial := Nat.factorial_pos _
    exact_mod_cast this
  have hp : (x / 2) ^ (2 * k + 1) ≤ 2 * 4 ^ k := by
    have h2 : x / 2 ≤ 2 := by linarith
    calc (x / 2) ^ (2 * k + 1) ≤ 2 ^ (2 * k + 1) :=
          pow_le_pow_left₀ (by linarith) h2 _
      _ = 2 * 4 ^ k := by rw [pow_succ, pow_mul]; norm_num; ring
  rw [div_le_iff₀ (by positivity)]
  have h4 : (0 : ℝ) ≤ 4 ^ k / k.factorial := by positivity
  calc (x / 2) ^ (2 * k + 1) ≤ 2 * 4 ^ k := hp
    _ = 2 * (4 ^ k / k.factorial) * k.factorial := by field_simp
    _ ≤ 2 * (4 ^ k / k.factorial) * (k.factorial * ((k + 1).factorial : ℝ)) := by
        apply mul_le_mul_of_nonneg_left _ (by positivity)
        nlinarith

theorem summable_term (x : ℝ) (hx : 0 ≤ x) (hx4 : x ≤ 4) : Summable (term x) := by
  have hs : Summable (fun k : ℕ => 2 * ((4 : ℝ) ^ k / (k.factorial : ℝ))) :=
    (Real.summable_pow_div_factorial 4).mul_left 2
  exact Summable.of_nonneg_of_le (term_nonneg x hx) (term_le x hx hx4) hs

theorem continuousOn_J1 : ContinuousOn J1 (Icc (19 / 5 : ℝ) (39 / 10)) := by
  have hs : Summable (fun k : ℕ => 2 * ((4 : ℝ) ^ k / (k.factorial : ℝ))) :=
    (Real.summable_pow_div_factorial 4).mul_left 2
  unfold J1
  refine continuousOn_tsum (u := fun k : ℕ => 2 * ((4 : ℝ) ^ k / (k.factorial : ℝ)))
    (fun k => ?_) hs ?_
  · apply Continuous.continuousOn
    unfold term
    fun_prop
  · intro k x hx
    have hx0 : 0 ≤ x := by linarith [hx.1]
    have hx4 : x ≤ 4 := by linarith [hx.2]
    rw [norm_mul, norm_pow, norm_neg, norm_one, one_pow, one_mul,
      Real.norm_of_nonneg (term_nonneg x hx0 k)]
    exact term_le x hx0 hx4 k

theorem term_succ (x : ℝ) (n : ℕ) :
    term x (n + 1) = term x n * ((x / 2) ^ 2 / (((n : ℝ) + 1) * ((n : ℝ) + 2))) := by
  unfold term
  have h1 : (n.factorial : ℝ) ≠ 0 := by exact_mod_cast Nat.factorial_ne_zero n
  have h2 : ((n + 1).factorial : ℝ) ≠ 0 := by exact_mod_cast Nat.factorial_ne_zero _
  rw [show 2 * (n + 1) + 1 = (2 * n + 1) + 2 by ring, pow_add]
  rw [Nat.factorial_succ (n + 1), Nat.factorial_succ n]
  push_cast
  field_simp
  ring

theorem term_succ_le (x : ℝ) (hx : 0 ≤ x) (hx4 : x ≤ 4) (n : ℕ) (hn : 1 ≤ n) :
    term x (n + 1) ≤ term x n := by
  rw [term_succ]
  have hn' : (1 : ℝ) ≤ n := by exact_mod_cast hn
  have hq : (x / 2) ^ 2 / (((n : ℝ) + 1) * ((n : ℝ) + 2)) ≤ 1 := by
    rw [div_le_one (by positivity)]
    nlinarith
  have := term_nonneg x hx n
  nlinarith

/-- Terms shifted by one are antitone. -/
theorem shift_antitone (x : ℝ) (hx : 0 ≤ x) (hx4 : x ≤ 4) :
    Antitone (fun k => term x (k + 1)) := by
  refine antitone_nat_of_succ_le (fun k => ?_)
  exact term_succ_le x hx hx4 (k + 1) (by omega)

/-- `J₁ x = term 0 − Σ (−1)^k term (k+1)`. -/
theorem J1_eq (x : ℝ) (hx : 0 ≤ x) (hx4 : x ≤ 4) :
    J1 x = term x 0 - ∑' k : ℕ, (-1 : ℝ) ^ k * term x (k + 1) := by
  unfold J1
  have hsum : Summable (fun k : ℕ => (-1 : ℝ) ^ k * term x k) :=
    (summable_term x hx hx4).alternating
  rw [hsum.tsum_eq_zero_add]
  simp only [pow_zero, one_mul, pow_succ]
  have : ∀ k : ℕ, (-1 : ℝ) ^ k * -1 * term x (k + 1) = -((-1 : ℝ) ^ k * term x (k + 1)) := by
    intro k; ring
  simp_rw [this, tsum_neg]
  ring

/-- Two-sided bound on `J₁` from the alternating-series error bound after
`n` shifted terms. -/
theorem J1_bounds (x : ℝ) (hx : 0 ≤ x) (hx4 : x ≤ 4) (n : ℕ) :
    |J1 x - (term x 0 - ∑ i ∈ range n, (-1 : ℝ) ^ i * term x (i + 1))| ≤
      term x (n + 1) := by
  have hs : Summable (fun k => term x (k + 1)) :=
    (summable_nat_add_iff 1).mpr (summable_term x hx hx4)
  have hb := alternating_series_error_bound (fun k => term x (k + 1))
    (shift_antitone x hx hx4) hs n
  rw [J1_eq x hx hx4]
  have : term x 0 - ∑' k : ℕ, (-1 : ℝ) ^ k * term x (k + 1) -
      (term x 0 - ∑ i ∈ range n, (-1 : ℝ) ^ i * term x (i + 1)) =
      -((∑' k : ℕ, (-1 : ℝ) ^ k * term x (k + 1)) -
        ∑ i ∈ range n, (-1 : ℝ) ^ i * term x (i + 1)) := by ring
  rw [this, abs_neg]
  exact hb

theorem J1_pos_at : 0 < J1 (19 / 5) := by
  have hb := J1_bounds (19 / 5) (by norm_num) (by norm_num) 5
  have h := (abs_le.mp hb).1
  simp only [term, sum_range_succ, sum_range_zero, Nat.factorial] at h
  norm_num at h
  linarith

theorem J1_neg_at : J1 (39 / 10) < 0 := by
  have hb := J1_bounds (39 / 10) (by norm_num) (by norm_num) 5
  have h := (abs_le.mp hb).2
  simp only [term, sum_range_succ, sum_range_zero, Nat.factorial] at h
  norm_num at h
  linarith

/-- `J1` has a zero in `(3.8, 3.9)`. That it is the first positive zero is
not proved here. -/
theorem exists_zero_bracket : ∃ j, 19 / 5 < j ∧ j < 39 / 10 ∧ J1 j = 0 := by
  have hmem : (0 : ℝ) ∈ Ioo (J1 (39 / 10)) (J1 (19 / 5)) := ⟨J1_neg_at, J1_pos_at⟩
  obtain ⟨c, hc, hc0⟩ := intermediate_value_Ioo' (by norm_num : (19 / 5 : ℝ) ≤ 39 / 10)
    continuousOn_J1 hmem
  exact ⟨c, hc.1, hc.2, hc0⟩

/-- A zero in `(3.8, 3.9)` gives a coefficient `j/π` in `(1.2, 1.25)`. -/
theorem coefficient_bracket (j : ℝ) (h1 : 19 / 5 < j) (h2 : j < 39 / 10) :
    6 / 5 < j / π ∧ j / π < 5 / 4 := by
  have hl := Real.pi_gt_d2
  have hu := Real.pi_lt_d2
  have hpi : 0 < π := Real.pi_pos
  constructor
  · rw [lt_div_iff₀ hpi]; nlinarith
  · rw [div_lt_iff₀ hpi]; nlinarith

/-- The catalog value: with the hypothesised `j = 3.8317` the coefficient
`j/π` differs from `1.22` by less than `0.001`. -/
theorem catalog_value (j : ℝ) (hj : j = 38317 / 10000) :
    |j / π - 122 / 100| < 1 / 1000 := by
  have hl := Real.pi_gt_d4
  have hu := Real.pi_lt_d4
  have hpi : 0 < π := Real.pi_pos
  rw [hj, abs_lt]
  constructor
  · have : (122 / 100 : ℝ) - 1 / 1000 < 38317 / 10000 / π := by
      rw [lt_div_iff₀ hpi]; nlinarith
    linarith
  · have : (38317 / 10000 : ℝ) / π < 122 / 100 + 1 / 1000 := by
      rw [div_lt_iff₀ hpi]; nlinarith
    linarith

/-- Rayleigh angle from the first Airy zero.

`hj` and `hfirst` say `j` is the first positive zero of `J1`; `harg` is
the first dark ring `x = π D sin θ / λ = j`; `hsmall` is `sin θ = θ`.

Not a
derivation of the disc diffraction integral, not a proof that `j` is the
first zero, and the decimal `1.22` is the hypothesised `3.8317 / π`. -/
theorem rayleigh_eq (lam D j s θ : ℝ) (hlam : 0 < lam) (hD : 0 < D)
    (hj : J1 j = 0)
    (hfirst : ∀ x, 0 < x → x < j → J1 x ≠ 0)
    (harg : π * D * s / lam = j) (hsmall : θ = s) :
    θ = (j / π) * lam / D ∧ J1 j = 0 ∧ ∀ x, 0 < x → x < j → J1 x ≠ 0 := by
  refine ⟨?_, hj, hfirst⟩
  have hpi : 0 < π := Real.pi_pos
  rw [hsmall]
  field_simp at harg ⊢
  linarith

/-- The coefficient is not fixed by units: another zero `j'` of `J1`
(for example a later one) gives a different angle. -/
theorem coefficient_not_fixed (lam D j j' : ℝ) (hlam : 0 < lam) (hD : 0 < D)
    (hne : j ≠ j') :
    (j / π) * lam / D ≠ (j' / π) * lam / D := by
  intro h
  have hpi : 0 < π := Real.pi_pos
  field_simp at h
  exact hne h

end PhysJS.RayleighCriterion
