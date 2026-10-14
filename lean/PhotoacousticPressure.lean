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
`be-249`. Bridge. Photoacoustic initial pressure.

The catalog equation is

```
p₀ = Γ μ_a F        Γ = β c² / C_p
```

with `μ_a` the optical absorption coefficient, `F` the fluence, `Γ` the
Grüneisen parameter, `β` the volumetric thermal expansion coefficient, `c`
the sound speed and `C_p` the specific heat capacity at constant pressure
(per unit mass).

The premises are stress and thermal confinement: the pulse is absorbed and
thermalised before the medium can expand or conduct heat, so the heating is at
constant volume.

1. Deposited energy density `H = μ_a F`, temperature rise `ΔT = H / (ρ C_v)`.
2. Constant-volume thermodynamics: `(∂p/∂T)_V = β K_T`, so `p₀ = β K_T ΔT`.
3. Adiabatic and isothermal bulk moduli: `K_S = K_T C_p / C_v`, and
   `c² = K_S / ρ`.

`photoacoustic_eq` combines them: `p₀ = (β c² / C_p) μ_a F`, with `C_v`,
`K_T` and `K_S` eliminated. `not_cv_form` shows that the same expression
with `C_v` in place of `C_p` is a different number unless `C_p = C_v`. The
numerical Grüneisen value of water is not evaluated here.

It does not derive the thermodynamic identities and assumes linear
absorption, no scattering and a homogeneous medium.
-/

namespace PhysJS.PhotoacousticPressure

/-- Initial pressure from constant-volume heating.

`hΔT` is `ΔT = μ_a F/(ρ C_v)`, `hp` is `p₀ = β K_T ΔT`, `hKS` is
`K_S = K_T C_p / C_v`, `hc` is `c² = K_S / ρ`.

Not
a derivation of the thermodynamic identities or of confinement. -/
theorem photoacoustic_eq (p₀ ΔT β KT KS c ρ Cv Cp μa F : ℝ)
    (hρ : 0 < ρ) (hCv : 0 < Cv) (hCp : 0 < Cp)
    (hΔT : ΔT = μa * F / (ρ * Cv)) (hp : p₀ = β * KT * ΔT)
    (hKS : KS = KT * Cp / Cv) (hc : c ^ 2 = KS / ρ) :
    p₀ = (β * c ^ 2 / Cp) * (μa * F) := by
  have hρ0 : ρ ≠ 0 := hρ.ne'
  have hCv0 : Cv ≠ 0 := hCv.ne'
  have hCp0 : Cp ≠ 0 := hCp.ne'
  rw [hp, hΔT, hc, hKS]
  field_simp

/-- The Grüneisen parameter is non-negative for `β ≥ 0`. -/
theorem gruneisen_nonneg (β c Cp : ℝ) (hβ : 0 ≤ β) (hCp : 0 < Cp) :
    0 ≤ β * c ^ 2 / Cp := by positivity

/-- Using `C_v` instead of `C_p` gives a different coefficient unless the
heat capacities coincide. -/
theorem not_cv_form (β c Cv Cp : ℝ) (hβ : 0 < β) (hc : 0 < c) (hCv : 0 < Cv)
    (hCp : 0 < Cp) (hne : Cv ≠ Cp) :
    β * c ^ 2 / Cp ≠ β * c ^ 2 / Cv := by
  intro h
  have hnum : 0 < β * c ^ 2 := by positivity
  rw [div_eq_div_iff hCp.ne' hCv.ne'] at h
  exact hne (mul_left_cancel₀ hnum.ne' h)

/-- Pressure is linear in fluence: doubling `F` doubles `p₀`. -/
theorem linear_in_fluence (Γ μa F : ℝ) : Γ * μa * (2 * F) = 2 * (Γ * μa * F) := by ring

/-- Units alone do not entail the product: with `Γ = β c²/C_p` and `Γ' = β c/C_p`
(the wrong power of `c`) the pressures differ at `c = 2`. -/
theorem power_of_c_not_fixed : ∃ β c Cp : ℝ, 0 < β ∧ 0 < c ∧ 0 < Cp ∧
    β * c ^ 2 / Cp ≠ β * c / Cp :=
  ⟨1, 2, 1, by norm_num, by norm_num, by norm_num, by norm_num⟩

end PhysJS.PhotoacousticPressure
