/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Dimensional
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-75`. Bridge. London penetration depth.

The catalog equation is

```
λ_L = √(m / (μ0 n e²))
```

`e` is the elementary charge. `n` is the number density of carriers of charge
`e` and mass `m`. Euler's number appears only as `exp`.

`{m, μ0, n, e}` does not determine a unique monomial of dimension length.
`not_unique_monomial` exhibits two exponent vectors, both of dimension length:
the London vector `(1/2, -1/2, -1/2, -1)` and `μ0 e² / m`. `kernel_length_not_depth`
separates those two lengths when `n (μ0 e² / m)³ ≠ 1`.

`depth_eq` derives the London root from the one-dimensional London equation and
Ampere's law on the decaying profile

```
B(x) = B0 exp(−x / λ)
j = −(1 / μ0) dB/dx
dj/dx = −(n e² / m) B
```

The second derivative of that profile is `B / λ²`. Matching the two expressions
for `dj/dx` fixes `λ² = m / (μ0 n e²)`, and `λ > 0` selects the square root.
`growing_not_screened` is the other sign: `exp(+x / λ)` has the same curvature
scale and is not the screened field. `pair_charge_not_depth` replaces `e` by
`2e` at the same `n` and `m`. `charge_squared_needed` drops the square.
`coefficient_not_fixed` separates any other factor from `1`.

Not the classical skin depth. The London equation and Ampere's law are
hypotheses. Physlib has no superconductivity module.
-/

namespace PhysJS.LondonPenetration

open Real

/-- London depth. `e` is the elementary charge. The root is the non-negative one. -/
noncomputable def penetrationDepth (m μ0 n e : ℝ) : ℝ :=
  Real.sqrt (m / (μ0 * n * e ^ 2))

/-- Decaying profile in the half-space. `exp` is the real exponential. -/
noncomputable def screenedField (B0 lam x : ℝ) : ℝ :=
  B0 * Real.exp (-x / lam)

/-- Growing profile. Same curvature scale, not the penetration boundary condition. -/
noncomputable def growingField (B0 lam x : ℝ) : ℝ :=
  B0 * Real.exp (x / lam)

lemma hasDerivAt_screened (B0 lam x : ℝ) (hlam : lam ≠ 0) :
    HasDerivAt (fun y => screenedField B0 lam y) ((-1 / lam) * screenedField B0 lam x) x := by
  have _ : lam ≠ 0 := hlam
  unfold screenedField
  have hlin : HasDerivAt (fun y => -y / lam) (-1 / lam) x := by
    have h := (hasDerivAt_id x).const_mul (-1 / lam)
    simpa [div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc, one_mul] using h
  have hexp : HasDerivAt (fun y => Real.exp (-y / lam))
      (Real.exp (-x / lam) * (-1 / lam)) x := hlin.exp
  convert hexp.const_mul B0 using 1
  ring

lemma screened_deriv (B0 lam x : ℝ) (hlam : lam ≠ 0) :
    deriv (fun y => screenedField B0 lam y) x = (-1 / lam) * screenedField B0 lam x :=
  (hasDerivAt_screened B0 lam x hlam).deriv

/-- Ampere plus the London equation on the decaying profile fix `lam²`.

`hAmpere` is `j = −(1/μ0) dB/dx` at every depth. `hLondon` is
`dj/dx = −(n e² / m) B` at `x`. `e` is the elementary charge. `B0 ≠ 0` keeps
the profile from vanishing, which is what lets the coefficient be read off. -/
theorem length_squared
    (j : ℝ → ℝ) (B0 lam m μ0 n e x : ℝ)
    (hlam : 0 < lam) (hm : 0 < m) (hμ : 0 < μ0) (hn : 0 < n) (he : e ≠ 0) (hB0 : B0 ≠ 0)
    (hAmpere : ∀ y, j y = -deriv (fun z => screenedField B0 lam z) y / μ0)
    (hLondon : HasDerivAt j (-(n * e ^ 2 / m) * screenedField B0 lam x) x) :
    lam ^ 2 = m / (μ0 * n * e ^ 2) := by
  have hlam0 : lam ≠ 0 := ne_of_gt hlam
  have hμ0 : μ0 ≠ 0 := hμ.ne'
  have hm0 : m ≠ 0 := hm.ne'
  have hn0 : n ≠ 0 := hn.ne'
  have hslope : ∀ y, deriv (fun z => screenedField B0 lam z) y =
      (-1 / lam) * screenedField B0 lam y :=
    fun y => screened_deriv B0 lam y hlam0
  have hj : ∀ y, j y = screenedField B0 lam y / (lam * μ0) := by
    intro y
    have h := hAmpere y
    rw [hslope y] at h
    calc
      j y = -((-1 / lam) * screenedField B0 lam y) / μ0 := h
      _ = screenedField B0 lam y / (lam * μ0) := by field_simp [hlam0, hμ0]
  have hfun : j = fun y => screenedField B0 lam y / (lam * μ0) := funext hj
  have hderiv : HasDerivAt j (((-1 / lam) * screenedField B0 lam x) / (lam * μ0)) x := by
    rw [hfun]
    simpa using (hasDerivAt_screened B0 lam x hlam0).div_const (lam * μ0)
  have huniq : ((-1 / lam) * screenedField B0 lam x) / (lam * μ0) =
      -(n * e ^ 2 / m) * screenedField B0 lam x := by
    rw [← hderiv.deriv, hLondon.deriv]
  have hBne : screenedField B0 lam x ≠ 0 := by
    unfold screenedField
    exact mul_ne_zero hB0 (Real.exp_ne_zero _)
  have hassoc : ((-1 / lam) * screenedField B0 lam x) / (lam * μ0) =
      ((-1 / lam) / (lam * μ0)) * screenedField B0 lam x := by
    field_simp [hlam0, hμ0]
  rw [hassoc] at huniq
  have hcoeff : (-1 / lam) / (lam * μ0) = -(n * e ^ 2 / m) :=
    mul_right_cancel₀ hBne huniq
  have hleft : (-1 / lam) / (lam * μ0) = -1 / (lam ^ 2 * μ0) := by
    field_simp [hlam0, hμ0]
  rw [hleft] at hcoeff
  have hclear : 1 / (lam ^ 2 * μ0) = n * e ^ 2 / m := by
    linear_combination -hcoeff
  have hprod : lam ^ 2 * μ0 * n * e ^ 2 = m := by
    field_simp [hlam0, hμ0, hm0, hn0, he] at hclear
    linarith
  field_simp [hμ0, hn0, he] at hprod ⊢
  linarith

/-- The penetration depth is the positive square root of that coefficient.

Not a unique
monomial, and not the classical skin depth. -/
theorem depth_eq
    (j : ℝ → ℝ) (B0 lam m μ0 n e x : ℝ)
    (hlam : 0 < lam) (hm : 0 < m) (hμ : 0 < μ0) (hn : 0 < n) (he : e ≠ 0) (hB0 : B0 ≠ 0)
    (hAmpere : ∀ y, j y = -deriv (fun z => screenedField B0 lam z) y / μ0)
    (hLondon : HasDerivAt j (-(n * e ^ 2 / m) * screenedField B0 lam x) x) :
    lam = penetrationDepth m μ0 n e := by
  have hsq := length_squared j B0 lam m μ0 n e x hlam hm hμ hn he hB0 hAmpere hLondon
  have hroot : Real.sqrt (lam ^ 2) = lam := Real.sqrt_sq hlam.le
  unfold penetrationDepth
  rw [← hroot, hsq]

/-- The growing exponential is not the screened field one depth in. -/
theorem growing_not_screened (B0 lam : ℝ) (hB0 : B0 ≠ 0) (hlam : 0 < lam) :
    growingField B0 lam lam ≠ screenedField B0 lam lam := by
  unfold growingField screenedField
  intro hEq
  have hexp : Real.exp (lam / lam) = Real.exp (-lam / lam) := mul_left_cancel₀ hB0 hEq
  have hargs : (1 : ℝ) = -1 := by
    apply Real.exp_injective
    simpa [div_self (ne_of_gt hlam), neg_div] using hexp
  norm_num at hargs

/-- `μ0 e² / m` is another length built from the same inputs, and it is not
`lam_L` when the dimensionless group `n (μ0 e² / m)³` is not `1`. -/
theorem kernel_length_not_depth (m μ0 n e : ℝ)
    (hm : 0 < m) (hμ : 0 < μ0) (hn : 0 < n) (he : e ≠ 0)
    (hgroup : n * (μ0 * e ^ 2 / m) ^ 3 ≠ 1) :
    μ0 * e ^ 2 / m ≠ penetrationDepth m μ0 n e := by
  intro hEq
  have hℓ : 0 < μ0 * e ^ 2 / m := by positivity
  have hrad : 0 ≤ m / (μ0 * n * e ^ 2) := by positivity
  unfold penetrationDepth at hEq
  have hsq : (μ0 * e ^ 2 / m) ^ 2 = m / (μ0 * n * e ^ 2) := by
    have hpow := congrArg (fun t => t ^ 2) hEq
    rwa [sq_sqrt hrad] at hpow
  have hrewrite : m / (μ0 * n * e ^ 2) = 1 / (n * (μ0 * e ^ 2 / m)) := by
    field_simp [hm.ne', hμ.ne', hn.ne', he]
  rw [hrewrite] at hsq
  have hnpos : n * (μ0 * e ^ 2 / m) ≠ 0 := by positivity
  rw [eq_div_iff hnpos] at hsq
  have hgroup' : n * (μ0 * e ^ 2 / m) ^ 3 = 1 := by
    calc
      n * (μ0 * e ^ 2 / m) ^ 3
          = (μ0 * e ^ 2 / m) ^ 2 * (n * (μ0 * e ^ 2 / m)) := by ring
      _ = 1 := hsq
  exact hgroup hgroup'

/-- The Cooper-pair charge `2e`, at the same `n` and `m`, is not this depth. -/
theorem pair_charge_not_depth (m μ0 n e : ℝ)
    (hm : 0 < m) (hμ : 0 < μ0) (hn : 0 < n) (he : e ≠ 0) :
    penetrationDepth m μ0 n (2 * e) ≠ penetrationDepth m μ0 n e := by
  unfold penetrationDepth
  intro hEq
  have hpos2 : 0 ≤ m / (μ0 * n * e ^ 2) := by positivity
  have hpos4 : 0 ≤ m / (μ0 * n * (2 * e) ^ 2) := by positivity
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt hpos4, sq_sqrt hpos2] at hsq
  have hd4 : μ0 * n * (2 * e) ^ 2 ≠ 0 := by positivity
  have hd2 : μ0 * n * e ^ 2 ≠ 0 := by positivity
  rw [div_eq_div_iff hd4 hd2] at hsq
  have hscale : m * (μ0 * n) ≠ 0 := by positivity
  have hpair : (2 * e) ^ 2 = e ^ 2 := by
    apply mul_left_cancel₀ hscale
    calc
      m * (μ0 * n) * (2 * e) ^ 2 = m * (μ0 * n * (2 * e) ^ 2) := by ring
      _ = m * (μ0 * n * e ^ 2) := hsq.symm
      _ = m * (μ0 * n) * e ^ 2 := by ring
  have hfour : (4 : ℝ) * e ^ 2 = e ^ 2 := by
    convert hpair using 1
    ring
  have he2 : e ^ 2 ≠ 0 := pow_ne_zero 2 he
  have hnum : (4 : ℝ) = 1 := by
    apply mul_right_cancel₀ he2
    linear_combination hfour
  norm_num at hnum

/-- Dropping the square on `e` fails when `e ≠ 1` and `e > 0`. -/
theorem charge_squared_needed (m μ0 n e : ℝ)
    (hm : 0 < m) (hμ : 0 < μ0) (hn : 0 < n) (he : 0 < e) (he1 : e ≠ 1) :
    Real.sqrt (m / (μ0 * n * e)) ≠ penetrationDepth m μ0 n e := by
  unfold penetrationDepth
  intro hEq
  have hposE : 0 ≤ m / (μ0 * n * e) := by positivity
  have hpos2 : 0 ≤ m / (μ0 * n * e ^ 2) := by positivity
  have hsq := congrArg (fun t => t ^ 2) hEq
  rw [sq_sqrt hposE, sq_sqrt hpos2] at hsq
  have hd1 : μ0 * n * e ≠ 0 := by positivity
  have hd2 : μ0 * n * e ^ 2 ≠ 0 := by positivity
  rw [div_eq_div_iff hd1 hd2] at hsq
  have hscale : m * μ0 * n ≠ 0 := by positivity
  have hcharge : e ^ 2 = e := by
    apply mul_left_cancel₀ hscale
    linear_combination hsq
  have hone : e = 1 := by
    have hmul : e * e = e * 1 := by simpa [pow_two, mul_one] using hcharge
    exact mul_left_cancel₀ he.ne' hmul
  exact he1 hone

/-- `lam = C √(m / (μ0 n e²))`. `C` is unfixed by the algebra of the formula. -/
theorem coefficient_not_fixed (m μ0 n e C : ℝ)
    (hm : 0 < m) (hμ : 0 < μ0) (hn : 0 < n) (he : e ≠ 0) (hC : C ≠ 1) :
    C * penetrationDepth m μ0 n e ≠ penetrationDepth m μ0 n e := by
  intro hEq
  have hpos : 0 < penetrationDepth m μ0 n e := by
    unfold penetrationDepth
    exact Real.sqrt_pos.mpr (by positivity)
  have hdiff : (C - 1) * penetrationDepth m μ0 n e = 0 := by
    linear_combination hEq
  rcases mul_eq_zero.mp hdiff with hC0 | hzero
  · exact hC (sub_eq_zero.mp hC0)
  · exact hpos.ne' hzero

/-- `[m] = M`. -/
def massDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => 0
  | 2 => 0
  | 3 => 0

/-- `[μ0] = M L T⁻² I⁻²`. -/
def permeabilityDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => 1
  | 2 => -2
  | 3 => -2

/-- `[n] = L⁻³`. -/
def numberDensityDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => -3
  | 2 => 0
  | 3 => 0

/-- `[e] = I T`, the elementary charge. -/
def chargeDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => 0
  | 2 => 1
  | 3 => 1

/-- `[lam] = L`. -/
def lengthDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => 1
  | 2 => 0
  | 3 => 0

/-- The four inputs, in the order `(m, μ0, n, e)`. -/
def londonInputs : Fin 4 → Dimensional.Dim 4
  | 0 => massDim
  | 1 => permeabilityDim
  | 2 => numberDensityDim
  | 3 => chargeDim

/-- Exponents in `√(m / (μ0 n e²))`. -/
def londonExponent : Fin 4 → ℚ
  | 0 => 1 / 2
  | 1 => -1 / 2
  | 2 => -1 / 2
  | 3 => -1

/-- Exponents in `μ0 e² / m`, another length from the same inputs. -/
def kernelExponent : Fin 4 → ℚ
  | 0 => -1
  | 1 => 1
  | 2 => 0
  | 3 => 2

lemma london_dimension_eq :
    ∀ i, lengthDim i = ∑ j : Fin 4, londonExponent j * londonInputs j i := by
  intro i
  fin_cases i <;>
    simp [lengthDim, londonExponent, londonInputs, massDim, permeabilityDim,
      numberDensityDim, chargeDim, Fin.sum_univ_four] <;>
    norm_num

lemma kernel_dimension_eq :
    ∀ i, lengthDim i = ∑ j : Fin 4, kernelExponent j * londonInputs j i := by
  intro i
  fin_cases i <;>
    simp [lengthDim, kernelExponent, londonInputs, massDim, permeabilityDim,
      numberDensityDim, chargeDim, Fin.sum_univ_four]

/-- Two different monomials both have dimension length. Units do not choose. -/
theorem not_unique_monomial :
    londonExponent ≠ kernelExponent ∧
      (∀ i, lengthDim i = ∑ j : Fin 4, londonExponent j * londonInputs j i) ∧
      (∀ i, lengthDim i = ∑ j : Fin 4, kernelExponent j * londonInputs j i) := by
  refine ⟨?_, london_dimension_eq, kernel_dimension_eq⟩
  intro hEq
  have h := congrFun hEq 2
  simp [londonExponent, kernelExponent] at h

end PhysJS.LondonPenetration
