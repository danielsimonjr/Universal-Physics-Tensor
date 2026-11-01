/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Basic
import Mathlib.Analysis.Calculus.LHopital
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring
import lean.JohnsonNyquist
import Mathlib.Topology.Algebra.InfiniteSum.Ring
import Mathlib.Topology.Order.LeftRightNhds

/-!
`be-164`. Bridge. The Planck spectrum.

The catalog equation is

```
u (exp(h ν / (k_B T)) − 1) c³ = 8 π h ν³
```

`bose_factor` proves the geometric series for the mean occupation of one
oscillator, `1 / (e^x − 1) = ∑_{n≥1} e^{−n x}`. `mean_energy` derives the
mean energy of an oscillator whose levels are `n h ν`, with Boltzmann
weights `e^{−n x}`, `x = h ν / (k_B T)`:

```
⟨E⟩ = (∑ n h ν e^{−n x}) / (∑ e^{−n x}) = h ν / (e^x − 1)
```

`planck_eq` multiplies that mean energy by the mode density `8 π ν² / c³`.
The quantized levels are the premise. The mode density, two polarizations
in a volume, is a hypothesis. `rayleigh_jeans_limit` is
`u → (8 π ν² / c³) k_B T` as `x → 0⁺`. `wien_limit` is
`u / ((8 π h ν³ / c³) exp(−x)) → 1` as `x → ∞`. The integral over
frequency is `be-165`, not this row.
-/

namespace PhysJS.PlanckSpectrum

open Real
open scoped Real Topology
open Set Filter

/-- Bose factor as a geometric series, for `x > 0`. -/
theorem bose_factor (x : ℝ) (hx : 0 < x) :
    (1 : ℝ) / (exp x - 1) = ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) := by
  let r : ℝ := exp (-x)
  have hrpos : 0 ≤ r := (exp_pos _).le
  have hr : ‖r‖ < 1 := by
    rw [Real.norm_of_nonneg hrpos, exp_lt_one_iff]
    linarith
  have hgeom : ∑' n : ℕ, r ^ n = (1 - r)⁻¹ := tsum_geometric_of_norm_lt_one hr
  have hfun : (fun n : ℕ => r ^ (n + 1)) = fun n => r * r ^ n := by
    funext n
    rw [pow_succ, mul_comm]
  have hshift : ∑' n : ℕ, r ^ (n + 1) = r * (1 - r)⁻¹ := by
    rw [hfun, tsum_mul_left, hgeom]
  have hterm : ∀ n : ℕ, r ^ (n + 1) = exp (-((n + 1 : ℕ) : ℝ) * x) := by
    intro n
    rw [show r = exp (-x) by rfl, ← exp_nat_mul, Nat.cast_add, Nat.cast_one]
    ring_nf
  have hsum : ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) = r / (1 - r) := by
    have hcongr : (fun n : ℕ => exp (-((n + 1 : ℕ) : ℝ) * x)) = fun n => r ^ (n + 1) := by
      funext n
      exact (hterm n).symm
    rw [hcongr, hshift, div_eq_mul_inv]
  rw [hsum]
  have hden : 1 - r ≠ 0 := by
    have : r < 1 := by
      have hnorm := hr
      rwa [Real.norm_of_nonneg hrpos] at hnorm
    linarith
  simp only [r, exp_neg]
  field_simp [hden]

