/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.DiffusionMode
import lean.Prandtl
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring
import Mathlib.Tactic.NormNum

/-!
`be-158`. Bridge. The Schmidt number.

`be-158.lewis`. Property. `lewis_ratio`.

The catalog product is `Sc ρ D = μ`. `schmidt_eq` takes one Fourier mode
`exp(−r t) sin(q x)` under momentum diffusion (`ν`) and mass diffusion
(`D`). `PhysJS.DiffusionMode.decay_rate_ratio` turns the rate ratio into
`ν / D`, with `ν = μ / ρ`, so `Sc ρ D = μ`. `lewis_ratio` is the separate
corollary `Le = Sc / Pr` from the three diffusivities, not a second catalog
target. It is not a mass-transfer correlation.
-/

namespace PhysJS.Schmidt

open PhysJS.DiffusionMode
open PhysJS.Prandtl

/-- The momentum-to-mass decay-rate ratio of a mode is `ν / D`, so `Sc ρ D = μ`. -/
theorem schmidt_eq (Sc ν D μ ρ q ru rc : ℝ)
    (hρ : ρ ≠ 0) (hD : D ≠ 0) (hμ : μ ≠ 0) (hq : q ≠ 0)
    (hkin : ν = μ / ρ)
    (hu : Solves ru q 0 ν) (hc : Solves rc q 0 D)
    (hSc : Sc = ru / rc) :
    Sc = ν / D ∧ Sc * ρ * D = μ := by
  have hSc' : Sc = ν / D := by
    rw [hSc, decay_rate_ratio ru rc q 0 ν D hq hD hu hc]
  refine ⟨hSc', ?_⟩
  rw [hSc', hkin]
  field_simp

/-- The same Schmidt product at a general advection speed. -/
theorem schmidt_eq_advected (Sc ν D μ ρ q U ru rc : ℝ)
    (hρ : ρ ≠ 0) (hD : D ≠ 0) (hμ : μ ≠ 0) (hq : q ≠ 0)
    (hkin : ν = μ / ρ)
    (hu : Solves ru q U ν) (hc : Solves rc q U D)
    (hSc : Sc = ru / rc) :
    Sc = ν / D ∧ Sc * ρ * D = μ := by
  have hSc' : Sc = ν / D := by
    rw [hSc, decay_rate_ratio ru rc q U ν D hq hD hu hc]
  refine ⟨hSc', ?_⟩
  rw [hSc', hkin]
  field_simp

/-- The Lewis number is the heat-to-mass diffusivity ratio and equals `Sc / Pr`. -/
theorem lewis_ratio (Le Sc Pr ν α D q ru rθ rc : ℝ)
    (hν : ν ≠ 0) (hα : α ≠ 0) (hD : D ≠ 0) (hq : q ≠ 0)
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α) (hc : Solves rc q 0 D)
    (hLe : Le = rθ / rc) (hSc : Sc = ru / rc) (hPr : Pr = ru / rθ) :
    Le = α / D ∧ Le = Sc / Pr := by
  have hSc' : Sc = ν / D := by
    rw [hSc, decay_rate_ratio ru rc q 0 ν D hq hD hu hc]
  have hPr' : Pr = ν / α := by
    rw [hPr, decay_rate_ratio ru rθ q 0 ν α hq hα hu hθ]
  have hLe' : Le = α / D := by
    rw [hLe, decay_rate_ratio rθ rc q 0 α D hq hD hθ hc]
  refine ⟨hLe', ?_⟩
  rw [hLe', hSc', hPr']
  field_simp

/-- The same Lewis ratio at a general advection speed. -/
theorem lewis_ratio_advected (Le Sc Pr ν α D q U ru rθ rc : ℝ)
    (hν : ν ≠ 0) (hα : α ≠ 0) (hD : D ≠ 0) (hq : q ≠ 0)
    (hu : Solves ru q U ν) (hθ : Solves rθ q U α) (hc : Solves rc q U D)
    (hLe : Le = rθ / rc) (hSc : Sc = ru / rc) (hPr : Pr = ru / rθ) :
    Le = α / D ∧ Le = Sc / Pr := by
  have hSc' : Sc = ν / D := by
    rw [hSc, decay_rate_ratio ru rc q U ν D hq hD hu hc]
  have hPr' : Pr = ν / α := by
    rw [hPr, decay_rate_ratio ru rθ q U ν α hq hα hu hθ]
  have hLe' : Le = α / D := by
    rw [hLe, decay_rate_ratio rθ rc q U α D hq hD hθ hc]
  refine ⟨hLe', ?_⟩
  rw [hLe', hSc', hPr']
  field_simp

/-- Equal kinematic and mass diffusivities give `Sc = 1`. -/
theorem sc_one_of_equal_diffusivities (Sc ν D q ru rc : ℝ)
    (hq : q ≠ 0) (hD : D ≠ 0) (hνD : ν = D)
    (hu : Solves ru q 0 ν) (hc : Solves rc q 0 D) (hSc : Sc = ru / rc) :
    Sc = 1 := by
  rw [hSc, decay_rate_ratio ru rc q 0 ν D hq hD hu hc, hνD, div_self hD]

/-- Doubling the wavenumber leaves `Sc` unchanged. -/
theorem sc_wavenumber_invariant (Sc Sc' ν D q ru rc ru' rc' : ℝ)
    (hq : q ≠ 0) (hD : D ≠ 0)
    (hu : Solves ru q 0 ν) (hc : Solves rc q 0 D)
    (hu' : Solves ru' (2 * q) 0 ν) (hc' : Solves rc' (2 * q) 0 D)
    (hSc : Sc = ru / rc) (hSc' : Sc' = ru' / rc') :
    Sc = Sc' := by
  have hq' : 2 * q ≠ 0 := mul_ne_zero two_ne_zero hq
  rw [hSc, hSc', decay_rate_ratio ru rc q 0 ν D hq hD hu hc,
    decay_rate_ratio ru' rc' (2 * q) 0 ν D hq' hD hu' hc']

/-- Catalog inputs `μ = 0.00089`, `ρ = 997`, `D = 2.3×10⁻⁹` give `Sc = 8900000/22931`. -/
theorem sc_catalog_rational :
    (89 / 100000 : ℝ) / (997 * (23 / 10 ^ 10)) = 8900000 / 22931 := by norm_num

/-- The catalog point matches `μ / (ρ D)` and the decay-rate ratio `ν / D`. -/
theorem sc_catalog_cross_check (Sc ν D μ ρ q ru rc : ℝ)
    (hμ : μ = 89 / 100000) (hρ : ρ = 997) (hDval : D = 23 / 10 ^ 10)
    (hρ0 : ρ ≠ 0) (hD : D ≠ 0) (hμ0 : μ ≠ 0) (hq : q ≠ 0)
    (hkin : ν = μ / ρ)
    (hu : Solves ru q 0 ν) (hc : Solves rc q 0 D) (hSc : Sc = ru / rc) :
    Sc = 8900000 / 22931 ∧ Sc = μ / (ρ * D) := by
  have ⟨hSc', _⟩ :=
    schmidt_eq Sc ν D μ ρ q ru rc hρ0 hD hμ0 hq hkin hu hc hSc
  refine ⟨?_, ?_⟩
  · rw [hSc', hkin, hμ, hρ, hDval]
    norm_num
  · rw [hSc']
    rw [hkin, hμ, hρ, hDval]
    field_simp

/-- When `ν = α = D`, all three dimensionless numbers equal `1`. -/
theorem unity_of_equal_diffusivities (Sc Le Pr ν α D q ru rθ rc : ℝ)
    (hq : q ≠ 0) (hD : D ≠ 0) (hνα : ν = α) (hαD : α = D)
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α) (hc : Solves rc q 0 D)
    (hSc : Sc = ru / rc) (hLe : Le = rθ / rc) (hPr : Pr = ru / rθ) :
    Sc = 1 ∧ Le = 1 ∧ Pr = 1 := by
  have hα : α ≠ 0 := ne_of_eq_of_ne hαD hD
  refine ⟨sc_one_of_equal_diffusivities Sc ν D q ru rc hq hD (hνα.trans hαD) hu hc hSc, ?_, ?_⟩
  · rw [hLe, decay_rate_ratio rθ rc q 0 α D hq hD hθ hc, hαD, div_self hD]
  · exact pr_one_of_equal_diffusivities Pr ν α ru rθ q hq hα hνα hu hθ hPr

/-- Equal thermal and mass diffusivities give `Le = 1`. -/
theorem le_one_of_equal_diffusivities (Le α D q rθ rc : ℝ)
    (hq : q ≠ 0) (hD : D ≠ 0) (hαD : α = D)
    (hθ : Solves rθ q 0 α) (hc : Solves rc q 0 D) (hLe : Le = rθ / rc) :
    Le = 1 := by
  rw [hLe, decay_rate_ratio rθ rc q 0 α D hq hD hθ hc, hαD, div_self hD]

/-- `Pr = Sc` gives `Le = 1`. -/
theorem le_one_of_pr_eq_sc (Le Sc Pr : ℝ) (hPr : Pr ≠ 0) (hEq : Pr = Sc)
    (hLe : Le = Sc / Pr) : Le = 1 := by
  have hSc : Sc ≠ 0 := hEq ▸ hPr
  rw [hLe, hEq, div_self hSc]

/-- Doubling the wavenumber leaves `Le` unchanged. -/
theorem le_wavenumber_invariant (Le Le' α D q rθ rc rθ' rc' : ℝ)
    (hq : q ≠ 0) (hD : D ≠ 0)
    (hθ : Solves rθ q 0 α) (hc : Solves rc q 0 D)
    (hθ' : Solves rθ' (2 * q) 0 α) (hc' : Solves rc' (2 * q) 0 D)
    (hLe : Le = rθ / rc) (hLe' : Le' = rθ' / rc') :
    Le = Le' := by
  have hq' : 2 * q ≠ 0 := mul_ne_zero two_ne_zero hq
  rw [hLe, hLe', decay_rate_ratio rθ rc q 0 α D hq hD hθ hc,
    decay_rate_ratio rθ' rc' (2 * q) 0 α D hq' hD hθ' hc']

end PhysJS.Schmidt
