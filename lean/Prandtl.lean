/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.DiffusionMode
import Mathlib.Order.Filter.AtTopBot.Ring
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring
import Mathlib.Tactic.NormNum

/-!
`be-154`. Bridge. The Prandtl number as a ratio of diffusion rates.

The catalog product is `Pr k = μ c_p`. `prandtl_eq` takes `Pr` as the
ratio of the decay rates of one Fourier mode `exp(−r t) sin(q x)` under
momentum diffusion `∂u/∂t = ν ∂²u/∂x²` and under heat conduction
`∂θ/∂t = α ∂²θ/∂x²`. `PhysJS.DiffusionMode.decay_rate_ratio` turns those
rates into `ν / α`, so

```
Pr = r_u / r_θ = ν / α = μ c_p / k,    ν = μ / ρ,    α = k / (ρ c_p)
```

for every wavenumber `q`. It is not a heat-transfer correlation, and it is
not the Reynolds analogy of `be-86`.
-/

namespace PhysJS.Prandtl

open Filter Topology
open PhysJS.DiffusionMode

/-- Heat decay time over momentum decay time equals `ν / α`, the same ratio as `Pr`. -/
theorem prandtl_time_ratio (ν α ru rθ τu τθ q : ℝ)
    (hq : q ≠ 0) (hν : ν ≠ 0) (hα : α ≠ 0)
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α)
    (hτu : τu = 1 / ru) (hτθ : τθ = 1 / rθ) :
    τθ / τu = ν / α := by
  have hrθ : rθ ≠ 0 := by
    rw [(mode_solves_iff rθ q 0 α hq).1 hθ]
    exact mul_ne_zero hα (pow_ne_zero 2 hq)
  have hru : ru ≠ 0 := by
    rw [(mode_solves_iff ru q 0 ν hq).1 hu]
    exact mul_ne_zero hν (pow_ne_zero 2 hq)
  rw [hτθ, hτu]
  calc (1 / rθ) / (1 / ru)
      = ru / rθ := by field_simp
    _ = ν / α := decay_rate_ratio ru rθ q 0 ν α hq hα hu hθ

/-- The momentum-to-heat decay-rate ratio of a mode is `ν / α`, so `Pr k = μ c_p`. -/
theorem prandtl_eq (Pr ν α μ ρ k cp q ru rθ : ℝ)
    (hρ : ρ ≠ 0) (hk : k ≠ 0) (hcp : cp ≠ 0) (hq : q ≠ 0)
    (hν : ν = μ / ρ) (hαdef : α = k / (ρ * cp))
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α)
    (hPr : Pr = ru / rθ) :
    Pr = ν / α ∧ Pr * k = μ * cp ∧ Pr = μ * cp / k := by
  have hα : α ≠ 0 := by
    rw [hαdef]
    exact div_ne_zero hk (mul_ne_zero hρ hcp)
  have hrate : Pr = ν / α := by
    rw [hPr, decay_rate_ratio ru rθ q 0 ν α hq hα hu hθ]
  have hratio : ν / α = μ * cp / k := by
    rw [hν, hαdef]
    field_simp
  refine ⟨hrate, ?_, ?_⟩
  · rw [hrate, hratio]
    field_simp
  · rw [hrate, hratio]

/-- The same Prandtl product at a general advection speed. -/
theorem prandtl_eq_advected (Pr ν α μ ρ k cp q U ru rθ : ℝ)
    (hρ : ρ ≠ 0) (hk : k ≠ 0) (hcp : cp ≠ 0) (hq : q ≠ 0)
    (hν : ν = μ / ρ) (hαdef : α = k / (ρ * cp))
    (hu : Solves ru q U ν) (hθ : Solves rθ q U α)
    (hPr : Pr = ru / rθ) :
    Pr = ν / α ∧ Pr * k = μ * cp ∧ Pr = μ * cp / k := by
  have hα : α ≠ 0 := by
    rw [hαdef]
    exact div_ne_zero hk (mul_ne_zero hρ hcp)
  have hrate : Pr = ν / α := by
    rw [hPr, decay_rate_ratio ru rθ q U ν α hq hα hu hθ]
  have hratio : ν / α = μ * cp / k := by
    rw [hν, hαdef]
    field_simp
  refine ⟨hrate, ?_, ?_⟩
  · rw [hrate, hratio]
    field_simp
  · rw [hrate, hratio]

