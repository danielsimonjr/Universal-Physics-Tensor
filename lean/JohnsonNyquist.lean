/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Slope
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Positivity

/-!
`be-58`. Limit. The classical Johnson–Nyquist spectrum is the low-frequency limit of
the quantum parent.

The catalog encodes `S_V = 4 k_B T R`. The quantum spectrum is a premise, not
a new bridge id:

`S_V^q(ω) = 4 R ℏ ω / (exp(ℏ ω / (k_B T)) − 1)`.

As `ω → 0⁺`, with `k_B T > 0` and `ℏ ≠ 0`, this tends to `4 k_B T R`. The
same expression with `+ 1` in the denominator tends to `0`, so it is not that
limit when `4 k_B T R ≠ 0`. This does not derive the fluctuation–dissipation
theorem.
-/

namespace PhysJS.JohnsonNyquist

open Real Filter Topology

/-- Quantum one-sided spectrum `4 R ℏ ω / (exp(ℏ ω / (k_B T)) − 1)`. -/
noncomputable def quantum (R ℏ kB T ω : ℝ) : ℝ :=
  4 * R * ℏ * ω / (exp (ℏ * ω / (kB * T)) - 1)

/-- The same shape with `+ 1` in the denominator. -/
noncomputable def quantumPlus (R ℏ kB T ω : ℝ) : ℝ :=
  4 * R * ℏ * ω / (exp (ℏ * ω / (kB * T)) + 1)

lemma slope_exp (x : ℝ) : slope exp 0 x = (exp x - 1) / x := by
  simp [slope_def_field, exp_zero, sub_zero, div_eq_mul_inv]

/-- `(exp x − 1) / x → 1` as `x → 0`, off the origin. -/
lemma tendsto_exp_sub_one_div :
    Tendsto (fun x : ℝ => (exp x - 1) / x) (𝓝[≠] 0) (𝓝 1) := by
  have h := (hasDerivAt_exp 0).tendsto_slope
  simp only [exp_zero] at h
  refine h.congr' ?_
  filter_upwards with x
  simp [slope_def_field, sub_zero]

/-- `x / (exp x − 1) → 1` as `x → 0`, off the origin. -/
lemma tendsto_div_exp_sub_one :
    Tendsto (fun x : ℝ => x / (exp x - 1)) (𝓝[≠] 0) (𝓝 1) := by
  have hinv := tendsto_exp_sub_one_div.inv₀ one_ne_zero
  simp only [inv_one] at hinv
  refine hinv.congr' ?_
  filter_upwards [self_mem_nhdsWithin] with x hx
  have hx0 : x ≠ 0 := hx
  have hexp : exp x - 1 ≠ 0 := by
    rw [sub_ne_zero, ← exp_zero, ne_eq, exp_eq_exp]
    exact hx0
  field_simp [hx0, hexp]

/-- The classical spectrum is the `ω → 0⁺` limit of the quantum parent.