/-- Boltzmann mean energy of the levels `n ε`, for `x > 0`, is `ε / (e^x − 1)`. -/
theorem mean_energy (ε x : ℝ) (hx : 0 < x) :
    (∑' n : ℕ, (n : ℝ) * ε * exp (-(n * x))) / (∑' n : ℕ, exp (-(n * x))) =
      ε / (exp x - 1) := by
  let r : ℝ := exp (-x)
  have hrpos : 0 ≤ r := (exp_pos _).le
  have hr : ‖r‖ < 1 := by
    rw [Real.norm_of_nonneg hrpos, exp_lt_one_iff]
    linarith
  have hterm : ∀ n : ℕ, exp (-(n * x)) = r ^ n := by
    intro n
    rw [show r = exp (-x) by rfl, ← exp_nat_mul]
    ring_nf
  have hZ : ∑' n : ℕ, exp (-(n * x)) = (1 - r)⁻¹ := by
    rw [show (fun n : ℕ => exp (-(n * x))) = fun n => r ^ n from funext hterm]
    exact tsum_geometric_of_norm_lt_one hr
  have hN : ∑' n : ℕ, (n : ℝ) * ε * exp (-(n * x)) = ε * (r / (1 - r) ^ (2 : ℕ)) := by
    have hfun : (fun n : ℕ => (n : ℝ) * ε * exp (-(n * x))) = fun n : ℕ => ε * ((n : ℝ) * r ^ n) := by
      funext n
      rw [hterm n]
      ring
    rw [hfun, tsum_mul_left, tsum_coe_mul_geometric_of_norm_lt_one hr]
  have hgt : 1 < exp x := (one_lt_exp_iff).2 hx
  have hden : exp x - 1 ≠ 0 := by linarith
  have hr1 : r < 1 := by
    have hnorm := hr
    rwa [Real.norm_of_nonneg hrpos] at hnorm
  have h1r : 1 - r ≠ 0 := by linarith
  have hrx : r * exp x = 1 := by
    simp only [r]
    rw [← exp_add]
    simp
  have hq : r / (1 - r) = 1 / (exp x - 1) := by
    rw [div_eq_div_iff h1r hden]
    linear_combination hrx
  have hsimp : ε * (r / (1 - r) ^ (2 : ℕ)) * (1 - r) = ε * (r / (1 - r)) := by
    field_simp
  rw [hN, hZ, div_inv_eq_mul, hsimp, hq]
  ring

/-- Spectral energy density from the Boltzmann mean energy of quantized modes.

