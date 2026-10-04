/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.BigOperators.Group.Finset.Basic
import Mathlib.Algebra.BigOperators.Group.Finset.Sigma
import Mathlib.Analysis.SpecialFunctions.Pow.NNReal
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Data.Fin.VecNotation
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Ring

/-!
Buckingham-Pi fragment. A dimensionally homogeneous function of positive
magnitudes is a monomial times a dimensionless constant when a unit change
can reach every positive tuple, and a monomial times a function of a ratio
when one dimensionless group remains.

A pure number that labels the dimension assignment is an input, not a
conclusion. In particular `z = 2` is not derived here: the assignment
`[Γ] = L² T⁻¹` produces the exponent `1/2`, and the assignment
`[Γ] = L^z T⁻¹` produces `1/z` for every positive rational `z`.
-/

namespace PhysJS.Dimensional

open Real Finset

/-- Exponents of a fixed list of base dimensions. -/
abbrev Dim (n : ℕ) := Fin n → ℚ

/-- The positive factor by which a unit change `lam` rescales a quantity of dimension `d`. -/
noncomputable def factor {n : ℕ} (lam : Fin n → ℝ) (d : Dim n) : ℝ :=
  ∏ i : Fin n, lam i ^ (d i : ℝ)

/-- Rescale a magnitude. -/
noncomputable def rescale {n : ℕ} (lam : Fin n → ℝ) (d : Dim n) (x : ℝ) : ℝ :=
  x * factor lam d

/-- A unit change multiplies the output by the factor of `outputDim`. -/
def Homogeneous {n k : ℕ} (inputDim : Fin k → Dim n) (outputDim : Dim n)
    (f : (Fin k → ℝ) → ℝ) : Prop :=
  ∀ (lam : Fin n → ℝ) (x : Fin k → ℝ),
    (∀ i, 0 < lam i) → (∀ j, 0 < x j) →
      f (fun j => rescale lam (inputDim j) (x j)) = rescale lam outputDim (f x)

lemma factor_smul {n : ℕ} {lam : Fin n → ℝ} {c : ℚ} {d : Dim n} (hlam : ∀ i, 0 < lam i) :
    factor lam (fun i => c * d i) = factor lam d ^ (c : ℝ) := by
  unfold factor
  have hrewrite : (∏ i, lam i ^ ((c * d i : ℚ) : ℝ)) =
      ∏ i, (lam i ^ (d i : ℝ)) ^ (c : ℝ) := by
    apply Finset.prod_congr rfl
    intro i _
    rw [Rat.cast_mul, mul_comm, rpow_mul (hlam i).le]
  rw [hrewrite]
  exact Real.finsetProd_rpow univ (fun i => lam i ^ (d i : ℝ))
    (fun i _ => rpow_nonneg (hlam i).le _) (c : ℝ)

lemma factor_lincomb {n k : ℕ} {lam : Fin n → ℝ} (inputDim : Fin k → Dim n)
    (exponent : Fin k → ℚ) (hlam : ∀ i, 0 < lam i) :
    factor lam (fun i => ∑ j : Fin k, exponent j * inputDim j i) =
      ∏ j : Fin k, factor lam (inputDim j) ^ (exponent j : ℝ) := by
  unfold factor
  have hpow : ∀ i, lam i ^ ((∑ j : Fin k, exponent j * inputDim j i : ℚ) : ℝ) =
      ∏ j : Fin k, lam i ^ ((exponent j * inputDim j i : ℚ) : ℝ) := by
    intro i
    have hsum : ((∑ j : Fin k, exponent j * inputDim j i : ℚ) : ℝ) =
        ∑ j : Fin k, ((exponent j * inputDim j i : ℚ) : ℝ) := by
      simp
    rw [hsum]
    exact rpow_sum_of_pos (hlam i) (fun j => ((exponent j * inputDim j i : ℚ) : ℝ)) univ
  simp_rw [hpow]
  rw [prod_comm]
  apply Finset.prod_congr rfl
  intro j _
  have hsmul := factor_smul (lam := lam) (c := exponent j) (d := inputDim j) hlam
  simp only [factor, Rat.cast_mul] at hsmul ⊢
  exact hsmul

