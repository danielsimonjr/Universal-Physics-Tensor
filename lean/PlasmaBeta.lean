/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.MagneticPressure
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-76`. Bridge. Plasma beta.

The catalog equation is

```
β = p / (B² / (2 μ0)) = 2 μ0 n k_B T / B²
```

`beta_eq` builds it on `PhysJS.MagneticPressure.pressure_eq`. The magnetic
pressure in the denominator is that theorem, so the `2` is the inductor
integral, not a second assumption and not the Buckingham constant.
`p = n k_B T` is the isothermal ideal-gas closure, a hypothesis. It is not a
kinetic derivation.

`{β}` is already dimensionless, and `μ0 p / B²` is a second dimensionless
combination of the inputs. `units_do_not_entail` says a constant is not the
ratio. `half_pressure_not_beta` uses `B² / μ0` in place of the magnetic
pressure and is half of this beta. `coefficient_not_fixed` separates any other
factor from `1`. `gas_law_needed` drops `p = n k_B T`.

Not a plasma-β inequality. `upt regime plasma` does not evaluate one, and this
file does not add one.
-/

namespace PhysJS.PlasmaBeta

open PhysJS.MagneticPressure

/-- Plasma beta from the magnetic-pressure theorem and `p = n k_B T`.

The arguments through `hΔV` are the fixed-current solenoid expansion of
`pressure_eq`. `hβ` defines `β` as gas pressure over that magnetic pressure.
`hgas` is the ideal-gas closure.

Kind `bridge` on `PhysJS.PlasmaBeta.beta_eq`, once the catalog entry exists.
The covers line still begins with `derivation-step`. Not a unique monomial,
and not an inequality. -/
theorem beta_eq
    (U1 U2 : ℝ → ℝ)
    (L1 L2 Λ1 Λ2 B μ0 nTurns I Area1 Area2 length V1 V2 pMag Wbat Wmech
      β pGas n kB T : ℝ)
    (hI : I ≠ 0) (hμ : μ0 ≠ 0)
    (hderiv1 : ∀ J, HasDerivAt U1 (L1 * J) J) (h01 : U1 0 = 0)
    (hderiv2 : ∀ J, HasDerivAt U2 (L2 * J) J) (h02 : U2 0 = 0)
    (hAmpere : B = μ0 * nTurns * I)
    (hV1 : V1 = Area1 * length) (hV2 : V2 = Area2 * length)
    (hFlux1 : Λ1 = (nTurns * length) * (B * Area1))
    (hFlux2 : Λ2 = (nTurns * length) * (B * Area2))
    (hL1 : L1 = Λ1 / I) (hL2 : L2 = Λ2 / I)
    (hBattery : Wbat = I * (Λ2 - Λ1))
    (hBalance : Wbat = (U2 I - U1 I) + Wmech)
    (hMech : Wmech = pMag * (V2 - V1))
    (hΔV : V2 - V1 ≠ 0)
    (hBne : B ≠ 0)
    (hβ : β = pGas / pMag)
    (hgas : pGas = n * kB * T) :
    β = pGas / (B ^ 2 / (2 * μ0)) ∧ β = 2 * μ0 * n * kB * T / B ^ 2 := by
  have hp :=
    pressure_eq U1 U2 L1 L2 Λ1 Λ2 B μ0 nTurns I Area1 Area2 length V1 V2 pMag Wbat Wmech
      hI hμ hderiv1 h01 hderiv2 h02 hAmpere hV1 hV2 hFlux1 hFlux2 hL1 hL2 hBattery hBalance
      hMech hΔV
  refine ⟨?_, ?_⟩
  · rw [hβ, hp]
    rfl
  · rw [hβ, hp, hgas]
    unfold magneticPressure
    field_simp [hμ, hBne]

/-- The constant `1` is dimensionless and is not this beta when the ratio is not `1`. -/
theorem units_do_not_entail (p B μ0 : ℝ) (hμ : μ0 ≠ 0) (hB : B ≠ 0) (hp : p ≠ 0)
    (hne : 2 * μ0 * p / B ^ 2 ≠ 1) :
    (1 : ℝ) ≠ 2 * μ0 * p / B ^ 2 := by
  intro hEq
  have hnz : 2 * μ0 * p / B ^ 2 ≠ 0 :=
    div_ne_zero (mul_ne_zero (mul_ne_zero two_ne_zero hμ) hp) (pow_ne_zero 2 hB)
  by_cases hzero : 2 * μ0 * p / B ^ 2 = 0
  · exact absurd hzero hnz
  · exact hne hEq.symm

/-- `B² / μ0` in place of the magnetic pressure is half of this beta. -/
theorem half_pressure_not_beta (p B μ0 : ℝ) (hμ : μ0 ≠ 0) (hB : B ≠ 0) (hp : p ≠ 0) :
    p / (B ^ 2 / μ0) ≠ p / magneticPressure B μ0 := by
  unfold magneticPressure
  intro hEq
  have hden1 : B ^ 2 / μ0 ≠ 0 := div_ne_zero (pow_ne_zero 2 hB) hμ
  have hden2 : B ^ 2 / (2 * μ0) ≠ 0 :=
    div_ne_zero (pow_ne_zero 2 hB) (mul_ne_zero (by norm_num) hμ)
  rw [div_eq_div_iff hden1 hden2] at hEq
  have hsame : B ^ 2 / (2 * μ0) = B ^ 2 / μ0 := mul_left_cancel₀ hp hEq
  field_simp [hμ, hB] at hsame
  norm_num at hsame

/-- `β = C · 2 μ0 p / B²`. `C` is unfixed by dimensions. -/
theorem coefficient_not_fixed (p B μ0 C : ℝ) (hμ : μ0 ≠ 0) (hB : B ≠ 0) (hp : p ≠ 0)
    (hC : C ≠ 1) :
    C * (2 * μ0 * p / B ^ 2) ≠ 2 * μ0 * p / B ^ 2 := by
  intro hEq
  have hratio : 2 * μ0 * p / B ^ 2 ≠ 0 :=
    div_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num) hμ) hp) (pow_ne_zero 2 hB)
  have hdiff : (C - 1) * (2 * μ0 * p / B ^ 2) = 0 := by
    linear_combination hEq
  rcases mul_eq_zero.mp hdiff with hC0 | hzero
  · exact hC (sub_eq_zero.mp hC0)
  · exact hratio hzero

/-- The thermal form needs `p = n k_B T`. -/
theorem gas_law_needed (p n kB T B μ0 : ℝ) (hμ : μ0 ≠ 0) (hB : B ≠ 0)
    (hne : p ≠ n * kB * T) :
    2 * μ0 * p / B ^ 2 ≠ 2 * μ0 * n * kB * T / B ^ 2 := by
  intro hEq
  have hfac : μ0 * 2 / B ^ 2 ≠ 0 :=
    div_ne_zero (mul_ne_zero hμ (by norm_num)) (pow_ne_zero 2 hB)
  have : p = n * kB * T := by
    apply mul_left_cancel₀ hfac
    calc
      (μ0 * 2 / B ^ 2) * p = 2 * μ0 * p / B ^ 2 := by ring
      _ = 2 * μ0 * n * kB * T / B ^ 2 := hEq
      _ = (μ0 * 2 / B ^ 2) * (n * kB * T) := by ring
  exact hne this

end PhysJS.PlasmaBeta
