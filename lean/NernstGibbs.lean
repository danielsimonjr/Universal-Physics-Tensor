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
`ln Q = Σ ν_i ln a_i`. One work law, `ΔG = −n F E` (work done by the cell),
and the definition `E° = −ΔG° / (n F)` of the `Q = 1` case of that same
law, turn that into the potential. `standard_potential_of_work` and
`standard_potential` fix the electrical convention at `Q = 1`.
`nernst_from_reaction_gibbs` derives Nernst from `reaction_gibbs`;
`molar_faraday`, `decade_identity`, `n_scaling`, `catalog_decade_half`,
and `equilibrium_voltage_chain` complete the bridge. This is not the
ideal diode of `be-82`.
-/

namespace PhysJS.NernstGibbs

/-- `E°` is the `Q = 1` case of the one work law: `E° = −ΔG° / (n F)`. -/
theorem standard_potential_of_work (E0 dG0 n F : ℝ) (hnF : n * F ≠ 0)
    (hwork0 : dG0 = -n * F * E0) :
    E0 = -dG0 / (n * F) := by
  apply eq_div_of_mul_eq hnF
  linarith [hwork0]

theorem standard_potential (E E0 R T n F Q dG dG0 : ℝ)
    (hn : n ≠ 0) (hF : F ≠ 0)
    (hlogQ : Real.log Q = 0)
    (hadd : dG = dG0 + R * T * Real.log Q)
    (hwork : dG = -n * F * E)
    (hE0 : E0 = -dG0 / (n * F)) :
    E = E0 := by
  have hnF : n * F ≠ 0 := mul_ne_zero hn hF
  have hG : dG = dG0 := by rw [hadd, hlogQ, mul_zero, add_zero]
  have : E = -dG / (n * F) := by
    apply eq_div_of_mul_eq hnF
    linarith [hwork]
  rw [this, hG, hE0]

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

theorem nernst_from_reaction_gibbs {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ)
    (E E0 R T n F Q dG dG0 : ℝ)
    (hn : n ≠ 0) (hF : F ≠ 0)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogQ : Real.log Q = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ i)
    (hdG0 : dG0 = ∑ i ∈ s, ν i * μ0 i)
    (hwork : dG = -n * F * E)
    (hE0 : E0 = -dG0 / (n * F)) :
    E = E0 - (R * T / (n * F)) * Real.log Q := by
  have hadd := reaction_gibbs s ν μ μ0 a R T Q dG dG0 hμ hlogQ hdG hdG0
  have hnF : n * F ≠ 0 := mul_ne_zero hn hF
  have hE : E = -dG / (n * F) := by
    apply eq_div_of_mul_eq hnF
    linarith [hwork]
  rw [hE, hadd, hE0]
  field_simp [hnF]
  ring

/-- Nernst equation from ideal activities, and the same potential with `R / F = k_B / e`.

The species of the cell reaction have `μ_i = μ_i° + R T ln a_i`, the
reaction quotient is `ln Q = Σ ν_i ln a_i`, and `ΔG = Σ ν_i μ_i`,
`ΔG° = Σ ν_i μ_i°`. `hwork` is the one work law `ΔG = −n F E`.
`hE0` defines `E° = −ΔG° / (n F)`, the `Q = 1` case of that law.
`e` is the elementary charge. -/
theorem nernst_eq {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ)
    (E E0 R T n F Q dG dG0 NA kB e : ℝ)
    (hn : n ≠ 0) (hF : F ≠ 0) (he : e ≠ 0) (hNA : NA ≠ 0)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogQ : Real.log Q = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ i)
    (hdG0 : dG0 = ∑ i ∈ s, ν i * μ0 i)
    (hwork : dG = -n * F * E)
    (hE0 : E0 = -dG0 / (n * F))
    (hFar : F = NA * e)
    (hgas : R = NA * kB) :
    E = E0 - (R * T / (n * F)) * Real.log Q ∧
      dG = dG0 + R * T * Real.log Q ∧
      E = E0 - (kB * T / (n * e)) * Real.log Q := by
  have hadd := reaction_gibbs s ν μ μ0 a R T Q dG dG0 hμ hlogQ hdG hdG0
  have hE := nernst_from_reaction_gibbs s ν μ μ0 a E E0 R T n F Q dG dG0 hn hF hμ hlogQ hdG hdG0
    hwork hE0
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