/-- Equal kinematic and thermal diffusivities give `Pr = 1`. -/
theorem pr_one_of_equal_diffusivities (Pr ν α ru rθ q : ℝ)
    (hq : q ≠ 0) (hα : α ≠ 0) (hνα : ν = α)
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α) (hPr : Pr = ru / rθ) :
    Pr = 1 := by
  rw [hPr, decay_rate_ratio ru rθ q 0 ν α hq hα hu hθ, hνα, div_self hα]

/-- Doubling the wavenumber leaves `Pr` unchanged. -/
theorem pr_wavenumber_invariant (Pr Pr' ν α q ru rθ ru' rθ' : ℝ)
    (hq : q ≠ 0) (hα : α ≠ 0)
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α)
    (hu' : Solves ru' (2 * q) 0 ν) (hθ' : Solves rθ' (2 * q) 0 α)
    (hPr : Pr = ru / rθ) (hPr' : Pr' = ru' / rθ') :
    Pr = Pr' := by
  have hq' : 2 * q ≠ 0 := mul_ne_zero two_ne_zero hq
  rw [hPr, hPr', decay_rate_ratio ru rθ q 0 ν α hq hα hu hθ,
    decay_rate_ratio ru' rθ' (2 * q) 0 ν α hq' hα hu' hθ']

/-- Catalog inputs `μ = 0.001`, `c_p = 4180`, `k = 0.6` give `Pr = 209/30`. -/
theorem pr_catalog_rational : (1 / 1000 : ℝ) * 4180 / (3 / 5) = 209 / 30 := by norm_num

/-- The catalog water point matches the decay-rate ratio and the product `μ c_p / k`. -/
theorem pr_catalog_cross_check (Pr ν α μ ρ k cp q ru rθ : ℝ)
    (hμ : μ = 1 / 1000) (hcp : cp = 4180) (hk : k = 3 / 5)
    (hρ : ρ ≠ 0) (hk0 : k ≠ 0) (hcp0 : cp ≠ 0) (hq : q ≠ 0)
    (hν : ν = μ / ρ) (hαdef : α = k / (ρ * cp))
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α) (hPr : Pr = ru / rθ) :
    Pr = 209 / 30 ∧ Pr = μ * cp / k := by
  have ⟨_, _, hprod⟩ :=
    prandtl_eq Pr ν α μ ρ k cp q ru rθ hρ hk0 hcp0 hq hν hαdef hu hθ hPr
  have hval : μ * cp / k = 209 / 30 := by
    rw [hμ, hcp, hk]
    exact pr_catalog_rational
  exact ⟨by rw [hprod, hval], by rw [hprod, hval]⟩

/-- At fixed `μ` and `c_p`, the catalog product `Pr = μ c_p / k` tends to `0` as `k → ∞`. -/
theorem pr_k_tendsto_zero (μ cp : ℝ) :
    Tendsto (fun k : ℝ => μ * cp / k) atTop (𝓝 0) := by
  have hinv := tendsto_inv_atTop_zero (𝕜 := ℝ)
  have hid : Tendsto (fun k : ℝ => k) atTop atTop := tendsto_id
  have hk : Tendsto (fun k : ℝ => k⁻¹) atTop (𝓝 0) := hinv.comp hid
  simpa [div_eq_mul_inv] using Filter.Tendsto.const_mul (μ * cp) hk

/-- Doubling density at fixed `μ`, `c_p`, and `k` leaves `ν / α` unchanged. -/
theorem pr_density_invariant (μ cp k ρ : ℝ) (hρ : ρ ≠ 0) (hk : k ≠ 0) (hcp : cp ≠ 0) :
    (μ / ρ) / (k / (ρ * cp)) = (μ / (2 * ρ)) / (k / (2 * ρ * cp)) := by
  field_simp [hρ, hk, hcp]

/-- Catalog unit point `μ = c_p = k = 1` gives `Pr = 1`. -/
theorem pr_unit_inputs : (1 : ℝ) * 1 / 1 = 1 := by norm_num

end PhysJS.Prandtl
