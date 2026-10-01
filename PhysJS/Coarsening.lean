/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Dimensional
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Data.Fin.VecNotation
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Linarith

/-!
`be-15`. Derivation step. `z = 2` if and only if `L² ∝ t`.

For `Γ > 0`, `t > 0`, and `z > 0`,

```
L(t) = L₀ (t / t₀) ^ (1 / z)
Γ = L₀² / t₀
```

obeys `L(t)² = Γ t` if and only if `z = 2`. At `t = t₀` the ratio holds
for every `z`, so that direction assumes `t ≠ t₀`. Model B's `z = 3`
gives `L³ ∝ t` and fails `L² = Γ t`. This is not the Model A Langevin
equation. The Langevin kinetic coefficient is a different `Γ`.

`length_monomial_at` is the Buckingham step. Its hypothesis is that `L`
is a dimensionally homogeneous function of `Γ` and `t` alone and that
`[Γ] = L^z T⁻¹`. The conclusion is `L = C (Γ t)^{1/z}`, with `C` not
fixed. The pure number `z` is that dimension assignment: every positive
rational `z` works, so `z = 2` is not derived. `length_monomial` is the
case `z = 2`, written with a square root.
-/

namespace PhysJS.Coarsening

open Real

/-- Scaling `L(t) = L₀ (t / t₀) ^ (1 / z)`. -/
noncomputable def length (L0 t t0 z : ℝ) : ℝ :=
  L0 * (t / t0) ^ (1 / z)

/-- Coarsening constant `Γ = L₀² / t₀`. -/
noncomputable def gammaConst (L0 t0 : ℝ) : ℝ :=
  L0 ^ 2 / t0

lemma rpow_eq_one_iff {r a : ℝ} (hr : 0 < r) (hr1 : r ≠ 1) : r ^ a = 1 ↔ a = 0 := by
  constructor
  · intro h
    have hlog : a * log r = 0 := by
      have := congrArg log h
      rwa [log_rpow hr, log_one] at this
    exact (mul_eq_zero.mp hlog).resolve_right (log_ne_zero_of_pos_of_ne_one hr hr1)
  · rintro rfl
    exact rpow_zero r

