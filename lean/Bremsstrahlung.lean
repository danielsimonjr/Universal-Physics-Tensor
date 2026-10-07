/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.MeasureTheory.Integral.IntervalIntegral.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-202`. Bridge. Thermal bremsstrahlung power density.

The catalog equation (SI form of Rybicki-Lightman 5.15b) is

```
P = (16 / (3 ħ)) (e² / (4π ε0))³ / (m c³) · √(2π k_B T / (3 m)) · Z² n_e n_i ḡ
```

Proved under these hypotheses. For one electron of speed `v` passing ions
of charge `Z e`, the Born-level spectral emissivity per unit `n_e n_i` is

```
w_ω(v) = 16π/(3√3) · (e²/4πε0)³ / (c³ m² v) · Z² ḡ
```

with `ḡ` the Gaunt factor, a constant hypothesis here. Photons cannot
carry more than the electron's kinetic energy, so `ħ ω ≤ ½ m v²` and the
frequency integral runs to `ω_max = m v² / (2ħ)`. That upper limit is
where `ħ` enters. The result `P_v = n_e n_i w_ω(v) ω_max` is linear in
`v`, so the Maxwellian average only needs the mean speed
`v̄ = √(8 k_B T / (π m))`. `emissivity_eq` carries these premises to the
displayed formula; `mean_speed_identity` is the radical algebra
`8π/(3√3) · v̄ = (16/3) √(2π k_B T/(3m))`.

`dimension_vector` verifies in mass, length and time exponents that the
formula is a power per volume, `M L⁻¹ T⁻³`. `without_hbar_wrong`
shows the same formula with `ħ` dropped has exponents `M² L T⁻⁴`, the
mismatch that `upt derive` flagged.

Not proved: the Born-level spectral emissivity itself, the value of
`ḡ` (about 1.2 after thermal averaging), the mean speed of a Maxwellian
(`v̄` is a hypothesis), or the optically thin, non-relativistic
premises. The prefactor `16/3` is a product of the derivation, not of
dimensional analysis.
-/

namespace PhysJS.Bremsstrahlung

open intervalIntegral

/-- The radical identity behind the `√(2π k_B T / (3m))` form. -/
theorem mean_speed_identity (kT m : ℝ) (hkT : 0 < kT) (hm : 0 < m) :
    8 * Real.pi / (3 * Real.sqrt 3) * Real.sqrt (8 * kT / (Real.pi * m)) =
      16 / 3 * Real.sqrt (2 * Real.pi * kT / (3 * m)) := by
  have hpi : 0 < Real.pi := Real.pi_pos
  have h3 : 0 < Real.sqrt 3 := Real.sqrt_pos.mpr (by norm_num)
  have h3sq : Real.sqrt 3 ^ 2 = 3 := Real.sq_sqrt (by norm_num)
  have hA : 0 ≤ 8 * Real.pi / (3 * Real.sqrt 3) * Real.sqrt (8 * kT / (Real.pi * m)) := by
    positivity
  have hB : 0 ≤ 16 / 3 * Real.sqrt (2 * Real.pi * kT / (3 * m)) := by positivity
  have hsq : (8 * Real.pi / (3 * Real.sqrt 3) * Real.sqrt (8 * kT / (Real.pi * m))) ^ 2 =
      (16 / 3 * Real.sqrt (2 * Real.pi * kT / (3 * m))) ^ 2 := by
    have h27 : (3 * Real.sqrt 3) ^ 2 = 27 := by rw [mul_pow, h3sq]; norm_num
    rw [mul_pow, mul_pow, Real.sq_sqrt (by positivity), Real.sq_sqrt (by positivity),
      div_pow, h27]
    field_simp
    ring
  exact (pow_left_inj₀ hA hB (by norm_num : (2 : ℕ) ≠ 0)).mp hsq

/-- Frequency-integrated emissivity from the spectral law, the photon
cutoff, and the mean speed. `hw` is the Born-level spectral emissivity
with a constant Gaunt factor `g`. -/
theorem emissivity_eq (e ε0 m c ħ kT Z ne ni g vbar P : ℝ)
    (w Pv : ℝ → ℝ)
    (hε : 0 < ε0) (hm : 0 < m) (hc : 0 < c) (hħ : 0 < ħ) (hkT : 0 < kT)
    (hvbar : vbar = Real.sqrt (8 * kT / (Real.pi * m)))
    (hw : ∀ v, 0 < v → w v =
      16 * Real.pi / (3 * Real.sqrt 3) * (e ^ 2 / (4 * Real.pi * ε0)) ^ 3 /
        (c ^ 3 * m ^ 2 * v) * Z ^ 2 * g)
    (hPv : ∀ v, 0 < v → Pv v =
      ne * ni * ∫ _ in (0 : ℝ)..(m * v ^ 2 / (2 * ħ)), w v)
    (hP : P = Pv vbar) :
    P = 16 / (3 * ħ) * (e ^ 2 / (4 * Real.pi * ε0)) ^ 3 / (m * c ^ 3) *
      Real.sqrt (2 * Real.pi * kT / (3 * m)) * Z ^ 2 * ne * ni * g := by
  have hpi : 0 < Real.pi := Real.pi_pos
  have h3 : 0 < Real.sqrt 3 := Real.sqrt_pos.mpr (by norm_num)
  have hvpos : 0 < vbar := by
    rw [hvbar]; exact Real.sqrt_pos.mpr (by positivity)
  have hmean := mean_speed_identity kT m hkT hm
  rw [← hvbar] at hmean
  rw [hP, hPv vbar hvpos, hw vbar hvpos, intervalIntegral.integral_const, smul_eq_mul,
    sub_zero]
  have key : 16 / 3 * Real.sqrt (2 * Real.pi * kT / (3 * m)) =
      8 * Real.pi / (3 * Real.sqrt 3) * vbar := hmean.symm
  have hsplit : Real.sqrt (2 * Real.pi * kT / (3 * m)) =
      3 / 16 * (8 * Real.pi / (3 * Real.sqrt 3) * vbar) := by
    linarith
  rw [hsplit]
  field_simp
  ring

/-- Mass, length, time exponents of the formula: `3 [e²/4πε0] − [ħ] − [m]
− 3 [c] + ½ ([k_B T] − [m]) + 2 [n]` with `[e²/4πε0] = (1, 3, −2)`,
`[ħ] = (1, 2, −1)`, `[m] = (1, 0, 0)`, `[c] = (0, 1, −1)`,
`[k_B T] = (1, 2, −2)`, `[n] = (0, −3, 0)`. The result is a power per
volume, `(M, L, T) = (1, −1, −3)`. -/
theorem dimension_vector :
    (3 : ℚ) * 1 - 1 - 1 - 3 * 0 + (1 - 1) / 2 + 2 * 0 = 1 ∧
    (3 : ℚ) * 3 - 2 - 0 - 3 * 1 + (2 - 0) / 2 + 2 * (-3) = -1 ∧
    (3 : ℚ) * (-2) - (-1) - 0 - 3 * (-1) + ((-2) - 0) / 2 + 2 * 0 = -3 := by
  refine ⟨?_, ?_, ?_⟩ <;> norm_num

/-- Dropping `ħ` adds back its exponents `(1, 2, −1)` and gives
`(2, 1, −4)`, which is not a power per volume. -/
theorem without_hbar_wrong :
    ¬ ((2 : ℚ) = 1 ∧ (1 : ℚ) = -1 ∧ (-4 : ℚ) = -3) := by
  norm_num

/-- `P ∝ √T`: quadrupling the temperature doubles the power at fixed
density. -/
theorem sqrt_T_scaling (kT m : ℝ) :
    Real.sqrt (2 * Real.pi * (4 * kT) / (3 * m)) =
      2 * Real.sqrt (2 * Real.pi * kT / (3 * m)) := by
  have h : 2 * Real.pi * (4 * kT) / (3 * m) = 2 ^ 2 * (2 * Real.pi * kT / (3 * m)) := by
    ring
  rw [h, Real.sqrt_mul (by positivity), Real.sqrt_sq (by norm_num)]

end PhysJS.Bremsstrahlung
