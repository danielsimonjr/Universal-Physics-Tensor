/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-180`. Bridge. Peltier cooler maximum temperature difference.

The catalog equation is

```
ΔT_max = (1 / 2) Z T_c²,    Z = S² / (R K)
```

for a single thermoelectric couple with constant `S`, `R`, `K`. The heat
pumped from the cold side at current `I` and temperature drop
`ΔT = T_h − T_c` is

```
Q_c(I) = S T_c I − (1/2) I² R − K ΔT
```

(Peltier absorption, half the Joule heat, conduction back). `Q_c` is a
concave quadratic in `I`. `dQ_c/dI = S T_c − R I` vanishes at
`I* = S T_c / R` (`optimal_current`), where

```
Q_c(I*) = S² T_c² / (2 R) − K ΔT.
```

`max_delta_t_eq` proves the cold side can pump heat (`∃ I, Q_c(I) ≥ 0`)
exactly when `ΔT ≤ (1/2) Z T_c²`, and the zero-load edge `Q_c(I*) = 0` is
`ΔT = (1/2) Z T_c²`. It is the same `Z` that `be-130` takes as input.

Premises: constant properties, hot side held at `T_h = T_c + ΔT`, Peltier,
half-Joule and conduction terms only, zero heat load. `hot_side_not_cold`
separates `T_h²`. It is not a multistage cooler and not the temperature
dependence of `S`.
-/

namespace PhysJS.PeltierMaxDeltaT

/-- Cold-side pumped heat. -/
noncomputable def coldHeat (S R K Tc ΔT I : ℝ) : ℝ :=
  S * Tc * I - I ^ 2 * R / 2 - K * ΔT

/-- `dQ_c/dI = S T_c − R I`. -/
theorem coldHeat_slope (S R K Tc ΔT I : ℝ) :
    HasDerivAt (coldHeat S R K Tc ΔT) (S * Tc - R * I) I := by
  have hid := hasDerivAt_id I
  have hlin : HasDerivAt (fun t => S * Tc * t) (S * Tc) I := by
    simpa [mul_one] using hid.const_mul (S * Tc)
  have hsq : HasDerivAt (fun t : ℝ => t ^ 2) (2 * I) I := by
    simpa using hasDerivAt_pow 2 I
  have hjoule : HasDerivAt (fun t => (R / 2) * t ^ 2) ((R / 2) * (2 * I)) I := hsq.const_mul (R / 2)
  have hconst : HasDerivAt (fun _ : ℝ => K * ΔT) 0 I := hasDerivAt_const I _
  have hsum := (hlin.sub hjoule).sub hconst
  have hfun : (fun t => S * Tc * t - (R / 2) * t ^ 2 - K * ΔT) = coldHeat S R K Tc ΔT := by
    ext t
    simp [coldHeat]
    ring
  rw [← hfun]
  exact hsum.congr_deriv (by ring)

/-- The stationary current is `S T_c / R`. -/
theorem optimal_current (S R Tc I : ℝ) (hR : R ≠ 0) :
    S * Tc - R * I = 0 ↔ I = S * Tc / R := by
  constructor
  · intro h
    field_simp
    linarith
  · intro h
    rw [h]
    field_simp
    ring

/-- At the optimum the heat is `S² T_c² / (2R) − K ΔT`, and no current does
better. -/
theorem max_heat (S R K Tc ΔT I : ℝ) (hR : 0 < R) :
    coldHeat S R K Tc ΔT (S * Tc / R) = S ^ 2 * Tc ^ 2 / (2 * R) - K * ΔT ∧
      coldHeat S R K Tc ΔT I ≤ S ^ 2 * Tc ^ 2 / (2 * R) - K * ΔT := by
  constructor
  · unfold coldHeat
    field_simp
    ring
  · unfold coldHeat
    have hsq : 0 ≤ (R * I - S * Tc) ^ 2 / (2 * R) := by positivity
    have : S * Tc * I - I ^ 2 * R / 2 - K * ΔT =
        S ^ 2 * Tc ^ 2 / (2 * R) - K * ΔT - (R * I - S * Tc) ^ 2 / (2 * R) := by
      field_simp
      ring
    linarith

/-- Maximum temperature difference of a Peltier couple.

`hZ` is `Z = S² / (R K)`.

Kind `bridge` on `PhysJS.PeltierMaxDeltaT.max_delta_t_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
multistage cooler, and not temperature-dependent properties. -/
theorem max_delta_t_eq (S R K Tc ΔT Z : ℝ) (hR : 0 < R) (hK : 0 < K)
    (hZ : Z = S ^ 2 / (R * K)) :
    ((∃ I, 0 ≤ coldHeat S R K Tc ΔT I) ↔ ΔT ≤ (1 / 2) * Z * Tc ^ 2) ∧
      (coldHeat S R K Tc ΔT (S * Tc / R) = 0 ↔ ΔT = (1 / 2) * Z * Tc ^ 2) := by
  have hmax := max_heat S R K Tc ΔT
  have hkey : S ^ 2 * Tc ^ 2 / (2 * R) - K * ΔT = K * ((1 / 2) * Z * Tc ^ 2 - ΔT) := by
    rw [hZ]
    field_simp
  refine ⟨⟨?_, ?_⟩, ?_⟩
  · rintro ⟨I, hI⟩
    have h1 := (hmax I hR).2
    have h2 : 0 ≤ K * ((1 / 2) * Z * Tc ^ 2 - ΔT) := by linarith
    have h3 : 0 ≤ (1 / 2) * Z * Tc ^ 2 - ΔT := by
      by_contra hneg
      rw [not_le] at hneg
      nlinarith
    linarith
  · intro h
    refine ⟨S * Tc / R, ?_⟩
    rw [(hmax (S * Tc / R) hR).1, hkey]
    have : 0 ≤ (1 / 2) * Z * Tc ^ 2 - ΔT := by linarith
    positivity
  · constructor
    · intro h
      rw [(hmax (S * Tc / R) hR).1, hkey] at h
      rcases mul_eq_zero.mp h with h1 | h1
      · exact absurd h1 hK.ne'
      · linarith
    · intro h
      rw [(hmax (S * Tc / R) hR).1, hkey, h]
      ring

/-- The hot-side temperature squared is a different bound. -/
theorem hot_side_not_cold (Z Tc ΔT : ℝ) (hZ : 0 < Z) (hTc : 0 < Tc) (hΔ : 0 < ΔT) :
    (1 / 2) * Z * (Tc + ΔT) ^ 2 ≠ (1 / 2) * Z * Tc ^ 2 := by
  intro h
  have hlt : Tc ^ 2 < (Tc + ΔT) ^ 2 := by nlinarith
  have : 0 < (1 / 2) * Z := by positivity
  nlinarith

end PhysJS.PeltierMaxDeltaT