Covers the limit of `be-58`, not the fluctuation–dissipation theorem. -/
theorem tendsto_classical (R ℏ kB T : ℝ) (hkT : 0 < kB * T) (hℏ : ℏ ≠ 0) :
    Tendsto (quantum R ℏ kB T) (𝓝[>] 0) (𝓝 (4 * kB * T * R)) := by
  have hk0 : kB * T ≠ 0 := hkT.ne'
  let x : ℝ → ℝ := fun ω => ℏ * ω / (kB * T)
  have hx : Tendsto x (𝓝[>] 0) (𝓝[≠] 0) := by
    rw [tendsto_nhdsWithin_iff]
    constructor
    · have hid : Tendsto (fun ω : ℝ => ω) (𝓝[>] 0) (𝓝 0) :=
        tendsto_id.mono_left nhdsWithin_le_nhds
      have hmul := Filter.Tendsto.const_mul ℏ hid
      have hdiv := Filter.Tendsto.mul_const (kB * T)⁻¹ hmul
      simpa [x, mul_zero, zero_mul, div_eq_mul_inv, mul_assoc] using hdiv
    · filter_upwards [self_mem_nhdsWithin] with ω hω
      exact div_ne_zero (mul_ne_zero hℏ (ne_of_gt (Set.mem_Ioi.mp hω))) hk0
  have hratio : Tendsto (fun ω => x ω / (exp (x ω) - 1)) (𝓝[>] 0) (𝓝 1) :=
    tendsto_div_exp_sub_one.comp hx
  have hscale := Filter.Tendsto.const_mul (4 * kB * T * R) hratio
  have hscale' : Tendsto (fun ω => (4 * kB * T * R) * (x ω / (exp (x ω) - 1)))
      (𝓝[>] 0) (𝓝 (4 * kB * T * R)) := by
    simpa [mul_one] using hscale
  refine hscale'.congr' ?_
  filter_upwards [self_mem_nhdsWithin] with ω hω
  unfold quantum x
  have hω0 : ω ≠ 0 := ne_of_gt (Set.mem_Ioi.mp hω)
  field_simp [hk0, hω0]
  exact mul_div_mul_left R (exp (ℏ * ω / (kB * T)) - 1) hk0

/-- Replacing the `− 1` by `+ 1` sends the spectrum to `0`, not to `4 k_B T R`,
whenever that classical value is nonzero. -/
theorem wrong_dictionary_plus_one (R ℏ kB T : ℝ) (hkT : 0 < kB * T) (hR : R ≠ 0) :
    ¬ Tendsto (quantumPlus R ℏ kB T) (𝓝[>] 0) (𝓝 (4 * kB * T * R)) := by
  intro h
  have hk0 : kB * T ≠ 0 := hkT.ne'
  have hid : Tendsto (fun ω : ℝ => ω) (𝓝[>] 0) (𝓝 0) :=
    tendsto_id.mono_left nhdsWithin_le_nhds
  have harg : Tendsto (fun ω => ℏ * ω / (kB * T)) (𝓝[>] 0) (𝓝 0) := by
    have hmul := Filter.Tendsto.const_mul ℏ hid
    have hdiv := Filter.Tendsto.mul_const (kB * T)⁻¹ hmul
    simpa [mul_zero, zero_mul, div_eq_mul_inv, mul_assoc] using hdiv
  have hexp : Tendsto (fun ω => exp (ℏ * ω / (kB * T))) (𝓝[>] 0) (𝓝 1) := by
    simpa [Function.comp_def, exp_zero] using (continuous_exp.tendsto 0).comp harg
  have hden : Tendsto (fun ω => exp (ℏ * ω / (kB * T)) + 1) (𝓝[>] 0) (𝓝 2) := by
    have hadd : Tendsto (fun ω => exp (ℏ * ω / (kB * T)) + 1) (𝓝[>] 0) (𝓝 (1 + 1)) :=
      hexp.add tendsto_const_nhds
    simpa [one_add_one_eq_two] using hadd
  have hnum : Tendsto (fun ω => 4 * R * ℏ * ω) (𝓝[>] 0) (𝓝 0) := by
    simpa [mul_zero, mul_assoc] using Filter.Tendsto.const_mul (4 * R * ℏ) hid
  have hzero : Tendsto (quantumPlus R ℏ kB T) (𝓝[>] 0) (𝓝 0) := by
    have hdiv := hnum.div hden two_ne_zero
    simp only [zero_div] at hdiv
    refine hdiv.congr' ?_
    filter_upwards with ω
    rfl
  have heq : 4 * kB * T * R = 0 := tendsto_nhds_unique h hzero
  have hne : 4 * kB * T * R ≠ 0 := by
    have h4 : 4 * (kB * T) ≠ 0 := mul_ne_zero four_ne_zero hk0
    have : 4 * kB * T * R = 4 * (kB * T) * R := by ring
    rw [this]
    exact mul_ne_zero h4 hR
  exact hne heq

end PhysJS.JohnsonNyquist