lemma ratio (L0 t t0 z : ℝ) (ht : 0 < t) (ht0 : 0 < t0) (hz : 0 < z) :
    length L0 t t0 z ^ 2 / t = gammaConst L0 t0 * (t / t0) ^ (2 / z - 1) := by
  have hr : 0 < t / t0 := div_pos ht ht0
  unfold length gammaConst
  have hsq : ((t / t0) ^ (1 / z)) ^ 2 = (t / t0) ^ (2 / z) := by
    rw [← rpow_two, ← rpow_mul hr.le]
    congr 1
    field_simp [hz.ne']
  rw [mul_pow, hsq, rpow_sub_one hr.ne']
  field_simp [ht.ne', ht0.ne']

/-- `L(t)² = Γ t` if and only if `z = 2`.

Covers the derivation step of `be-15`. Not the Langevin equation. -/
theorem exponent_iff (L0 t t0 z : ℝ) (hL : L0 ≠ 0) (ht : 0 < t) (ht0 : 0 < t0)
    (hz : 0 < z) (htne : t ≠ t0) :
    0 < gammaConst L0 t0 ∧
      (length L0 t t0 z ^ 2 / t = gammaConst L0 t0 ↔ z = 2) := by
  refine ⟨div_pos (sq_pos_of_ne_zero hL) ht0, ?_⟩
  have hr : 0 < t / t0 := div_pos ht ht0
  have hr1 : t / t0 ≠ 1 := by
    intro h
    field_simp [ht0.ne'] at h
    exact htne h
  rw [ratio L0 t t0 z ht ht0 hz]
  constructor
  · intro h
    have hΓ : gammaConst L0 t0 ≠ 0 := (div_pos (sq_pos_of_ne_zero hL) ht0).ne'
    have hpow : (t / t0) ^ (2 / z - 1) = 1 := by
      apply mul_left_cancel₀ hΓ
      rw [mul_one]
      exact h
    have hexp : 2 / z - 1 = 0 := (rpow_eq_one_iff hr hr1).mp hpow
    have hdiv : 2 / z = 1 := by linarith
    have : 2 = 1 * z := (div_eq_iff hz.ne').mp hdiv
    linarith
  · intro hz2
    rw [hz2]
    have : (2 : ℝ) / 2 - 1 = 0 := by norm_num
    rw [this, rpow_zero, mul_one]

/-- Model B's `z = 3` gives `L³ ∝ t` and fails `L² = Γ t`. -/
theorem wrong_dictionary (L0 t t0 : ℝ) (hL : L0 ≠ 0) (ht : 0 < t) (ht0 : 0 < t0)
    (htne : t ≠ t0) :
    length L0 t t0 3 ^ 3 / t = L0 ^ 3 / t0 ∧
      length L0 t t0 3 ^ 2 / t ≠ gammaConst L0 t0 := by
  have hr : 0 < t / t0 := div_pos ht ht0
  refine ⟨?_, ?_⟩
  · unfold length
    have hcube : ((t / t0) ^ (1 / (3 : ℝ))) ^ 3 = t / t0 := by
      rw [← rpow_natCast, ← rpow_mul hr.le]
      have : (1 / (3 : ℝ)) * (3 : ℕ) = 1 := by norm_num
      rw [this, rpow_one]
    rw [mul_pow, hcube]
    field_simp [ht.ne', ht0.ne']
  · have hiff :=
      (exponent_iff L0 t t0 3 hL ht ht0 (by norm_num : (0 : ℝ) < 3) htne).2
    intro h
    exact (by norm_num : (3 : ℝ) ≠ 2) (hiff.mp h)

/-- Dimension of a coefficient `Γ` with `[Γ] = L^z T⁻¹`, in the basis `(L, T)`. -/
def gammaDim (z : ℚ) : Dimensional.Dim 2
  | 0 => z
  | 1 => -1

/-- Dimension of a time. -/
def timeDim : Dimensional.Dim 2
  | 0 => 0
  | 1 => 1

/-- Dimension of a length. -/
def lengthDim : Dimensional.Dim 2
  | 0 => 1
  | 1 => 0

/-- The monomial exponents forced by `[Γ] = L^z T⁻¹`. Both are `1/z`. -/
def lengthExponent (z : ℚ) : Fin 2 → ℚ
  | 0 => 1 / z
  | 1 => 1 / z

/-- Inputs `(Γ, t)` and output `L`, with `[Γ] = L^z T⁻¹`. -/
def lengthInputs (z : ℚ) : Fin 2 → Dimensional.Dim 2
  | 0 => gammaDim z
  | 1 => timeDim

lemma length_dimension_eq (z : ℚ) (hz : z ≠ 0) :
    ∀ i, lengthDim i = ∑ j : Fin 2, lengthExponent z j * lengthInputs z j i := by
  intro i
  fin_cases i <;> simp [lengthDim, lengthExponent, lengthInputs, gammaDim, timeDim, Fin.sum_univ_two, hz]

lemma length_reach (z : ℚ) (hz : 0 < z) (x : Fin 2 → ℝ) (hx : ∀ j, 0 < x j) :
    ∃ scale : Fin 2 → ℝ, (∀ i, 0 < scale i) ∧
      ∀ j, Dimensional.factor scale (lengthInputs z j) = x j := by
  refine ⟨![(x 0 * x 1) ^ (z : ℝ)⁻¹, x 1], ?_, ?_⟩
  · intro i
    fin_cases i
    · exact rpow_pos_of_pos (mul_pos (hx 0) (hx 1)) _
    · exact hx 1
  · intro j
    fin_cases j
    · unfold Dimensional.factor
      rw [Fin.prod_univ_two]
      simp only [lengthInputs, gammaDim, Matrix.cons_val_zero, Matrix.cons_val_one]
      have hbase : 0 < x 0 * x 1 := mul_pos (hx 0) (hx 1)
      have hz1 : (z : ℝ)⁻¹ * (z : ℝ) = 1 := by field_simp [hz.ne']
      rw [← rpow_mul hbase.le, hz1, rpow_one]
      rw [show ((-1 : ℚ) : ℝ) = (-1 : ℝ) by norm_num, rpow_neg (hx 1).le, rpow_one]
      field_simp [(hx 1).ne']
      rfl
    · unfold Dimensional.factor
      rw [Fin.prod_univ_two]
      simp only [lengthInputs, timeDim, Matrix.cons_val_zero, Matrix.cons_val_one]
      rw [show ((0 : ℚ) : ℝ) = 0 by norm_num, show ((1 : ℚ) : ℝ) = 1 by norm_num,
        rpow_zero, rpow_one, one_mul]
      rfl

/-- Hypothesis: `L` is a dimensionally homogeneous function of `Γ` and `t`
alone, and `[Γ] = L^z T⁻¹` for a positive rational `z`. Then
`L = C (Γ t)^{1/z}` with `C = f(1, 1)`.

`z = 2` is not a conclusion. Every positive rational `z` gives the same
shape with exponent `1/z`. The Model A Langevin equation is not this
statement, and `C` is not fixed. -/
theorem length_monomial_at (z : ℚ) (hz : 0 < z) (f : (Fin 2 → ℝ) → ℝ)
    (hf : Dimensional.Homogeneous (lengthInputs z) lengthDim f) (x : Fin 2 → ℝ)
    (hx : ∀ j, 0 < x j) :
    f x = f (fun _ => 1) * (x 0) ^ (1 / (z : ℝ)) * (x 1) ^ (1 / (z : ℝ)) := by
  have hform := Dimensional.monomial_form (lengthInputs z) lengthDim (lengthExponent z)
    (length_dimension_eq z hz.ne') (length_reach z hz) hf hx
  simpa [lengthExponent, Fin.prod_univ_two, mul_assoc] using hform

/-- The same statement at the Model A dimension assignment `[Γ] = L² T⁻¹`.
The exponent `1/2` is that assignment. It is not derived as a pure number,
and the constant `f(1, 1)` is not fixed. Not the Langevin equation. -/
theorem length_monomial (f : (Fin 2 → ℝ) → ℝ)
    (hf : Dimensional.Homogeneous (lengthInputs 2) lengthDim f) (x : Fin 2 → ℝ)
    (hx : ∀ j, 0 < x j) :
    f x = f (fun _ => 1) * Real.sqrt (x 0 * x 1) := by
  have h := length_monomial_at 2 (by norm_num) f hf x hx
  rw [h, mul_assoc, ← Real.mul_rpow (hx 0).le (hx 1).le, Real.sqrt_eq_rpow]
  norm_num

end PhysJS.Coarsening
