/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.Order.Field.Basic
import lean.ThermalDeBroglie
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecificLimits.Basic
import Mathlib.Order.Filter.AtTopBot.Field
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import Mathlib.Topology.Order.LeftRightNhds

/-!
`be-168`. Bridge. The Saha ionization constant from chemical equilibrium.

The catalog equation, with unit statistical weights, is

```
K = (2 π m_e k_B T / h²)^{3/2} exp(−I / (k_B T))
```

`saha_eq` derives it from the ionization equilibrium `A ⇌ A⁺ + e⁻` of
classical ideal gases. Each species has the chemical potential
`μ_i = E_i + k_B T ln(n_i λ_i³ / g_i)`, with ground energy `E_i`, number
density `n_i`, thermal wavelength `λ_i` and statistical weight `g_i`. The
atom and the ion share one heavy wavelength `λ`, and the ionization energy
is `I = E₊ + E_e − E_A`. Equilibrium `μ_A = μ₊ + μ_e` gives

```
n₊ n_e / n_A = (g₊ g_e / g_A) λ_e^{−3} exp(−I / (k_B T))
```

The thermal factor is `PhysJS.ThermalDeBroglie.wavelength_eq`:
`λ_e^{−3} = (2 π m_e k_B T / h²)^{3/2}`. The catalog formula is the case
`g₊ g_e = g_A`. `chemical_potential_eq` derives
`μ = E + k_B T ln(n λ³ / g)` from `Z₁ = g V λ⁻³ exp(−E / (k_B T))` and
`μ = −k_B T ln(Z₁ / N)`. The electron weight `g_e = 2` and the internal
partition functions are the weights, and `spin_not_included` records that
a factor `2` changes `K`.
-/

namespace PhysJS.Saha

open Real Filter
open scoped Topology
open Set

lemma thermal_concentration (ℏ hpl m kB T : ℝ)
    (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T) (hℏ : 0 < ℏ) (hh : hpl = 2 * π * ℏ) :
    (PhysJS.ThermalDeBroglie.wavelength ℏ m kB T)⁻¹ ^ 3 =
      (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) := by
  have hwave :=
    PhysJS.ThermalDeBroglie.wavelength_eq ℏ hpl m kB T hm hkB hT hℏ hh
  rw [hwave]
  unfold PhysJS.ThermalDeBroglie.wavelengthH
  set s : ℝ := 2 * π * m * kB * T
  have hs : 0 < s := by
    unfold s
    positivity
  have hh0 : 0 < hpl := by
    rw [hh]
    positivity
  rw [inv_div, div_pow, sqrt_eq_rpow]
  rw [← rpow_natCast (s ^ ((1 : ℝ) / 2)) 3, ← rpow_mul hs.le]
  have hden : (hpl ^ 2) ^ ((3 : ℝ) / 2) = hpl ^ (3 : ℝ) := by
    rw [← rpow_natCast hpl 2, ← rpow_mul hh0.le]
    norm_num
  rw [div_rpow hs.le (sq_nonneg hpl), hden, ← rpow_natCast hpl 3]
  norm_num

/-- Saha constant from the equilibrium `μ_A = μ₊ + μ_e` of ideal gases.