theorem molar_faraday (R F NA kB e : ℝ) (hNA : NA ≠ 0) (he : e ≠ 0) (hFar : F = NA * e)
    (hgas : R = NA * kB) :
    R / F = kB / e := by
  rw [hgas, hFar]; field_simp [hNA, he]

theorem decade_identity (E0 R T n F Q : ℝ) (_hn : n ≠ 0) (_hF : F ≠ 0) (hQ : 0 < Q) :
    (E0 - (R * T / (n * F)) * Real.log Q) -
        (E0 - (R * T / (n * F)) * Real.log (10 * Q)) =
      (R * T / (n * F)) * Real.log 10 := by
  have h10 : Real.log (10 * Q) = Real.log 10 + Real.log Q :=
    Real.log_mul (by norm_num) (ne_of_gt hQ)
  have hcomm : Real.log (Q * 10) = Real.log 10 + Real.log Q := by rw [mul_comm, h10]
  ring_nf; rw [hcomm]; ring

theorem equilibrium_voltage_chain {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ)
    (E E0 R T n F K Q dG dG0 : ℝ)
    (hn : n ≠ 0) (hF : F ≠ 0) (hT : T ≠ 0) (hR : R ≠ 0) (hK : 0 < K)
    (hact : ∀ i ∈ s, 0 < a i)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogQ : Real.log Q = ∑ i ∈ s, ν i * Real.log (a i))
    (hlogK : Real.log K = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ i)
    (hdG0 : dG0 = ∑ i ∈ s, ν i * μ0 i)
    (hequil : ∑ i ∈ s, ν i * μ i = 0)
    (hQ : Q = K)
    (hwork : dG = -n * F * E)
    (hE0 : E0 = -dG0 / (n * F)) :
    E = 0 := by
  have hnF : n * F ≠ 0 := mul_ne_zero hn hF
  have hstd : dG0 = -n * F * E0 := by
    rw [hE0]
    field_simp [hnF]
  have hE := nernst_from_reaction_gibbs s ν μ μ0 a E E0 R T n F Q dG dG0 hn hF hμ hlogQ hdG hdG0
    hwork hE0
  have hE0K := standard_from_gibbs s ν μ μ0 a R T K dG0 n F E0 hT hR hK hn hF hact hμ hlogK hdG0
    hequil hstd
  rw [hE, hE0K, hQ, sub_self]

/-- Equilibrium `Q = K` is a cell potential of zero. -/
theorem equilibrium_voltage (E E0 R T n F K : ℝ)
    (_hn : n ≠ 0) (_hF : F ≠ 0)
    (hE : E = E0 - (R * T / (n * F)) * Real.log K)
    (hE0 : E0 = (R * T / (n * F)) * Real.log K) :
    E = 0 := by
  rw [hE, hE0]
  ring

/-- Large `n` scales the Nernst correction as `1/n` times the `n = 1` term. -/
theorem n_scaling (R T n F Q : ℝ) (hn : n ≠ 0) (hF : F ≠ 0) :
    (R * T / (n * F)) * Real.log Q =
      (1 / n) * ((R * T / ((1 : ℝ) * F)) * Real.log Q) := by
  field_simp [hn, hF]

/-- Catalog point `n = 2`, `Q = 10`: the correction is half of `(R T / F) ln 10`. -/
theorem catalog_decade_half (E E0 R T F : ℝ) (hF : F ≠ 0)
    (hE : E = E0 - (R * T / (2 * F)) * Real.log 10) :
    E = E0 - (1 / 2) * (R * T / F) * Real.log 10 := by
  have h2 : (2 : ℝ) ≠ 0 := by norm_num
  rw [hE]
  field_simp [hF, h2]

end PhysJS.NernstGibbs
