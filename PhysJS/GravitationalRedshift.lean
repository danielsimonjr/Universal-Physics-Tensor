/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.TolmanEhrenfest
import Mathlib.Analysis.Real.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-72`. Bridge. Gravitational frequency shift in a static spacetime.

The catalog equation is the ratio of proper frequencies of one coordinate
period, in the signature `(−,+,+,+)`,

```
ν1 / ν2 = √(−g_00(x2) / −g_00(x1)) = √(g_00(x2) / g_00(x1))
```

with `g_00 < 0` at both observers. `frequency_ratio` derives it from

```
ν √(−g_00) = 1 / Δt
```

the same static identification `PhysJS.TolmanEhrenfest.redshift_equilibrium`
uses as a hypothesis. It does not use hydrostatic balance and it does not
use the Gibbs relation.

`tolman_same_ratio` is the honest link to `be-68`. If the Tolman products
`T √(−g_00)` agree as well, then `T1 / T2 = ν1 / ν2`. The frequency ratio
does not produce that product. `frequency_not_tolman` is a pair of metric
values whose frequency ratio is `2` while equal temperatures are not a
Tolman equilibrium. This is not `PhysJS.TolmanEhrenfest.hydrostatic_constant`.

`weak_field_not_exact` is one pair `g_00 = −(1 + 2Φ/c²)` on which the exact
ratio is neither `(Φ2 − Φ1)/c²` nor `1 + (Φ2 − Φ1)/c²`. `units_do_not_entail`
separates a vanishing fractional shift from `Φ/c²`. Not a horizon
temperature, and not `PhysJS.HawkingUnruh.dictionary`.
-/

namespace PhysJS.GravitationalRedshift

open PhysJS.TolmanEhrenfest Real

/-- Proper frequencies of one coordinate period stand in the metric ratio.

`h1` and `h2` are the static identification `ν √(−g_00) = 1/Δt`. The
common `Δt` is the coordinate period. Both metric components are negative.

Kind `bridge` on `PhysJS.GravitationalRedshift.frequency_ratio`, once the
catalog entry exists. The covers line still begins with `derivation-step`. -/
theorem frequency_ratio (ν1 ν2 g1 g2 Δt : ℝ) (hg1 : g1 < 0) (hg2 : g2 < 0)
    (hΔ : Δt ≠ 0) (hν2 : ν2 ≠ 0)
    (h1 : ν1 * Real.sqrt (-g1) = 1 / Δt) (h2 : ν2 * Real.sqrt (-g2) = 1 / Δt) :
    ν1 / ν2 = Real.sqrt (-g2) / Real.sqrt (-g1) ∧
      ν1 / ν2 = Real.sqrt (g2 / g1) := by
  have hs1 : Real.sqrt (-g1) ≠ 0 := (Real.sqrt_pos.mpr (neg_pos.mpr hg1)).ne'
  have hs2 : Real.sqrt (-g2) ≠ 0 := (Real.sqrt_pos.mpr (neg_pos.mpr hg2)).ne'
  have hcommon : ν1 * Real.sqrt (-g1) = ν2 * Real.sqrt (-g2) := by rw [h1, h2]
  have hdiv : ν1 / ν2 = Real.sqrt (-g2) / Real.sqrt (-g1) := by
    field_simp [hν2, hs1, hs2] at hcommon ⊢
    linarith
  refine ⟨hdiv, ?_⟩
  rw [hdiv]
  have hg2' : (0 : ℝ) ≤ -g2 := (neg_pos.mpr hg2).le
  have _hΔ : Δt ≠ 0 := hΔ
  have hquot : g2 / g1 = (-g2) / (-g1) := by
    field_simp [hg1.ne, hg2.ne]
  rw [hquot, Real.sqrt_div hg2' (-g1)]

/-- Tolman equilibrium puts the temperatures in the same ratio as the frequencies.

Both inputs stay hypotheses. The frequency ratio is not derived from
`hydrostatic_constant`, and the Tolman product is not derived from the
frequency ratio. -/
theorem tolman_same_ratio (T1 T2 ν1 ν2 g1 g2 : ℝ) (hg1 : g1 < 0) (hg2 : g2 < 0)
    (hT : tolmanProduct T1 g1 = tolmanProduct T2 g2)
    (hν : ν1 / ν2 = Real.sqrt (-g2) / Real.sqrt (-g1))
    (hT2 : T2 ≠ 0) :
    T1 / T2 = ν1 / ν2 := by
  have hs1 : Real.sqrt (-g1) ≠ 0 := (Real.sqrt_pos.mpr (neg_pos.mpr hg1)).ne'
  have hs2 : Real.sqrt (-g2) ≠ 0 := (Real.sqrt_pos.mpr (neg_pos.mpr hg2)).ne'
  unfold tolmanProduct at hT
  have hTr : T1 / T2 = Real.sqrt (-g2) / Real.sqrt (-g1) := by
    field_simp [hT2, hs1, hs2] at hT ⊢
    linarith
  rw [hTr, hν]

/-- A frequency ratio can hold while the Tolman products do not.

`g_00` is `-1` and `-4`. The frequency ratio is `2`. Equal temperatures
`1` and `1` are not a Tolman equilibrium on that pair. -/
theorem frequency_not_tolman :
    (2 : ℝ) / 1 = Real.sqrt (-(-4 : ℝ)) / Real.sqrt (-(-1 : ℝ)) ∧
      tolmanProduct (1 : ℝ) (-1) ≠ tolmanProduct (1 : ℝ) (-4) := by
  unfold tolmanProduct
  refine ⟨?_, ?_⟩
  · have h4 : Real.sqrt (-(-4 : ℝ)) = 2 := by
      rw [show (-(-4 : ℝ)) = 2 ^ 2 by norm_num, Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 2)]
    have h1 : Real.sqrt (-(-1 : ℝ)) = 1 := by
      rw [show (-(-1 : ℝ)) = 1 ^ 2 by norm_num, Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 1)]
    rw [h4, h1]
  · have h4 : Real.sqrt (-(-4 : ℝ)) = 2 := by
      rw [show (-(-4 : ℝ)) = 2 ^ 2 by norm_num, Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 2)]
    have h1 : Real.sqrt (-(-1 : ℝ)) = 1 := by
      rw [show (-(-1 : ℝ)) = 1 ^ 2 by norm_num, Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 1)]
    rw [h4, h1]
    norm_num

/-- On one weak-field pair the exact ratio is not the Newtonian writing.

`c = 1`, `Φ1 = 0`, `Φ2 = 4`, and `g_00 = −(1 + 2Φ/c²)`, so the components
are `-1` and `-9`. The frequency ratio is `3`. `(Φ2 − Φ1)/c²` is `4`, and
`1 + (Φ2 − Φ1)/c²` is `5`. -/
theorem weak_field_not_exact (c Φ1 Φ2 g1 g2 : ℝ) (hc : c = 1) (hΦ1 : Φ1 = 0)
    (hΦ2 : Φ2 = 4) (hg1 : g1 = -(1 + 2 * Φ1 / c ^ 2))
    (hg2 : g2 = -(1 + 2 * Φ2 / c ^ 2)) :
    Real.sqrt (-g2) / Real.sqrt (-g1) ≠ (Φ2 - Φ1) / c ^ 2 ∧
      Real.sqrt (-g2) / Real.sqrt (-g1) ≠ 1 + (Φ2 - Φ1) / c ^ 2 := by
  subst hc hΦ1 hΦ2
  rw [hg1, hg2]
  have hs9 : Real.sqrt (-(-(1 + 2 * (4 : ℝ) / (1 : ℝ) ^ 2))) = 3 := by
    rw [show (-(-(1 + 2 * (4 : ℝ) / (1 : ℝ) ^ 2))) = 3 ^ 2 by norm_num,
      Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 3)]
  have hs1 : Real.sqrt (-(-(1 + 2 * (0 : ℝ) / (1 : ℝ) ^ 2))) = 1 := by
    rw [show (-(-(1 + 2 * (0 : ℝ) / (1 : ℝ) ^ 2))) = 1 ^ 2 by norm_num,
      Real.sqrt_sq (by norm_num : (0 : ℝ) ≤ 1)]
  rw [hs9, hs1]
  norm_num

/-- Two dimensionless groups do not force the identification.

A vanishing fractional shift is not `Φ / c²`. -/
theorem units_do_not_entail (z Φ c : ℝ) (hc : 0 < c) (hz : z = 0)
    (hΦ : Φ / c ^ 2 ≠ 0) :
    z ≠ Φ / c ^ 2 := by
  have _hc2 : 0 < c ^ 2 := sq_pos_of_pos hc
  rw [hz]
  exact hΦ.symm

end PhysJS.GravitationalRedshift
