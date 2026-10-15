/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.GibbsIsotherm
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-151`. Bridge. Nernst potential and the reaction Gibbs energy.

The catalog equations are

```
E = E° − (R T / (n F)) ln Q
ΔG = −n F E
```

with `F = N_A e`. Here `e` is the elementary charge. `nernst_eq` derives
the cell potential from the ideal activities `μ_i = μ_i° + R T ln a_i` of
the species in the cell reaction: `reaction_gibbs` sums them into
`ΔG = ΔG° + R T ln Q`, with `ΔG = Σ ν_i μ_i`, `ΔG° = Σ ν_i μ_i°` and
`ln Q = Σ ν_i ln a_i`, and the electrical work `ΔG = −n F E`,
`ΔG° = −n F E°` turns that into the potential. `standard_from_gibbs` is
`ΔG°` as `PhysJS.GibbsIsotherm.gibbs_eq`, so `E° = (R T / (n F)) ln K`.
With `R = N_A k_B` the molar prefactor is `k_B T / (n e)`. This is not the
ideal diode of `be-82`.
-/

namespace PhysJS.NernstGibbs

/-- The reaction Gibbs energy of ideal activities is `ΔG° + R T ln Q`.

`hμ` is `μ_i = μ_i° + R T ln a_i`; `ΔG = Σ ν_i μ_i`, `ΔG° = Σ ν_i μ_i°`
and `ln Q = Σ ν_i ln a_i`. No equilibrium is assumed. -/
theorem reaction_gibbs {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ) (R T Q dG dG0 : ℝ)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogQ : Real.log Q = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ i)
    (hdG0 : dG0 = ∑ i ∈ s, ν i * μ0 i) :
    dG = dG0 + R * T * Real.log Q := by
  have hterm : ∀ i ∈ s, ν i * μ i = ν i * μ0 i + (R * T) * (ν i * Real.log (a i)) := by
    intro i hi
    rw [hμ i hi]
    ring
  rw [hdG, hdG0, hlogQ, Finset.sum_congr rfl hterm, Finset.sum_add_distrib, Finset.mul_sum]

/-- Nernst equation from ideal activities, and the same potential with `R / F = k_B / e`.

The species of the cell reaction have `μ_i = μ_i° + R T ln a_i`, the
reaction quotient is `ln Q = Σ ν_i ln a_i`, and `ΔG = Σ ν_i μ_i`,
`ΔG° = Σ ν_i μ_i°`. `hwork` and `hstd` are `ΔG = −n F E` and
`ΔG° = −n F E°`. `e` is the elementary charge. -/
theorem nernst_eq {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ)
    (E E0 R T n F Q dG dG0 NA kB e : ℝ)
    (hn : n ≠ 0) (hF : F ≠ 0) (he : e ≠ 0) (hNA : NA ≠ 0)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogQ : Real.log Q = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ i)
    (hdG0 : dG0 = ∑ i ∈ s, ν i * μ0 i)
    (hwork : dG = -n * F * E)
    (hstd : dG0 = -n * F * E0)
    (hFar : F = NA * e)
    (hgas : R = NA * kB) :
    E = E0 - (R * T / (n * F)) * Real.log Q ∧
      dG = dG0 + R * T * Real.log Q ∧
      E = E0 - (kB * T / (n * e)) * Real.log Q := by
  have hadd := reaction_gibbs s ν μ μ0 a R T Q dG dG0 hμ hlogQ hdG hdG0
  have hnF : n * F ≠ 0 := mul_ne_zero hn hF
  have hE : E = E0 - (R * T / (n * F)) * Real.log Q := by
    have hclear : n * F * E = n * F * E0 - R * T * Real.log Q := by
      have := hadd
      rw [hwork, hstd] at this
      linarith
    field_simp [hnF] at hclear ⊢
    linarith
  refine ⟨hE, hadd, ?_⟩
  have hcoeff : R * T / (n * F) = kB * T / (n * e) := by
    rw [hgas, hFar]
    field_simp [hNA, he, hn, hF]
  rw [hE, hcoeff]

/-- The standard potential is the Gibbs isotherm `ΔG° = −R T ln K`.

`E° = (R T / (n F)) ln K`. The hypotheses are those of
`PhysJS.GibbsIsotherm.gibbs_eq`, plus `ΔG° = −n F E°`. -/
theorem standard_from_gibbs {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ)
    (R T K dG n F E0 : ℝ)
    (hT : T ≠ 0) (hR : R ≠ 0) (hK : 0 < K) (hn : n ≠ 0) (hF : F ≠ 0)
    (hact : ∀ i ∈ s, 0 < a i)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogK : Real.log K = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ0 i)
    (hequil : ∑ i ∈ s, ν i * μ i = 0)
    (hstd : dG = -n * F * E0) :
    E0 = (R * T / (n * F)) * Real.log K := by
  have hG := PhysJS.GibbsIsotherm.gibbs_eq s ν μ μ0 a R T K dG hT hR hK hact hμ hlogK hdG hequil
  have hnF : n * F ≠ 0 := mul_ne_zero hn hF
  rw [hG.1] at hstd
  have hclear : n * F * E0 = R * T * Real.log K := by linarith
  field_simp [hnF] at hclear ⊢
  linarith

/-- Equilibrium `Q = K` is a cell potential of zero. -/
theorem equilibrium_voltage (E E0 R T n F K : ℝ)
    (hn : n ≠ 0) (hF : F ≠ 0)
    (hE : E = E0 - (R * T / (n * F)) * Real.log K)
    (hE0 : E0 = (R * T / (n * F)) * Real.log K) :
    E = 0 := by
  rw [hE, hE0]
  ring

end PhysJS.NernstGibbs
