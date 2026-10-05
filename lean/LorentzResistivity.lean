/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-116`. Bridge. Lorentz resistivity. The typed prefactor is a different closure.

Proved under these hypotheses. The transport cross section is the
Rutherford hypothesis `σ_tr = 4π b₀² ln Λ`, with
`b₀ = Z e² / (4π ε0 m v²)`. The angular integral that produces `4π b₀² ln Λ`
is not evaluated. The collision frequency is `ν(v) = n_i v σ_tr`.
At `v_T² = 2 k_B T / m`,

```
ν(v_T) = n_i Z² e⁴ ln Λ √2 / (16 π ε0² √m (k_B T)^{3/2})
```

where `(k_B T)^{3/2}` is written `k_B T √(k_B T)`.

Two closures then differ. The reference collision time, the conventional
link used by the NRL/Helander formula and not a derived moment, is
`1/τ_e = (4 / (3 √π)) ν(v_T)`. With `n_e = Z n_i` and
`η_ref = m_e / (n_e e² τ_e)`,

```
η_ref = (4 √(2π) / 3) Z e² √m ln Λ / ((4π ε0)² (k_B T)^{3/2})
```

That is the prefactor often typed for the Lorentz resistivity. The
conductivity-weighted Lorentz moment is a second hypothesis, not the
Gaussian integral: `σ = (8 / √π) n_e e² / (m ν(v_T))`. Its resistivity is

```
η = (π √(2π) / 8) Z e² √m ln Λ / ((4π ε0)² (k_B T)^{3/2})
```

and `η_ref = (32 / (3π)) η`. The factor `8/√π` is about `4.51`, the
"number greater than four" in the Lorentz conductivity. Electron-electron
collisions and the Spitzer–Härm factor `0.51` are a different integral
and are not proved here. `resistivity_eq` is the kinetic closure.
-/

namespace PhysJS.LorentzResistivity

/-- `ν(v_T)` from the Rutherford transport cross section. -/
theorem collision_frequency (ni Z e eps0 m kT lnΛ b0 vT σ ν : ℝ)
    (hm : 0 < m) (hkT : 0 < kT) (hε : eps0 ≠ 0)
    (hvT : vT = Real.sqrt (2 * kT / m))
    (hb0 : b0 = Z * e ^ 2 / (4 * Real.pi * eps0 * m * vT ^ 2))
    (hσ : σ = 4 * Real.pi * b0 ^ 2 * lnΛ)
    (hν : ν = ni * vT * σ) :
    ν = ni * Z ^ 2 * e ^ 4 * lnΛ * Real.sqrt 2 /
      (16 * Real.pi * eps0 ^ 2 * Real.sqrt m * (kT * Real.sqrt kT)) := by
  have hv2 : vT ^ 2 = 2 * kT / m := by
    rw [hvT, Real.sq_sqrt (by positivity)]
  have hb : b0 = Z * e ^ 2 / (8 * Real.pi * eps0 * kT) := by
    rw [hb0, hv2]
    field_simp [hm.ne', hkT.ne', hε, Real.pi_ne_zero]
    ring
  have hσ' : σ = Z ^ 2 * e ^ 4 * lnΛ / (16 * Real.pi * eps0 ^ 2 * kT ^ 2) := by
    rw [hσ, hb]
    field_simp [hkT.ne', hε, Real.pi_ne_zero]
    ring
  rw [hν, hvT, hσ']
  have hrad : Real.sqrt (2 * kT / m) =
      Real.sqrt 2 * Real.sqrt kT / Real.sqrt m := by
    rw [div_eq_mul_inv, Real.sqrt_mul (by positivity : (0 : ℝ) ≤ 2 * kT), Real.sqrt_inv,
      Real.sqrt_mul (by norm_num : (0 : ℝ) ≤ 2)]
    ring
  rw [hrad]
  field_simp [hm.ne', hkT.ne', hε, Real.pi_ne_zero, Real.sqrt_ne_zero'.mpr hm,
    Real.sqrt_ne_zero'.mpr hkT]
  rw [Real.sq_sqrt hkT.le]
  ring

/-- Reference resistivity from `1/τ = (4/(3 √π)) ν(v_T)` and `η = m/(n_e e² τ)`.

This is the typed prefactor. It is not the conductivity moment. -/
theorem reference_resistivity (η ν τ ne ni Z e eps0 m kT lnΛ : ℝ)
    (hν : ν = ni * Z ^ 2 * e ^ 4 * lnΛ * Real.sqrt 2 /
      (16 * Real.pi * eps0 ^ 2 * Real.sqrt m * (kT * Real.sqrt kT)))
    (hτ : 1 / τ = 4 / (3 * Real.sqrt Real.pi) * ν)
    (hη : η = m / (ne * e ^ 2 * τ))
    (hne : ne = Z * ni)
    (hτ0 : τ ≠ 0) (hne0 : ne ≠ 0) (he : e ≠ 0) (hm : 0 < m)
    (hε : eps0 ≠ 0) (hkT : 0 < kT) (hni : ni ≠ 0) (hZ : Z ≠ 0) :
    η = (4 * Real.sqrt (2 * Real.pi) / 3) * Z * e ^ 2 * Real.sqrt m * lnΛ /
      ((4 * Real.pi * eps0) ^ 2 * (kT * Real.sqrt kT)) := by
  have hcoeff : (4 : ℝ) / (3 * Real.sqrt Real.pi) ≠ 0 :=
    div_ne_zero (by norm_num)
      (mul_ne_zero (by norm_num) (Real.sqrt_ne_zero'.mpr Real.pi_pos))
  have hν0 : ν ≠ 0 := by
    intro hz
    rw [hz, mul_zero] at hτ
    exact div_ne_zero one_ne_zero hτ0 hτ
  have hτ' : τ = 1 / ((4 : ℝ) / (3 * Real.sqrt Real.pi) * ν) := by
    symm
    rw [div_eq_iff (mul_ne_zero hcoeff hν0)]
    have hmul := congrArg (fun z => z * τ) hτ
    have hc : (1 : ℝ) / τ * τ = 1 := by field_simp [hτ0]
    rw [hc] at hmul
    linarith
  rw [hη, hne, hτ', hν, Real.sqrt_mul (by norm_num : (0 : ℝ) ≤ 2)]
  field_simp [hne0, he, hm.ne', hε, hkT.ne', hni, hZ, Real.pi_ne_zero,
    Real.sqrt_ne_zero'.mpr hm, Real.sqrt_ne_zero'.mpr hkT,
    Real.sqrt_ne_zero'.mpr Real.pi_pos]
  rw [Real.sq_sqrt Real.pi_pos.le, Real.sq_sqrt hm.le]
  ring

/-- Kinetic resistivity from `σ = (8/√π) n_e e² / (m ν)`.

The factor `8/√π` is the conductivity moment, a hypothesis. -/
theorem resistivity_eq (η ν ne ni Z e eps0 m kT lnΛ : ℝ)
    (hν : ν = ni * Z ^ 2 * e ^ 4 * lnΛ * Real.sqrt 2 /
      (16 * Real.pi * eps0 ^ 2 * Real.sqrt m * (kT * Real.sqrt kT)))
    (hη : η = 1 / ((8 / Real.sqrt Real.pi) * ne * e ^ 2 / (m * ν)))
    (hne : ne = Z * ni)
    (hne0 : ne ≠ 0) (he : e ≠ 0) (hm : 0 < m) (hν0 : ν ≠ 0)
    (hε : eps0 ≠ 0) (hkT : 0 < kT) (hni : ni ≠ 0) (hZ : Z ≠ 0) :
    η = (Real.pi * Real.sqrt (2 * Real.pi) / 8) * Z * e ^ 2 * Real.sqrt m * lnΛ /
      ((4 * Real.pi * eps0) ^ 2 * (kT * Real.sqrt kT)) := by
  rw [hη, hne, hν, Real.sqrt_mul (by norm_num : (0 : ℝ) ≤ 2)]
  field_simp [hne0, he, hm.ne', hν0, hε, hkT.ne', hni, hZ, Real.pi_ne_zero,
    Real.sqrt_ne_zero'.mpr hm, Real.sqrt_ne_zero'.mpr hkT,
    Real.sqrt_ne_zero'.mpr Real.pi_pos]
  rw [Real.sq_sqrt hm.le]
  ring

/-- On one and the same `ν`, the reference closure is `32/(3π)` times the kinetic one. -/
theorem reference_over_lorentz (ηRef ηKin ν τ ne m e : ℝ)
    (hτ : 1 / τ = 4 / (3 * Real.sqrt Real.pi) * ν)
    (hRef : ηRef = m / (ne * e ^ 2 * τ))
    (hKin : ηKin = 1 / ((8 / Real.sqrt Real.pi) * ne * e ^ 2 / (m * ν)))
    (hτ0 : τ ≠ 0) (hne : ne ≠ 0) (he : e ≠ 0) (hm : m ≠ 0) (hν : ν ≠ 0) :
    ηRef = (32 / (3 * Real.pi)) * ηKin := by
  have hcoeff : (4 : ℝ) / (3 * Real.sqrt Real.pi) ≠ 0 :=
    div_ne_zero (by norm_num)
      (mul_ne_zero (by norm_num) (Real.sqrt_ne_zero'.mpr Real.pi_pos))
  have hτ' : τ = 1 / ((4 : ℝ) / (3 * Real.sqrt Real.pi) * ν) := by
    symm
    rw [div_eq_iff (mul_ne_zero hcoeff hν)]
    have hmul := congrArg (fun z => z * τ) hτ
    have hc : (1 : ℝ) / τ * τ = 1 := by field_simp [hτ0]
    rw [hc] at hmul
    linarith
  rw [hRef, hKin, hτ']
  field_simp [hne, he, hm, hν, Real.pi_ne_zero, Real.sqrt_ne_zero'.mpr Real.pi_pos]
  rw [Real.sq_sqrt Real.pi_pos.le]
  ring

end PhysJS.LorentzResistivity
