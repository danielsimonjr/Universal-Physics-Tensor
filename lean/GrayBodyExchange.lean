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
`be-214`. Bridge. Gray-body radiation exchange between parallel plates.

The catalog equation is

```
q = σ (T₁⁴ − T₂⁴) / (1/ε₁ + 1/ε₂ − 1)
```

`gray_exchange_eq` derives it from the radiosity balance of two large,
diffuse, gray, parallel plates in vacuum. Each plate leaves with radiosity
`J = ε σ T⁴ + (1 − ε) G` (emission plus reflected irradiation), and the
irradiation of each plate is the radiosity of the other,
`G₁ = J₂`, `G₂ = J₁`. The net flux from plate 1 to plate 2 is
`q = J₁ − J₂`. Eliminating the radiosities gives the sum of three series
radiative resistances, `1/ε₁ − 1`, `1`, `1/ε₂ − 1`, in the denominator.

`σ` is a given constant here: the value `σ = 2π⁵k_B⁴/(15 h³c²)` is `be-165`,
and `E_b = σ T⁴` per plate is taken as the black-body emissive power
(hypothesis). Kirchhoff's law for the gray surface, absorptivity equal to
emissivity, is also a hypothesis, built into the radiosity balance.

`black_limit` is `ε₁ = ε₂ = 1`, `denominator_ge_one` shows a gray exchange never
exceeds the black one, and `emissivities_not_forced` separates the
denominator from the naive product or mean of `ε`.

Scope: infinite parallel geometry, gray diffuse surfaces, no medium, no
conduction. Not a derivation of `ε`.
-/

namespace PhysJS.GrayBodyExchange

/-- The series-resistance denominator is at least 1 for emissivities in `(0, 1]`. -/
theorem denominator_ge_one (ε1 ε2 : ℝ) (hε1 : 0 < ε1) (hε2 : 0 < ε2) (h1 : ε1 ≤ 1)
    (h2 : ε2 ≤ 1) : 1 ≤ 1 / ε1 + 1 / ε2 - 1 := by
  have a1 : 1 ≤ 1 / ε1 := by rw [le_div_iff₀ hε1]; linarith
  have a2 : 1 ≤ 1 / ε2 := by rw [le_div_iff₀ hε2]; linarith
  linarith

/-- Net gray-body flux between parallel plates from the radiosity balance.

`hJ1`, `hJ2`: radiosities. `hq`: `q = J₁ − J₂`. The black-body emissive
powers are `σ T₁⁴` and `σ T₂⁴`.

Kind `bridge` on `PhysJS.GrayBodyExchange.gray_exchange_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Absorptivity
equals emissivity is a hypothesis; `σ` is an input. -/
theorem gray_exchange_eq (q J1 J2 σ T1 T2 ε1 ε2 : ℝ)
    (hε1 : 0 < ε1) (hε2 : 0 < ε2) (hε1' : ε1 ≤ 1) (hε2' : ε2 ≤ 1)
    (hJ1 : J1 = ε1 * (σ * T1 ^ 4) + (1 - ε1) * J2)
    (hJ2 : J2 = ε2 * (σ * T2 ^ 4) + (1 - ε2) * J1)
    (hq : q = J1 - J2) :
    q = σ * (T1 ^ 4 - T2 ^ 4) / (1 / ε1 + 1 / ε2 - 1) := by
  have hε10 : ε1 ≠ 0 := hε1.ne'
  have hε20 : ε2 ≠ 0 := hε2.ne'
  have hden : 1 ≤ 1 / ε1 + 1 / ε2 - 1 := denominator_ge_one ε1 ε2 hε1 hε2 hε1' hε2'
  have h1 : q = ε1 * (σ * T1 ^ 4 - J2) := by
    linear_combination hq + hJ1
  have h2 : q = ε2 * (J1 - σ * T2 ^ 4) := by
    linear_combination hq - hJ2
  have e1 : σ * T1 ^ 4 = q / ε1 + J2 := by
    field_simp; linarith
  have e2 : σ * T2 ^ 4 = J1 - q / ε2 := by
    field_simp; linarith
  rw [eq_div_iff (by linarith)]
  have : σ * (T1 ^ 4 - T2 ^ 4) = σ * T1 ^ 4 - σ * T2 ^ 4 := by ring
  rw [this, e1, e2, hq]
  ring_nf

/-- Black limit: `ε₁ = ε₂ = 1` gives `σ (T₁⁴ − T₂⁴)`. -/
theorem black_limit (σ T1 T2 : ℝ) :
    σ * (T1 ^ 4 - T2 ^ 4) / (1 / 1 + 1 / 1 - 1) = σ * (T1 ^ 4 - T2 ^ 4) := by
  norm_num

/-- A gray exchange never exceeds the black one when `T₁ ≥ T₂ ≥ 0`, `σ ≥ 0`. -/
theorem gray_le_black (σ T1 T2 ε1 ε2 : ℝ) (hσ : 0 ≤ σ) (hT : T2 ≤ T1) (hT2 : 0 ≤ T2)
    (hε1 : 0 < ε1) (hε2 : 0 < ε2) (hε1' : ε1 ≤ 1) (hε2' : ε2 ≤ 1) :
    σ * (T1 ^ 4 - T2 ^ 4) / (1 / ε1 + 1 / ε2 - 1) ≤ σ * (T1 ^ 4 - T2 ^ 4) := by
  have hden := denominator_ge_one ε1 ε2 hε1 hε2 hε1' hε2'
  have hnum : 0 ≤ σ * (T1 ^ 4 - T2 ^ 4) := by
    apply mul_nonneg hσ
    have : T2 ^ 4 ≤ T1 ^ 4 := pow_le_pow_left₀ hT2 hT 4
    linarith
  rw [div_le_iff₀ (by linarith)]
  nlinarith [hnum]

/-- Control: for `ε₁ = ε₂ = 1/2` the denominator is `3`, not the product form
`1/(ε₁ ε₂) = 4` nor `1/ε = 2`. -/
theorem emissivities_not_forced :
    (1 / (1 / 2 : ℝ) + 1 / (1 / 2 : ℝ) - 1 = 3) ∧
    (1 / (1 / 2 : ℝ) + 1 / (1 / 2 : ℝ) - 1 ≠ 1 / ((1 / 2) * (1 / 2) : ℝ)) ∧
    (1 / (1 / 2 : ℝ) + 1 / (1 / 2 : ℝ) - 1 ≠ 1 / (1 / 2 : ℝ)) := by
  norm_num

/-- Evaluated: 500 K and 300 K plates, `ε = (4 / 5)`, `σ = (5670374 / 100000000000000)` give
about 2056 W/m². -/
theorem plate_numbers :
    (2055 : ℝ) < (5670374 / 100000000000000) * (500 ^ 4 - 300 ^ 4) / (1 / (4 / 5) + 1 / (4 / 5) - 1) ∧
    (5670374 / 100000000000000) * (500 ^ 4 - 300 ^ 4) / (1 / (4 / 5) + 1 / (4 / 5) - 1) < 2057 := by
  constructor <;> norm_num

end PhysJS.GrayBodyExchange
