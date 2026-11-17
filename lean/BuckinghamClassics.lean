/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Dimensional
import Mathlib.Algebra.BigOperators.Fin
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum

/-!
`CE-pendulum-period`. Derivation step. The exponent tuple `(1/2, -1/2)` on
`(length, gravity)` is the unique rational tuple whose dimension is the
period's. Base dimensions are `(L, T)`, index `0` and `1`: the rows
`src/dimensional/buckingham.ts` keeps for these inputs. The prefactor `C` is
not fixed and `2π` is not derived. This is not the pendulum equation of motion.

`hawking_exponent_not_unique` is the negative control. Over `(ℏ, c, G, M, k_B)`
with base dimensions `(L, M, T, Θ)`, the exponent tuple for a temperature is not
unique. The Hawking form and `M c² / k_B` both solve the dimension equation. The
free dimensionless group is `ℏ c / (G M²)`. This theorem has no manifest key.
-/

namespace PhysJS.BuckinghamClassics

/-- `e` solves the dimension equation: the output dimension is the
`e`-combination of the input dimensions. This is the `hout` hypothesis of
`Dimensional.monomial_form`. -/
def Solves {n k : ℕ} (inputDim : Fin k → Dimensional.Dim n) (outputDim : Dimensional.Dim n)
    (e : Fin k → ℚ) : Prop :=
  ∀ i, outputDim i = ∑ j : Fin k, e j * inputDim j i

/-- `[length] = L`. -/
def lengthDim : Dimensional.Dim 2
  | 0 => 1
  | 1 => 0

/-- `[gravity] = L T⁻²`. -/
def gravityDim : Dimensional.Dim 2
  | 0 => 1
  | 1 => -2

/-- `[period] = T`. -/
def periodDim : Dimensional.Dim 2
  | 0 => 0
  | 1 => 1

/-- Inputs `(length, gravity)`. -/
def pendulumInputs : Fin 2 → Dimensional.Dim 2
  | 0 => lengthDim
  | 1 => gravityDim

/-- The tuple `(1/2, -1/2)`: `tests/dimensional/derivation-benchmark.test.ts` pins it. -/
def pendulumExponent : Fin 2 → ℚ
  | 0 => 1 / 2
  | 1 => -1 / 2

/-- The dimension equation `[period] = e₀ [length] + e₁ [gravity]` has exactly
one rational solution, `(1/2, -1/2)`. This covers the exponent tuple of
`CE-pendulum-period`: the form, not the prefactor `2π`. -/
theorem pendulum_exponent_unique (e : Fin 2 → ℚ) :
    Solves pendulumInputs periodDim e ↔ e = pendulumExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    simp [pendulumInputs, lengthDim, gravityDim, periodDim, Fin.sum_univ_two] at h0 h1
    have e1 : e 1 = -1 / 2 := by linarith
    have e0 : e 0 = 1 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [pendulumExponent] using e0
    · simpa [pendulumExponent] using e1
  · rintro rfl i
    fin_cases i <;>
      norm_num [pendulumInputs, lengthDim, gravityDim, periodDim, pendulumExponent,
        Fin.sum_univ_two]

/-- `[ℏ] = L² M T⁻¹` over `(L, M, T, Θ)`. -/
def hbarDim : Dimensional.Dim 4
  | 0 => 2
  | 1 => 1
  | 2 => -1
  | 3 => 0

/-- `[c] = L T⁻¹`. -/
def cDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => 0
  | 2 => -1
  | 3 => 0

/-- `[G] = L³ M⁻¹ T⁻²`. -/
def gDim : Dimensional.Dim 4
  | 0 => 3
  | 1 => -1
  | 2 => -2
  | 3 => 0

/-- `[M] = M`. -/
def massDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => 1
  | 2 => 0
  | 3 => 0

/-- `[k_B] = L² M T⁻² Θ⁻¹`. -/
def kBDim : Dimensional.Dim 4
  | 0 => 2
  | 1 => 1
  | 2 => -2
  | 3 => -1

/-- `[temperature] = Θ`. -/
def temperatureDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => 0
  | 2 => 0
  | 3 => 1

/-- Hawking-set inputs `(ℏ, c, G, M, k_B)`. -/
def hawkingInputs : Fin 5 → Dimensional.Dim 4
  | 0 => hbarDim
  | 1 => cDim
  | 2 => gDim
  | 3 => massDim
  | 4 => kBDim

/-- Exponents of the Hawking form `ℏ c³ / (G M k_B)`. -/
def hawkingForm : Fin 5 → ℚ
  | 0 => 1
  | 1 => 3
  | 2 => -1
  | 3 => -1
  | 4 => -1

/-- Exponents of the rest-mass form `M c² / k_B`. -/
def restMassForm : Fin 5 → ℚ
  | 0 => 0
  | 1 => 2
  | 2 => 0
  | 3 => 1
  | 4 => -1

/-- Negative control. Two different rational tuples solve the dimension equation
for a temperature over `(ℏ, c, G, M, k_B)`. The exponent tuple is not unique. -/
theorem hawking_exponent_not_unique :
    hawkingForm ≠ restMassForm ∧ Solves hawkingInputs temperatureDim hawkingForm ∧
      Solves hawkingInputs temperatureDim restMassForm := by
  refine ⟨?_, ?_, ?_⟩
  · intro h
    have := congrFun h 0
    simp [hawkingForm, restMassForm] at this
  · intro i
    fin_cases i <;>
      norm_num [Solves, hawkingInputs, hbarDim, cDim, gDim, massDim, kBDim, temperatureDim,
        hawkingForm, Fin.sum_univ_five]
  · intro i
    fin_cases i <;>
      norm_num [Solves, hawkingInputs, hbarDim, cDim, gDim, massDim, kBDim, temperatureDim,
        restMassForm, Fin.sum_univ_five]

end PhysJS.BuckinghamClassics
