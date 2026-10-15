/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.ThermalDeBroglie
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

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
`g₊ g_e = g_A`. The electron weight `g_e = 2` and the internal partition
functions are the weights, and `spin_not_included` records that a factor
`2` changes `K`.
-/

namespace PhysJS.Saha

open Real

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

end PhysJS.Saha
