/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-247`. Bridge. Piezoelectric electromechanical coupling factor.

The catalog equation is

```
k² = d² / (ε^T s^E)
```

with `d` the piezoelectric charge constant, `ε^T` the permittivity at
constant stress and `s^E` the compliance at constant field.

The premise is the linear, quasi-static, single-mode piezoelectric
constitutive law in strain-charge form,

```
S = s^E T + d E        D = d T + ε^T E
```

with stored energy density `W = ½ (S T + D E) = U_e + 2 U_m + U_d`, where
`U_e = ½ s^E T²` is elastic, `U_d = ½ ε^T E²` dielectric and
`U_m = ½ d T E` mutual. The coupling factor is the energy definition
`k = U_m / √(U_e U_d)`. `coupling_eq` proves `k² = d² / (ε^T s^E)`.
`clamped_permittivity_eq` and `open_compliance_eq` derive from the
constitutive law the standard consequences `ε^S = ε^T (1 − k²)` (`S = 0`) and
`s^D = s^E (1 − k²)` (`D = 0`). `coupling_lt_one` shows that positivity
of the stored energy gives `k² < 1`.

It does not derive the constitutive law, and models one coupling mode.
-/

namespace PhysJS.PiezoCoupling

/-- Stored energy density `½ (S T + D E)` in terms of `T` and `E`. -/
noncomputable def energy (sE d εT T E : ℝ) : ℝ :=
  (1 / 2) * ((sE * T + d * E) * T + (d * T + εT * E) * E)

/-- The coupling factor squared from the energy partition,
`U_m² / (U_e U_d)`, equals `d² / (ε^T s^E)`.

Kind `bridge` on `PhysJS.PiezoCoupling.coupling_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a derivation
of the constitutive law and one mode only. -/
theorem coupling_eq (sE d εT T E : ℝ) (hs : 0 < sE) (hε : 0 < εT)
    (hT : T ≠ 0) (hE : E ≠ 0) :
    ((1 / 2) * d * T * E) ^ 2 / (((1 / 2) * sE * T ^ 2) * ((1 / 2) * εT * E ^ 2))
      = d ^ 2 / (εT * sE) := by
  have hs0 : sE ≠ 0 := hs.ne'
  have hε0 : εT ≠ 0 := hε.ne'
  field_simp

/-- The stored energy is the sum `U_e + 2 U_m + U_d`. -/
theorem energy_partition (sE d εT T E : ℝ) :
    energy sE d εT T E = (1 / 2) * sE * T ^ 2 + 2 * ((1 / 2) * d * T * E)
      + (1 / 2) * εT * E ^ 2 := by
  unfold energy; ring

/-- Clamped permittivity. With `S = 0` the constitutive law gives
`T = −d E / s^E`, and `D = ε^S E` with `ε^S = ε^T (1 − k²)`. -/
theorem clamped_permittivity_eq (sE d εT S T E D : ℝ) (hs : 0 < sE) (hε : 0 < εT)
    (hS : S = sE * T + d * E) (hD : D = d * T + εT * E) (hclamp : S = 0) :
    D = εT * (1 - d ^ 2 / (εT * sE)) * E := by
  have hε0 : εT ≠ 0 := hε.ne'
  have hT : T = -d * E / sE := by
    rw [eq_div_iff hs.ne']; linarith
  rw [hD, hT]
  field_simp
  ring

/-- Open-circuit compliance. With `D = 0` the law gives `E = −d T / ε^T`, and
`S = s^D T` with `s^D = s^E (1 − k²)`. -/
theorem open_compliance_eq (sE d εT S T E D : ℝ) (hs : 0 < sE) (hε : 0 < εT)
    (hS : S = sE * T + d * E) (hD : D = d * T + εT * E) (hopen : D = 0) :
    S = sE * (1 - d ^ 2 / (εT * sE)) * T := by
  have hs0 : sE ≠ 0 := hs.ne'
  have hE : E = -d * T / εT := by
    rw [eq_div_iff hε.ne']; linarith
  rw [hS, hE]
  field_simp
  ring

/-- Positive stored energy for every non-zero state gives `k² < 1`. -/
theorem coupling_lt_one (sE d εT : ℝ) (hs : 0 < sE) (hε : 0 < εT)
    (hW : ∀ T E : ℝ, (T ≠ 0 ∨ E ≠ 0) → 0 < energy sE d εT T E) :
    d ^ 2 / (εT * sE) < 1 := by
  have h := hW d (-sE) (Or.inr (by linarith))
  unfold energy at h
  rw [div_lt_one (by positivity)]
  nlinarith [mul_pos hs hs]

/-- Units alone do not entail the group: `d² / (ε^T s^E)` and `d / (ε^T s^E)`
are different numbers. -/
theorem group_not_fixed : ∃ d εT sE : ℝ, d ^ 2 / (εT * sE) ≠ d / (εT * sE) :=
  ⟨2, 1, 1, by norm_num⟩

end PhysJS.PiezoCoupling
