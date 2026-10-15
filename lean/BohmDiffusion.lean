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
`be-196`. Bridge. Bohm cross-field diffusion.

The catalog equation is

```
D_B = k_B T_e / (16 e B)
```

Proved under these hypotheses. The Bohm coefficient `c_B = 1/16` is an
empirical number from Bohm's experiments on arc discharges. It is the
hypothesis `hcB`, not a derivation. Given it, `bohm_eq` proves the
closed form, and the equivalent "Larmor step" reading
`D_B = c_B v_th² / ω_c` with `v_th² = k_B T / m` and `ω_c = e B / m`
(the mass cancels). `ratio_to_classical` compares with the classical
cross-field coefficient of `be-123`: with `α = ω_c τ` and the parallel
coefficient `D_par = k_B T τ / m`, the classical value is
`D_par / (1 + α²)` and `D_B / D_classical = (1 + α²) / (16 α)`. The Bohm
value exceeds the classical one exactly when `α² − 16 α + 1 > 0`.

Not proved: the value `1/16`, or that a given plasma is turbulent enough
to reach the Bohm rate. `coefficient_not_fixed` shows units leave the
coefficient free.
-/

namespace PhysJS.BohmDiffusion

/-- Bohm diffusion from the empirical coefficient `c_B = 1/16`, with the
Larmor-step form `c_B v_th² / ω_c`. -/
theorem bohm_eq (D cB kB T e B m vth2 ωc : ℝ)
    (he : e ≠ 0) (hB : B ≠ 0) (hm : m ≠ 0)
    (hcB : cB = 1 / 16) (hD : D = cB * (kB * T / (e * B)))
    (hvth : vth2 = kB * T / m) (hωc : ωc = e * B / m) :
    D = kB * T / (16 * e * B) ∧ D = cB * vth2 / ωc := by
  subst hcB hvth hωc
  refine ⟨?_, ?_⟩
  · rw [hD]; field_simp
  · rw [hD]; field_simp

/-- Bohm over classical cross-field diffusion, at `α = ω_c τ`. -/
theorem ratio_to_classical (kB T e B m τ α DB Dcl Dpar : ℝ)
    (hkT : kB * T ≠ 0) (he : e ≠ 0) (hB : B ≠ 0) (hm : m ≠ 0) (hτ : τ ≠ 0)
    (hα : α = e * B * τ / m) (hDpar : Dpar = kB * T * τ / m)
    (hcl : Dcl = Dpar / (1 + α ^ 2)) (hDB : DB = kB * T / (16 * e * B))
    (hpos : 0 < α) :
    DB / Dcl = (1 + α ^ 2) / (16 * α) := by
  have h1 : 1 + α ^ 2 ≠ 0 := by positivity
  have hα0 : α ≠ 0 := hpos.ne'
  have hDpar0 : Dpar ≠ 0 := by
    rw [hDpar]; exact div_ne_zero (mul_ne_zero hkT hτ) hm
  have hDB' : DB = Dpar / (16 * α) := by
    rw [hDB, hDpar, hα]
    field_simp
  rw [hDB', hcl]
  field_simp

/-- Bohm exceeds classical transport once the magnetization is large. -/
theorem bohm_exceeds_classical (α : ℝ) (hα : 0 < α) (h : 16 * α < 1 + α ^ 2) :
    1 < (1 + α ^ 2) / (16 * α) := by
  rw [lt_div_iff₀ (by positivity)]
  linarith

/-- At `α = 1` the Bohm value is only `1/8` of the classical one. -/
theorem classical_exceeds_at_one : (1 + (1 : ℝ) ^ 2) / (16 * 1) < 1 := by
  norm_num

/-- Units leave the coefficient free: two different coefficients both give
a diffusivity-dimensioned `c · k_B T / (e B)`. -/
theorem coefficient_not_fixed (kB T e B c₁ c₂ : ℝ)
    (hkT : 0 < kB * T) (he : 0 < e) (hB : 0 < B) (hc : c₁ ≠ c₂) :
    c₁ * (kB * T / (e * B)) ≠ c₂ * (kB * T / (e * B)) := by
  have hpos : 0 < kB * T / (e * B) := by positivity
  intro h
  exact hc (mul_right_cancel₀ hpos.ne' h)

end PhysJS.BohmDiffusion
