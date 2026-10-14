/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-65`. Derivation step. The encoded Jeans mass, not the virial theorem.

From the encoded virial convention

```
3 M k T / (μ m_u) = 3 G M² / (5 R)
M = 4 π R³ ρ / 3
```

with positive parameters, conclude

```
M = (5 k T / (G μ m_u))^(3/2) · (3 / (4 π ρ))^(1/2)
```

The `5` is that convention. Replacing it by `3` is not this mass. This
does not derive the virial theorem.
-/

namespace PhysJS.Jeans

open Real

/-- Encoded Jeans mass `(5 k T / (G μ m_u))^(3/2) · (3 / (4 π ρ))^(1/2)`. -/
noncomputable def jeansMass (k T G μ mU ρ : ℝ) : ℝ :=
  (5 * k * T / (G * μ * mU)) ^ (3 / 2 : ℝ) * (3 / (4 * π * ρ)) ^ (1 / 2 : ℝ)

/-- The same expression with the virial factor `c` in place of `5`. -/
noncomputable def jeansMassAt (c k T G μ mU ρ : ℝ) : ℝ :=
  (c * k * T / (G * μ * mU)) ^ (3 / 2 : ℝ) * (3 / (4 * π * ρ)) ^ (1 / 2 : ℝ)

lemma jeansMass_eq_at (k T G μ mU ρ : ℝ) :
    jeansMass k T G μ mU ρ = jeansMassAt 5 k T G μ mU ρ := by
  simp [jeansMass, jeansMassAt]

/-- The two premises give the encoded mass.

Covers the derivation step of `be-65`. Not the virial theorem. -/
theorem mass_eq (k T G μ mU ρ M R : ℝ) (hk : 0 < k) (hT : 0 < T) (hG : 0 < G) (hμ : 0 < μ)
    (hmU : 0 < mU) (hρ : 0 < ρ) (hM : 0 < M) (hR : 0 < R)
    (hvirial : 3 * M * k * T / (μ * mU) = 3 * G * M ^ 2 / (5 * R))
    (hmass : M = 4 * π * R ^ 3 * ρ / 3) :
    M = jeansMass k T G μ mU ρ := by
  have h5 : (5 : ℝ) ≠ 0 := by norm_num
  have h3 : (3 : ℝ) ≠ 0 := by norm_num
  have hMform : M = 5 * R * k * T / (G * μ * mU) := by
    have hv := hvirial
    field_simp [hμ.ne', hmU.ne', hR.ne', h5, hM.ne', h3] at hv
    field_simp [hG.ne', hμ.ne', hmU.ne']
    linarith
  have hRsq : R ^ 2 = (5 * k * T / (G * μ * mU)) * (3 / (4 * π * ρ)) := by
    have hm := hmass
    rw [hMform] at hm
    field_simp [hG.ne', hμ.ne', hmU.ne', hR.ne', h3, hρ.ne', pi_ne_zero] at hm
    field_simp [hG.ne', hμ.ne', hmU.ne', hρ.ne', pi_ne_zero]
    linarith
  have ha : 0 < 5 * k * T / (G * μ * mU) := by positivity
  have hb : 0 < 3 / (4 * π * ρ) := by positivity
  have hRpos : R = √((5 * k * T / (G * μ * mU)) * (3 / (4 * π * ρ))) := by
    rw [← sqrt_sq hR.le, hRsq]
  have hprod : M = (5 * k * T / (G * μ * mU)) *
      √(5 * k * T / (G * μ * mU)) * √(3 / (4 * π * ρ)) := by
    rw [hMform, hRpos, sqrt_mul ha.le (3 / (4 * π * ρ))]
    ring
  rw [hprod, sqrt_eq_rpow, sqrt_eq_rpow]
  have hpow : (5 * k * T / (G * μ * mU)) * (5 * k * T / (G * μ * mU)) ^ (1 / 2 : ℝ) =
      (5 * k * T / (G * μ * mU)) ^ (3 / 2 : ℝ) := by
    rw [mul_comm, ← rpow_add_one ha.ne' (1 / 2)]
    congr 1
    norm_num
  rw [hpow]
  rfl

/-- Replacing the encoded `5` by `3` is not the Jeans mass. -/
theorem wrong_dictionary_factor_three (k T G μ mU ρ : ℝ) (hk : 0 < k) (hT : 0 < T) (hG : 0 < G)
    (hμ : 0 < μ) (hmU : 0 < mU) (hρ : 0 < ρ) :
    jeansMassAt 3 k T G μ mU ρ ≠ jeansMass k T G μ mU ρ := by
  rw [jeansMass_eq_at]
  have ha3 : 0 < 3 * k * T / (G * μ * mU) := by positivity
  have ha5 : 0 < 5 * k * T / (G * μ * mU) := by positivity
  have hlt : 3 * k * T / (G * μ * mU) < 5 * k * T / (G * μ * mU) := by
    refine div_lt_div_of_pos_right ?_ (by positivity)
    nlinarith
  have hbase : (3 * k * T / (G * μ * mU)) ^ (3 / 2 : ℝ) <
      (5 * k * T / (G * μ * mU)) ^ (3 / 2 : ℝ) :=
    rpow_lt_rpow ha3.le hlt (by norm_num : (0 : ℝ) < 3 / 2)
  have hb : 0 < (3 / (4 * π * ρ)) ^ (1 / 2 : ℝ) := rpow_pos_of_pos (by positivity) _
  have hmul := mul_lt_mul_of_pos_right hbase hb
  simpa [jeansMassAt, mul_assoc] using hmul.ne

end PhysJS.Jeans