`hequil` writes each `μ_i = E_i + k_B T ln(n_i λ_i³ / g_i)`, with the heavy
wavelength `lam` for the atom and the ion and the electron wavelength
`PhysJS.ThermalDeBroglie.wavelength ℏ m k_B T`. `hI` is `I = E₊ + E_e − E_A`.
Not a second proof of `be-12`. -/
theorem saha_eq (K nA nI ne gA gI ge EA EI Ee I kB T m ℏ hpl lam : ℝ)
    (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T) (hℏ : 0 < ℏ) (hh : hpl = 2 * π * ℏ)
    (hnA : 0 < nA) (hnI : 0 < nI) (hne : 0 < ne)
    (hgA : 0 < gA) (hgI : 0 < gI) (hge : 0 < ge) (hlam : 0 < lam)
    (hequil : EA + kB * T * log (nA * lam ^ 3 / gA) =
      (EI + kB * T * log (nI * lam ^ 3 / gI)) +
        (Ee + kB * T * log (ne * PhysJS.ThermalDeBroglie.wavelength ℏ m kB T ^ 3 / ge)))
    (hI : I = EI + Ee - EA)
    (hK : K = nI * ne / nA) :
    K = gI * ge / gA * (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) * exp (-I / (kB * T)) ∧
      (gI * ge = gA →
        K = (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) * exp (-I / (kB * T))) := by
  set le := PhysJS.ThermalDeBroglie.wavelength ℏ m kB T with hle
  have hlepos : 0 < le := by
    have hc := thermal_concentration ℏ hpl m kB T hm hkB hT hℏ hh
    rw [← hle] at hc
    have hpow : 0 < le⁻¹ ^ 3 := by
      rw [hc]
      have hh0 : 0 < hpl := by
        rw [hh]
        positivity
      positivity
    have : 0 < le⁻¹ := by
      by_contra hlt
      have hneg : le⁻¹ ≤ 0 := not_lt.mp hlt
      have : le⁻¹ ^ 3 ≤ 0 := by
        have h3 : le⁻¹ ^ 3 = le⁻¹ * le⁻¹ ^ 2 := by ring
        rw [h3]
        exact mul_nonpos_of_nonpos_of_nonneg hneg (sq_nonneg _)
      linarith
    exact inv_pos.mp this
  have hkT : 0 < kB * T := mul_pos hkB hT
  have hA : 0 < nA * lam ^ 3 / gA := by positivity
  have hIo : 0 < nI * lam ^ 3 / gI := by positivity
  have hE : 0 < ne * le ^ 3 / ge := by positivity
  have hsum : log (nI * lam ^ 3 / gI) + log (ne * le ^ 3 / ge) - log (nA * lam ^ 3 / gA) =
      -I / (kB * T) := by
    rw [hI, eq_div_iff hkT.ne']
    linear_combination (-1 : ℝ) * hequil
  have hexp := congrArg exp hsum
  rw [exp_sub, exp_add, exp_log hA, exp_log hIo, exp_log hE] at hexp
  have hmass : nI * ne / nA = gI * ge / gA * (le⁻¹) ^ 3 * exp (-I / (kB * T)) := by
    rw [← hexp]
    field_simp [hlepos.ne', hlam.ne', hgA.ne', hgI.ne', hge.ne', hnA.ne']
  have hgen : K = gI * ge / gA * (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) *
      exp (-I / (kB * T)) := by
    rw [hK, hmass, hle, thermal_concentration ℏ hpl m kB T hm hkB hT hℏ hh]
  refine ⟨hgen, fun hg => ?_⟩
  rw [hgen, hg, div_self hgA.ne', one_mul]

/-- The typed formula does not contain the electron spin weight `2`. -/
theorem spin_not_included (nQ I kB T : ℝ) (hkB : kB ≠ 0) (hT : T ≠ 0)
    (hnQ : nQ ≠ 0) :
    (2 : ℝ) * nQ * exp (-I / (kB * T)) ≠ nQ * exp (-I / (kB * T)) := by
  intro hEq
  have hexp : exp (-I / (kB * T)) ≠ 0 := exp_ne_zero _
  have h1 : (2 : ℝ) * nQ = nQ := mul_right_cancel₀ hexp hEq
  have h2 : (2 : ℝ) * nQ = 1 * nQ := by simpa [one_mul] using h1
  have h3 : (2 : ℝ) = 1 := mul_right_cancel₀ hnQ h2
  norm_num at h3

/-- Single-particle partition function `Z₁ = g V λ⁻³ exp(−E / (k_B T))`. -/
noncomputable def singleParticlePartition (g V lam E kB T : ℝ) : ℝ :=
  g * V / lam ^ 3 * exp (-E / (kB * T))

/-- Chemical potential from `Z₁` and `μ = −k_B T ln(Z₁ / N)`, with `n = N / V`. -/
theorem chemical_potential_eq (E n N V g lam kB T μ : ℝ)
    (hn : 0 < n) (hN : 0 < N) (hV : 0 < V) (hg : 0 < g) (hlam : 0 < lam)
    (hkB : 0 < kB) (hT : 0 < T)
    (hnV : n = N / V)
    (hμ : μ = -(kB * T) * log (singleParticlePartition g V lam E kB T / N)) :
    μ = E + kB * T * log (n * lam ^ 3 / g) := by
  have hkT : kB * T ≠ 0 := (mul_pos hkB hT).ne'
  have hratio : singleParticlePartition g V lam E kB T / N =
      (g / (n * lam ^ 3)) * exp (-E / (kB * T)) := by
    unfold singleParticlePartition
    rw [hnV]
    field_simp [hlam.ne', hg.ne', hN.ne', hV.ne']
  have hpre : 0 < g / (n * lam ^ 3) := by positivity
  have hnl : 0 < n * lam ^ 3 / g := by positivity
  rw [hμ, hratio, log_mul hpre.ne' (exp_pos _).ne', log_exp]
  have hlog : log (g / (n * lam ^ 3)) = -log (n * lam ^ 3 / g) := by
    have : g / (n * lam ^ 3) = (n * lam ^ 3 / g)⁻¹ := by field_simp [hg.ne']
    rw [this, log_inv]
  rw [hlog]
  field_simp [hkT]
  ring

theorem ionization_balance (K nI nA ne : ℝ) (hK : K = nI * ne / nA) (hne : ne ≠ 0) :
    nI / nA = K / ne := by
  rw [hK]
  field_simp [hne]

theorem spin_factor_doubles (K Kspin gI ge gA m kB T I hpl : ℝ)
    (hgA : gA ≠ 0) (hg : gI * ge = 2 * gA)
    (hK : K = gI * ge / gA * (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) * exp (-I / (kB * T)))
    (hKspin : Kspin = (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) * exp (-I / (kB * T))) :
    K = 2 * Kspin := by
  rw [hK, hKspin, hg]
  field_simp [hgA]

theorem heavy_wavelength_cancels (lam : ℝ) (hlam : 0 < lam) : (lam / lam) ^ 3 = 1 := by
  field_simp [hlam.ne']

/-- An ion wavelength twice the atom wavelength contributes a factor `1/8`. -/
theorem unequal_heavy_wavelength (lamA lamI : ℝ) (hA : 0 < lamA)
    (hI : lamI = 2 * lamA) :
    (lamA / lamI) ^ 3 = (1 : ℝ) / 8 := by
  rw [hI]
  have h2 : (2 : ℝ) ≠ 0 := by norm_num
  field_simp [hA.ne', h2]

theorem zero_ionization_energy (K gI ge gA thermal : ℝ) (hK : K = gI * ge / gA * thermal * exp (0)) :
    K = gI * ge / gA * thermal := by
  rw [hK, exp_zero, mul_one]

/-- `I > 0` and `T → 0⁺` send the Boltzmann factor, and therefore `K`, to `0`. -/
theorem saha_vanishes_at_zero (I kB pref : ℝ) (hI : 0 < I) (hkB : 0 < kB) :
    Tendsto (fun T : ℝ => pref * exp (-I / (kB * T))) (nhdsWithin 0 (Ioi 0)) (nhds 0) := by
  have hinv : Tendsto (fun T : ℝ => T⁻¹) (nhdsWithin 0 (Ioi 0)) atTop :=
    tendsto_inv_nhdsGT_zero
  have hc : 0 < I / kB := div_pos hI hkB
  have hmul : Tendsto (fun T : ℝ => (I / kB) * T⁻¹) (nhdsWithin 0 (Ioi 0)) atTop :=
    (tendsto_const_mul_atTop_of_pos hc).mpr hinv
  have hneg : Tendsto (fun T : ℝ => -((I / kB) * T⁻¹)) (nhdsWithin 0 (Ioi 0)) atBot :=
    tendsto_neg_atTop_atBot.comp hmul
  have hexp : Tendsto (fun T : ℝ => exp (-I / (kB * T))) (nhdsWithin 0 (Ioi 0)) (nhds 0) := by
    have hfun : (fun T : ℝ => exp (-I / (kB * T))) =
        exp ∘ fun T : ℝ => -((I / kB) * T⁻¹) := by
      funext T
      congr 1
      field_simp
    rw [hfun]
    exact Real.tendsto_exp_atBot.comp hneg
  simpa using hexp.const_mul pref

/-- `(c T)^{3/2} / T^{3/2} = c^{3/2}` for `T > 0`. -/
theorem saha_thermal_scale (m kB hpl T : ℝ)
    (hm : 0 < m) (hkB : 0 < kB) (hh : 0 < hpl) (hT : 0 < T) :
    (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) / T ^ ((3 : ℝ) / 2) =
      (2 * π * m * kB / hpl ^ 2) ^ ((3 : ℝ) / 2) := by
  have ha : 0 < 2 * π * m * kB / hpl ^ 2 := by positivity
  have hrewrite : 2 * π * m * kB * T / hpl ^ 2 = (2 * π * m * kB / hpl ^ 2) * T := by
    field_simp
  rw [hrewrite, Real.mul_rpow ha.le hT.le]
  field_simp [hT.ne']

/-- As `T → ∞`, `exp(−I / (k_B T)) → 1`. -/
theorem saha_high_T_exp (I kB : ℝ) (hkB : kB ≠ 0) :
    Tendsto (fun T : ℝ => exp (-I / (kB * T))) atTop (nhds 1) := by
  have hinv : Tendsto (fun T : ℝ => T⁻¹) atTop (nhds 0) := tendsto_inv_atTop_zero
  have harg : Tendsto (fun T : ℝ => -I / (kB * T)) atTop (nhds 0) := by
    have : (fun T : ℝ => -I / (kB * T)) = fun T => (-I / kB) * T⁻¹ := by
      funext T
      field_simp [hkB]
    rw [this]
    simpa using hinv.const_mul (-I / kB)
  have hcomp : (fun T : ℝ => exp (-I / (kB * T))) = exp ∘ fun T => -I / (kB * T) := rfl
  rw [hcomp]
  exact (continuous_exp.tendsto 0).comp harg

/-- As `T → ∞`, `K / T^{3/2}` tends to `(g₊ g_e / g_A) (2 π m k_B / h²)^{3/2}`. -/
theorem saha_high_T_prefactor (gI ge gA m kB hpl I : ℝ)
    (_hgA : 0 < gA) (hm : 0 < m) (hkB : 0 < kB) (hh : 0 < hpl) :
    Tendsto (fun T : ℝ =>
        gI * ge / gA * (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) *
          exp (-I / (kB * T)) / T ^ ((3 : ℝ) / 2))
      atTop (nhds (gI * ge / gA * (2 * π * m * kB / hpl ^ 2) ^ ((3 : ℝ) / 2))) := by
  have hexp := saha_high_T_exp I kB hkB.ne'
  have hscale : ∀ᶠ T : ℝ in atTop,
      gI * ge / gA * (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) *
          exp (-I / (kB * T)) / T ^ ((3 : ℝ) / 2) =
        (gI * ge / gA * (2 * π * m * kB / hpl ^ 2) ^ ((3 : ℝ) / 2)) *
          exp (-I / (kB * T)) := by
    filter_upwards [eventually_gt_atTop 0] with T hT
    have hsc := saha_thermal_scale m kB hpl T hm hkB hh hT
    have hT0 : T ≠ 0 := hT.ne'
    calc
      gI * ge / gA * (2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) *
          exp (-I / (kB * T)) / T ^ ((3 : ℝ) / 2) =
        gI * ge / gA *
          ((2 * π * m * kB * T / hpl ^ 2) ^ ((3 : ℝ) / 2) / T ^ ((3 : ℝ) / 2)) *
            exp (-I / (kB * T)) := by
        field_simp [hT0]
      _ = gI * ge / gA * (2 * π * m * kB / hpl ^ 2) ^ ((3 : ℝ) / 2) *
            exp (-I / (kB * T)) := by rw [hsc]
  exact (tendsto_const_nhds.mul hexp).congr' (hscale.mono fun _ h => h.symm)

end PhysJS.Saha