/-- If every positive tuple is a unit rescaling of `(1,…,1)` and the output
dimension is the linear combination `exponent`, then a homogeneous function is
that monomial times the dimensionless value `f(1,…,1)`.

The exponent vector is part of the hypothesis. This theorem does not choose it. -/
theorem monomial_form {n k : ℕ} (inputDim : Fin k → Dim n) (outputDim : Dim n)
    (exponent : Fin k → ℚ)
    (hout : ∀ i, outputDim i = ∑ j : Fin k, exponent j * inputDim j i)
    (hreach : ∀ x : Fin k → ℝ, (∀ j, 0 < x j) →
      ∃ lam : Fin n → ℝ, (∀ i, 0 < lam i) ∧ ∀ j, factor lam (inputDim j) = x j)
    {f : (Fin k → ℝ) → ℝ} (hf : Homogeneous inputDim outputDim f)
    {x : Fin k → ℝ} (hx : ∀ j, 0 < x j) :
    f x = f (fun _ => 1) * ∏ j : Fin k, x j ^ (exponent j : ℝ) := by
  obtain ⟨lam, hlam, hfac⟩ := hreach x hx
  have hone : ∀ j : Fin k, 0 < (1 : ℝ) := fun _ => one_pos
  have hhom := hf lam (fun _ => 1) hlam hone
  have harg : (fun j => rescale lam (inputDim j) (1 : ℝ)) = x := by
    funext j
    unfold rescale
    rw [hfac j, one_mul]
  rw [harg] at hhom
  have hfactor : factor lam outputDim = ∏ j : Fin k, x j ^ (exponent j : ℝ) := by
    have hfun : outputDim = fun i => ∑ j : Fin k, exponent j * inputDim j i := funext hout
    rw [show factor lam outputDim = factor lam (fun i => ∑ j, exponent j * inputDim j i) by
      rw [hfun]]
    rw [factor_lincomb inputDim exponent hlam]
    apply Finset.prod_congr rfl
    intro j _
    rw [hfac j]
  unfold rescale at hhom
  rw [hfactor] at hhom
  exact hhom

/-- One dimensionless ratio. If a scale `s` carries the output dimension and
`a`, `b` carry one common dimension, homogeneity gives
`f(s, a, b) = s * f(1, a/b, 1)`. The function of `a/b` is not fixed, so a pure
number in an exponent of that ratio is not a conclusion. -/
theorem ratio_shape (f : ℝ → ℝ → ℝ → ℝ)
    (hf : ∀ lams lame s a b, 0 < lams → 0 < lame → 0 < s → 0 < a → 0 < b →
      f (lams * s) (lame * a) (lame * b) = lams * f s a b)
    {s a b : ℝ} (hs : 0 < s) (ha : 0 < a) (hb : 0 < b) :
    f s a b = s * f 1 (a / b) 1 := by
  have h := hf s b 1 (a / b) 1 hs hb one_pos (div_pos ha hb) one_pos
  have hratio : b * (a / b) = a := by field_simp [hb.ne']
  simpa [one_mul, mul_one, hratio] using h

/-- Two independent positive magnitudes whose dimensions multiply to the output
dimension. Homogeneity gives `f(κ, S) = C * κ * S` with `C = f(1, 1)`.
The value of `C` is not fixed. -/
theorem product_shape (f : ℝ → ℝ → ℝ)
    (hf : ∀ lamκ lamS κ S, 0 < lamκ → 0 < lamS → 0 < κ → 0 < S →
      f (lamκ * κ) (lamS * S) = (lamκ * lamS) * f κ S)
    {κ S : ℝ} (hκ : 0 < κ) (hS : 0 < S) :
    f κ S = f 1 1 * κ * S := by
  have h := hf κ S 1 1 hκ hS one_pos one_pos
  rw [mul_one, mul_one] at h
  rw [h, mul_comm, mul_assoc]

/-- `(a/b)^p` is unchanged by a common rescaling of `a` and `b`, for every real `p`.
The exponent is not chosen. -/
theorem ratio_power_invariant (p lam a b : ℝ) (hlam : lam ≠ 0) :
    ((lam * a) / (lam * b)) ^ p = (a / b) ^ p := by
  rw [mul_div_mul_left a b hlam]

end PhysJS.Dimensional
