/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.Algebra.Bilinear
import Mathlib.Analysis.Convex.Jensen
import Mathlib.Analysis.Convex.SpecificFunctions.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic

/-!
`be-29`. Property.

`rejected.ts` marks the row not-a-bridge. The equality is the definition
of `ΔF`, not a theorem of dynamics. For a finite probability and `β > 0`,

```
ΔF = −(1/β) log (∑_i p_i exp(−β W_i))
∑_i p_i W_i ≥ ΔF
```

The reversed inequality fails on two unequal work values. The Gaussian
identity `ΔF = ⟨W⟩ − β σ²/2` is not this entry. Jarzynski's theorem is
not this entry.
-/

namespace PhysJS.Jarzynski

open Real Finset

/-- `ΔF = −(1/β) log (∑_i p_i exp(−β W_i))`. -/
noncomputable def deltaF {ι : Type*} (β : ℝ) (t : Finset ι) (p W : ι → ℝ) : ℝ :=
  -(1 / β) * log (∑ i ∈ t, p i * exp (-β * W i))

/-- `⟨W⟩ = ∑_i p_i W_i`. -/
def meanWork {ι : Type*} (t : Finset ι) (p W : ι → ℝ) : ℝ :=
  ∑ i ∈ t, p i * W i

/-- A finite probability and `β > 0` give `⟨W⟩ ≥ ΔF`.

Covers the property of `be-29`. Not Jarzynski's theorem, and not the
Gaussian identity. -/
theorem jensen_work {ι : Type*} (t : Finset ι) (p W : ι → ℝ) (β : ℝ)
    (hβ : 0 < β) (hp : ∀ i ∈ t, 0 ≤ p i) (hsum : ∑ i ∈ t, p i = 1) :
    deltaF β t p W ≤ meanWork t p W := by
  have hf := convexOn_exp.comp_linearMap (LinearMap.mul ℝ ℝ (-β))
  have hjensen := hf.map_sum_le (w := p) (p := W) hp hsum (fun _ _ => Set.mem_univ _)
  simp only [Function.comp, LinearMap.mul_apply', smul_eq_mul] at hjensen
  have hlog := log_le_log (exp_pos _) hjensen
  rw [log_exp] at hlog
  have hflip : -log (∑ i ∈ t, p i * exp (-β * W i)) ≤ β * meanWork t p W := by
    have := neg_le_neg hlog
    simpa [meanWork, neg_mul, neg_neg, mul_comm] using this
  have hdiv : -log (∑ i ∈ t, p i * exp (-β * W i)) / β ≤ meanWork t p W :=
    (div_le_iff₀ hβ).mpr (by simpa [mul_comm] using hflip)
  simpa [deltaF, neg_mul, one_div, div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using hdiv

/-- On two unequal work values, both with positive weight, `⟨W⟩ ≤ ΔF` fails. -/
theorem wrong_dictionary_reversed (β : ℝ) (p W : Fin 2 → ℝ) (hβ : 0 < β)
    (hp : ∀ i, 0 < p i) (hsum : ∑ i, p i = 1) (hw : W 0 ≠ W 1) :
    ¬ meanWork univ p W ≤ deltaF β univ p W := by
  have hne : -β * W 0 ≠ -β * W 1 := by
    intro h
    exact hw (mul_left_cancel₀ (neg_ne_zero.mpr hβ.ne') h)
  have hab : p 0 + p 1 = 1 := by simpa [Fin.sum_univ_two] using hsum
  have hstrict :=
    strictConvexOn_exp.2 (Set.mem_univ (-β * W 0)) (Set.mem_univ (-β * W 1)) hne (hp 0) (hp 1) hab
  simp only [smul_eq_mul] at hstrict
  have hleft : p 0 * (-β * W 0) + p 1 * (-β * W 1) =
      -β * (p 0 * W 0 + p 1 * W 1) := by ring
  have hmean : meanWork univ p W = p 0 * W 0 + p 1 * W 1 := by
    simp [meanWork, Fin.sum_univ_two]
  have hsumexp : ∑ i ∈ univ, p i * exp (-β * W i) =
      p 0 * exp (-β * W 0) + p 1 * exp (-β * W 1) := by
    simp [Fin.sum_univ_two]
  rw [hleft, ← hmean, ← hsumexp] at hstrict
  have hlog := log_lt_log (exp_pos _) hstrict
  rw [log_exp] at hlog
  have hflip : -log (∑ i ∈ univ, p i * exp (-β * W i)) < β * meanWork univ p W := by
    have := neg_lt_neg hlog
    simpa [neg_mul, neg_neg, mul_comm] using this
  have hdiv : -log (∑ i ∈ univ, p i * exp (-β * W i)) / β < meanWork univ p W :=
    (div_lt_iff₀ hβ).mpr (by simpa [mul_comm] using hflip)
  have hlt : deltaF β univ p W < meanWork univ p W := by
    simpa [deltaF, neg_mul, one_div, div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using hdiv
  exact not_le.mpr hlt

end PhysJS.Jarzynski
