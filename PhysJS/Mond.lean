/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Sqrt
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Order.Filter.AtTopBot.Ring
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-38`. Milgrom's interpolation `ν(z)`, its Newtonian and deep-MOND limits,
and the inversion of `μ(x) = x / √(1 + x²)`.

```
ν(z) = √( (1 + √(1 + 4/z²)) / 2 )
```

`ν(z) → 1` as `z → ∞`. `ν(z) √z → 1` as `z → 0⁺`, which is `ν ~ 1/√z` and not
`√(2/z)`. With `z = F_N / (m a₀)`, the force is `F_N ν(z)`, and
`F_N ν(z) / √(m F_N a₀) → 1`. For `z > 0`, `y = z ν(z)` satisfies
`y² / √(1 + y²) = z`. The catalog sentence that drops `m` is not this
statement. The SPARC confrontation is not this row.
-/

namespace PhysJS.Mond

open Real Filter Topology

/-- Milgrom's `ν(z) = √((1 + √(1 + 4/z²)) / 2)`. -/
noncomputable def nu (z : ℝ) : ℝ := sqrt ((1 + sqrt (1 + 4 / z ^ 2)) / 2)

lemma sqrt_one_add_four_div_sq {z : ℝ} (hz : 0 < z) :
    sqrt (1 + 4 / z ^ 2) = sqrt (z ^ 2 + 4) / z := by
  have hz0 : z ≠ 0 := hz.ne'
  have hnonneg : 0 ≤ z ^ 2 + 4 := by positivity
  calc
    sqrt (1 + 4 / z ^ 2) = sqrt ((z ^ 2 + 4) / z ^ 2) := by
      congr 1
      field_simp [hz0]
    _ = sqrt (z ^ 2 + 4) / sqrt (z ^ 2) := by
      rw [sqrt_div hnonneg]
    _ = sqrt (z ^ 2 + 4) / z := by
      rw [sqrt_sq hz.le]

lemma nu_sq {z : ℝ} (hz : 0 < z) :
    nu z ^ 2 = (z + sqrt (z ^ 2 + 4)) / (2 * z) := by
  have hz0 : z ≠ 0 := hz.ne'
  unfold nu
  rw [sq_sqrt (by positivity), sqrt_one_add_four_div_sq hz]
  field_simp [hz0]

/-- For `z > 0`, `ν(z) √z = √((z + √(z² + 4)) / 2)`, which is `1` at `z = 0`. -/
lemma nu_mul_sqrt {z : ℝ} (hz : 0 < z) :
    nu z * sqrt z = sqrt ((z + sqrt (z ^ 2 + 4)) / 2) := by
  have hν : 0 ≤ nu z ^ 2 := sq_nonneg _
  calc
    nu z * sqrt z = sqrt (nu z ^ 2) * sqrt z := by
      rw [sqrt_sq (by unfold nu; exact sqrt_nonneg _)]
    _ = sqrt (nu z ^ 2 * z) := by
      rw [← sqrt_mul hν z]
    _ = sqrt ((z + sqrt (z ^ 2 + 4)) / 2) := by
      congr 1
      rw [nu_sq hz]
      field_simp [hz.ne']

/-- Newtonian limit: `ν(z) → 1` as `z → ∞`. -/
theorem tendsto_nu_atTop : Tendsto nu atTop (𝓝 1) := by
  have hid : Tendsto (fun z : ℝ => z) atTop atTop := tendsto_id
  have hsq : Tendsto (fun z : ℝ => z ^ 2) atTop atTop := by
    simpa [pow_two] using hid.atTop_mul_atTop₀ hid
  have hinv : Tendsto (fun z : ℝ => (z ^ 2)⁻¹) atTop (𝓝 0) :=
    (tendsto_inv_atTop_zero (𝕜 := ℝ)).comp hsq
  have h4 : Tendsto (fun z : ℝ => 4 / z ^ 2) atTop (𝓝 0) := by
    have h := Filter.Tendsto.const_mul (4 : ℝ) hinv
    have h0 : Tendsto (fun z : ℝ => 4 * (z ^ 2)⁻¹) atTop (𝓝 0) := by
      simpa [mul_zero] using h
    refine h0.congr fun z => ?_
    simp [div_eq_mul_inv]
  have hinner : Tendsto (fun z : ℝ => 1 + 4 / z ^ 2) atTop (𝓝 1) := by
    have hadd : Tendsto (fun z : ℝ => 1 + 4 / z ^ 2) atTop (𝓝 (1 + 0)) :=
      tendsto_const_nhds.add h4
    simpa [add_zero] using hadd
  have hsqrt : Tendsto (fun z : ℝ => sqrt (1 + 4 / z ^ 2)) atTop (𝓝 1) := by
    simpa [Function.comp_def, sqrt_one] using (continuous_sqrt.tendsto (1 : ℝ)).comp hinner
  have hsum : Tendsto (fun z : ℝ => 1 + sqrt (1 + 4 / z ^ 2)) atTop (𝓝 2) := by
    have hadd : Tendsto (fun z : ℝ => 1 + sqrt (1 + 4 / z ^ 2)) atTop (𝓝 (1 + 1)) :=
      tendsto_const_nhds.add hsqrt
    simpa [one_add_one_eq_two] using hadd
  have hdiv : Tendsto (fun z : ℝ => (1 + sqrt (1 + 4 / z ^ 2)) / 2) atTop (𝓝 1) := by
    have h := Filter.Tendsto.mul_const ((2 : ℝ)⁻¹) hsum
    have h' : Tendsto (fun z : ℝ => (1 + sqrt (1 + 4 / z ^ 2)) * (2 : ℝ)⁻¹) atTop (𝓝 1) := by
      simpa [mul_inv_cancel₀ (two_ne_zero : (2 : ℝ) ≠ 0)] using h
    refine h'.congr fun z => ?_
    simp [div_eq_mul_inv]
  have hcomp := (continuous_sqrt.tendsto (1 : ℝ)).comp hdiv
  simp only [Function.comp_def, sqrt_one] at hcomp
  refine hcomp.congr' ?_
  filter_upwards with z
  unfold nu
  rfl

/-- Deep-MOND limit: `ν(z) √z → 1` as `z → 0⁺`. -/
theorem tendsto_nu_sqrt_zero : Tendsto (fun z => nu z * sqrt z) (𝓝[>] 0) (𝓝 1) := by
  have hid : Tendsto (fun z : ℝ => z) (𝓝[>] 0) (𝓝 0) :=
    tendsto_id.mono_left nhdsWithin_le_nhds
  have hsq : Tendsto (fun z : ℝ => z ^ 2) (𝓝[>] 0) (𝓝 0) := by
    simpa [pow_two, mul_zero] using hid.mul hid
  have hs : Tendsto (fun z : ℝ => sqrt (z ^ 2 + 4)) (𝓝[>] 0) (𝓝 (sqrt 4)) := by
    have hadd : Tendsto (fun z : ℝ => z ^ 2 + 4) (𝓝[>] 0) (𝓝 (0 + 4)) := hsq.add tendsto_const_nhds
    have h := (continuous_sqrt.tendsto (4 : ℝ)).comp (by simpa [zero_add] using hadd)
    simpa [Function.comp_def] using h
  have harg : Tendsto (fun z : ℝ => (z + sqrt (z ^ 2 + 4)) / 2) (𝓝[>] 0) (𝓝 ((0 + sqrt 4) / 2)) := by
    have hadd : Tendsto (fun z : ℝ => z + sqrt (z ^ 2 + 4)) (𝓝[>] 0) (𝓝 (0 + sqrt 4)) :=
      hid.add hs
    have h := Filter.Tendsto.mul_const (2 : ℝ)⁻¹ hadd
    simpa [div_eq_mul_inv, zero_add] using h
  have hsqrt : Tendsto (fun z : ℝ => sqrt ((z + sqrt (z ^ 2 + 4)) / 2)) (𝓝[>] 0)
      (𝓝 (sqrt ((0 + sqrt 4) / 2))) := by
    have h := (continuous_sqrt.tendsto ((0 + sqrt 4) / 2)).comp harg
    simpa [Function.comp_def] using h
  have hval : sqrt (sqrt (4 : ℝ)) / sqrt 2 = 1 := by
    have htwo : sqrt (4 : ℝ) = 2 := by
      rw [show (4 : ℝ) = 2 ^ 2 by norm_num]
      exact sqrt_sq (by norm_num)
    rw [htwo, div_self (sqrt_ne_zero'.mpr (by norm_num : (0 : ℝ) < 2))]
  have hclosed : Tendsto (fun z : ℝ => sqrt (z + sqrt (z ^ 2 + 4)) / sqrt 2) (𝓝[>] 0) (𝓝 1) := by
    simpa [hval] using hsqrt
  refine hclosed.congr' ?_
  filter_upwards [self_mem_nhdsWithin] with z hz
  have hz0 : 0 < z := Set.mem_Ioi.mp hz
  rw [← sqrt_div (by positivity : 0 ≤ z + sqrt (z ^ 2 + 4)) (2 : ℝ)]
  exact (nu_mul_sqrt hz0).symm

/-- The comment `ν(z) √z → √2` is not the deep-MOND limit. -/
theorem wrong_deep_limit_sqrt_two :
    ¬ Tendsto (fun z => nu z * sqrt z) (𝓝[>] 0) (𝓝 (sqrt 2)) := by
  intro h
  have heq : (1 : ℝ) = sqrt 2 := tendsto_nhds_unique tendsto_nu_sqrt_zero h
  have hsq : (1 : ℝ) ^ 2 = (sqrt 2) ^ 2 := congrArg (· ^ 2) heq
  have : (1 : ℝ) = 2 := by
    simp [sq_sqrt (by positivity : (0 : ℝ) ≤ 2)] at hsq
  norm_num at this

/-- With `z = F_N / (m a₀)`, the force is the deep-MOND scale times `ν(z) √z`. -/
theorem force_factor (m a0 FN : ℝ) (hm : 0 < m) (ha : 0 < a0) (hF : 0 < FN) :
    FN * nu (FN / (m * a0)) =
      sqrt (m * FN * a0) * (nu (FN / (m * a0)) * sqrt (FN / (m * a0))) := by
  have hz : 0 < FN / (m * a0) := by positivity
  have hsqrtz : sqrt (FN / (m * a0)) ≠ 0 := sqrt_ne_zero'.mpr hz
  calc
    FN * nu (FN / (m * a0))
        = sqrt (m * FN * a0) * sqrt (FN / (m * a0)) * nu (FN / (m * a0)) := by
      have hFN : FN = sqrt (m * FN * a0) * sqrt (FN / (m * a0)) := by
        have hsq : (sqrt (m * FN * a0) * sqrt (FN / (m * a0))) ^ 2 = FN ^ 2 := by
          rw [mul_pow, sq_sqrt (by positivity), sq_sqrt (by positivity)]
          field_simp [hm.ne', ha.ne', hF.ne']
        have hpos : 0 ≤ sqrt (m * FN * a0) * sqrt (FN / (m * a0)) := by positivity
        exact ((sq_eq_sq₀ hpos hF.le).1 hsq).symm
      exact congrArg (· * nu (FN / (m * a0))) hFN
    _ = sqrt (m * FN * a0) * (nu (FN / (m * a0)) * sqrt (FN / (m * a0))) := by ring

/-- As `F_N → 0⁺`, `F / √(m F_N a₀) → 1`. The factor `m` stays in the scale. -/
theorem tendsto_force_ratio (m a0 : ℝ) (hm : 0 < m) (ha : 0 < a0) :
    Tendsto (fun FN => FN * nu (FN / (m * a0)) / sqrt (m * FN * a0)) (𝓝[>] 0) (𝓝 1) := by
  have hma : m * a0 ≠ 0 := mul_ne_zero hm.ne' ha.ne'
  have hz : Tendsto (fun FN : ℝ => FN / (m * a0)) (𝓝[>] 0) (𝓝[>] 0) := by
    rw [tendsto_nhdsWithin_iff]
    constructor
    · have hid : Tendsto (fun FN : ℝ => FN) (𝓝[>] 0) (𝓝 0) :=
        tendsto_id.mono_left nhdsWithin_le_nhds
      simpa [div_eq_mul_inv, mul_zero] using Filter.Tendsto.mul_const (m * a0)⁻¹ hid
    · filter_upwards [self_mem_nhdsWithin] with FN hFN
      exact div_pos (Set.mem_Ioi.mp hFN) (mul_pos hm ha)
  have hcomp := tendsto_nu_sqrt_zero.comp hz
  refine hcomp.congr' ?_
  filter_upwards [self_mem_nhdsWithin] with FN hFN
  have hF : 0 < FN := Set.mem_Ioi.mp hFN
  have hz0 : 0 < FN / (m * a0) := div_pos hF (mul_pos hm ha)
  have hden : sqrt (m * FN * a0) ≠ 0 := sqrt_ne_zero'.mpr (by positivity)
  calc
    nu (FN / (m * a0)) * sqrt (FN / (m * a0))
        = FN * nu (FN / (m * a0)) / sqrt (m * FN * a0) := by
      rw [force_factor m a0 FN hm ha hF]
      field_simp [hden]

/-- The two limits, and the force ratio they give.

`ν(z) → 1` as `z → ∞`. `ν(z) √z → 1` as `z → 0⁺`. With
`z = F_N / (m a₀)` and `m, a₀ > 0`, `F_N ν(z) / √(m F_N a₀) → 1` as
`F_N → 0⁺`. Covers that limit of `be-38`, not the SPARC confrontation. -/
theorem tendsto_nu_limits :
    Tendsto nu atTop (𝓝 1) ∧
      Tendsto (fun z : ℝ => nu z * sqrt z) (𝓝[>] 0) (𝓝 1) ∧
      ∀ m a0 : ℝ, 0 < m → 0 < a0 →
        Tendsto (fun FN => FN * nu (FN / (m * a0)) / sqrt (m * FN * a0)) (𝓝[>] 0) (𝓝 1) := by
  refine ⟨tendsto_nu_atTop, tendsto_nu_sqrt_zero, ?_⟩
  intro m a0 hm ha
  exact tendsto_force_ratio m a0 hm ha

/-- `y = z ν(z)` inverts Milgrom's `μ`: `y² / √(1 + y²) = z`. -/
theorem mu_inversion (z : ℝ) (hz : 0 < z) :
    (z * nu z) ^ 2 / sqrt (1 + (z * nu z) ^ 2) = z := by
  set s := sqrt (z ^ 2 + 4)
  have hs2 : s ^ 2 = z ^ 2 + 4 := by
    simpa [s] using sq_sqrt (by positivity : 0 ≤ z ^ 2 + 4)
  have hν2 : nu z ^ 2 = (z + s) / (2 * z) := by simpa [s] using nu_sq hz
  set y := z * nu z
  have hy2 : y ^ 2 = z * (z + s) / 2 := by
    unfold y
    rw [mul_pow, hν2]
    field_simp [hz.ne']
  have hy4 : y ^ 4 = z ^ 2 * (1 + y ^ 2) := by
    calc
      y ^ 4 = (y ^ 2) ^ 2 := by ring
      _ = (z * (z + s) / 2) ^ 2 := by rw [hy2]
      _ = (z ^ 2 + 2 * z * s + s ^ 2) * z ^ 2 / 4 := by ring
      _ = (z ^ 2 + 2 * z * s + (z ^ 2 + 4)) * z ^ 2 / 4 := by rw [hs2]
      _ = z ^ 2 * (z ^ 2 + z * s + 2) / 2 := by ring
      _ = z ^ 2 * (1 + z * (z + s) / 2) := by ring
      _ = z ^ 2 * (1 + y ^ 2) := by rw [hy2]
  have hypos : 0 ≤ y ^ 2 := sq_nonneg _
  have hsqrt_nonneg : 0 ≤ z * sqrt (1 + y ^ 2) := by positivity
  have hsqeq : (y ^ 2) ^ 2 = (z * sqrt (1 + y ^ 2)) ^ 2 := by
    calc
      (y ^ 2) ^ 2 = y ^ 4 := by ring
      _ = z ^ 2 * (1 + y ^ 2) := hy4
      _ = z ^ 2 * (sqrt (1 + y ^ 2)) ^ 2 := by
        rw [sq_sqrt (by positivity : 0 ≤ 1 + y ^ 2)]
      _ = (z * sqrt (1 + y ^ 2)) ^ 2 := by
        rw [← mul_pow]
  have hy2eq : y ^ 2 = z * sqrt (1 + y ^ 2) := (sq_eq_sq₀ hypos hsqrt_nonneg).1 hsqeq
  have hsqrt0 : sqrt (1 + y ^ 2) ≠ 0 := sqrt_ne_zero'.mpr (by positivity)
  conv_lhs =>
    arg 1
    rw [hy2eq]
  field_simp [hsqrt0]

end PhysJS.Mond