`hmode` is `8 π ν² / c³`. `hE` is the mean of the levels `n h ν` with
weights `exp(−n h ν / (k_B T))`. -/
theorem planck_eq (u mode E h ν c kB T : ℝ)
    (hc : c ≠ 0) (hh : h ≠ 0)
    (hx : 0 < h * ν / (kB * T))
    (hmode : mode = 8 * π * ν ^ 2 / c ^ 3)
    (hE : E = (∑' n : ℕ, (n : ℝ) * (h * ν) * exp (-(n * (h * ν / (kB * T))))) /
      (∑' n : ℕ, exp (-(n * (h * ν / (kB * T))))))
    (hu : u = mode * E) :
    E = h * ν / (exp (h * ν / (kB * T)) - 1) ∧
      u * (exp (h * ν / (kB * T)) - 1) * c ^ 3 = 8 * π * h * ν ^ 3 ∧
      (1 : ℝ) / (exp (h * ν / (kB * T)) - 1) =
        ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * (h * ν / (kB * T))) := by
  have hE' : E = h * ν / (exp (h * ν / (kB * T)) - 1) := by
    rw [hE, mean_energy _ _ hx]
  refine ⟨hE', ?_, bose_factor _ hx⟩
  have hden : exp (h * ν / (kB * T)) - 1 ≠ 0 := by
    have hgt : 1 < exp (h * ν / (kB * T)) := (one_lt_exp_iff).2 hx
    linarith
  have hden' : exp (ν * h / (kB * T)) - 1 ≠ 0 := by
    rw [mul_comm ν h]
    exact hden
  rw [hu, hmode, hE']
  field_simp [hc, hden, hden']

theorem mode_density (L ν c : ℝ) (hc : c ≠ 0) :
    L ^ 3 * 8 * π * ν ^ 2 / c ^ 3 =
      (L / (2 * π)) ^ 3 * 4 * π * (2 * π * ν / c) ^ 2 * (2 * π / c) * 2 := by
  field_simp [hc, sq, mul_assoc, mul_left_comm, mul_comm]
  ring

/-- `(e^x − 1)/x → 1` as `x → 0⁺`, so the mean energy is `k_B T` in that limit. -/
theorem rayleigh_jeans_occupation :
    Tendsto (fun x : ℝ => x / (exp x - 1)) (nhdsWithin 0 (Ioo 0 1)) (nhds 1) := by
  have hsub : nhdsWithin 0 (Ioo 0 1) ≤ nhdsWithin 0 {x : ℝ | x ≠ 0} := by
    refine nhdsWithin_mono 0 ?_
    intro x hx
    exact hx.1.ne'
  exact PhysJS.JohnsonNyquist.tendsto_div_exp_sub_one.mono_left hsub

/-- Rayleigh–Jeans: `u → (8 π ν² / c³) k_B T` as `x = h ν / (k_B T) → 0⁺`. -/
theorem rayleigh_jeans_limit (mode kB T : ℝ) :
    Tendsto (fun x : ℝ => mode * (kB * T) * (x / (exp x - 1)))
      (nhdsWithin 0 (Ioo 0 1)) (nhds (mode * kB * T)) := by
  simpa [mul_one] using rayleigh_jeans_occupation.const_mul (mode * kB * T)

/-- `e^x / (e^x − 1) → 1` as `x → ∞`. -/
theorem wien_occupation_limit :
    Tendsto (fun x : ℝ => exp x / (exp x - 1)) atTop (nhds 1) := by
  have htail : Tendsto (fun x : ℝ => (exp x - 1)⁻¹) atTop (nhds 0) := by
    have htop : Tendsto (fun x => exp x - 1) atTop atTop :=
      tendsto_atTop_add_const_right atTop (-1) tendsto_exp_atTop
    exact tendsto_inv_atTop_zero.comp htop
  have ht1 : Tendsto (fun x => 1 + (exp x - 1)⁻¹) atTop (nhds 1) := by
    simpa [add_comm] using htail.add_const 1
  refine ht1.congr' ?_
  filter_upwards [eventually_gt_atTop 0] with x hx
  have hden : exp x - 1 ≠ 0 := by linarith [one_lt_exp_iff.2 hx]
  field_simp [hden]
  ring

/-- Wien: `u / ((8 π h ν³ / c³) exp(−x)) → 1` as `x → ∞`. -/
theorem wien_limit :
    Tendsto (fun x : ℝ => (1 / (exp x - 1)) / exp (-x)) atTop (nhds 1) := by
  refine wien_occupation_limit.congr' ?_
  filter_upwards [eventually_gt_atTop 0] with x hx
  have hden : exp x - 1 ≠ 0 := by linarith [one_lt_exp_iff.2 hx]
  field_simp [hden, exp_ne_zero]
  ring

theorem zero_point_fails (h ν kB T : ℝ) (hh : h ≠ 0) (hkB : 0 < kB) (hT : 0 < T)
    (hx : 0 < h * ν / (kB * T)) :
    h * ν / (exp (h * ν / (kB * T)) - 1) + h * ν / 2 ≠
      h * ν / (exp (h * ν / (kB * T)) - 1) := by
  intro hEq
  have hpos : 0 < h * ν := by
    have hkT : 0 < kB * T := mul_pos hkB hT
    have hnum : 0 < h * ν := by
      by_contra hnot
      push_neg at hnot
      have : h * ν / (kB * T) ≤ 0 := div_nonpos_of_nonpos_of_nonneg hnot hkT.le
      linarith [hx]
    exact hnum
  linarith

theorem one_polarization_fails (u h ν c kB T : ℝ) (hh : h ≠ 0) (hc : c ≠ 0) (hkB : 0 < kB) (hT : 0 < T)
    (hx : 0 < h * ν / (kB * T))
    (hmode : u = (4 * π * ν ^ 2 / c ^ 3) * (h * ν / (exp (h * ν / (kB * T)) - 1))) :
    u * (exp (h * ν / (kB * T)) - 1) * c ^ 3 ≠ 8 * π * h * ν ^ 3 := by
  intro hEq
  have hden : exp (h * ν / (kB * T)) - 1 ≠ 0 := by
    have hgt : 1 < exp (h * ν / (kB * T)) := (one_lt_exp_iff).2 hx
    linarith
  have hνnz : ν ≠ 0 := by
    intro hν0
    rw [hν0, mul_zero, zero_div] at hx
    exact not_lt.mpr le_rfl hx
  have hEq' : (4 : ℝ) * π * h * ν ^ 3 = (8 : ℝ) * π * h * ν ^ 3 := by
    calc
      (4 : ℝ) * π * h * ν ^ 3 =
          u * (exp (h * ν / (kB * T)) - 1) * c ^ 3 := by
        rw [hmode]
        field_simp [hc, hden]
      _ = (8 : ℝ) * π * h * ν ^ 3 := hEq
  have : (4 : ℝ) = 8 := by
    apply mul_left_cancel₀ (mul_ne_zero (mul_ne_zero Real.pi_ne_zero hh) (pow_ne_zero 3 hνnz))
    linarith [hEq']
  norm_num at this

end PhysJS.PlanckSpectrum
