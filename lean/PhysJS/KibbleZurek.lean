/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-34`. The Kibble–Zurek power, not the Boltzmann factor.

From `τ(ε) = τ₀ ε^{−zν}`, `ξ(ε) = ξ₀ ε^{−ν}`, and freeze-out
`τ(ε̂) = ε̂ τ_Q`, with positive parameters:

```
ε̂ = (τ₀ / τ_Q) ^ (1 / (1 + zν))
τ₀ ε̂^{−zν} = ε̂ τ_Q
(ξ₀ ε̂^{−ν})^{−d} = ξ₀^{−d} (τ_Q / τ₀)^{−dν / (1 + zν)}
```

`ε̂` is the unique positive solution of the freeze-out equation. The
exponent `−dν / (zν)`, with the `1` omitted, is not that power. The
factor `exp(−m c² / k_B T_reh)` is not in the theorem, and the missing
`1/a^d` prefactor is not repaired here.
-/

namespace PhysJS.KibbleZurek

open Real

/-- Freeze-out value `ε̂ = (τ₀ / τ_Q) ^ (1 / (1 + zν))`. -/
noncomputable def epsHat (τ0 τQ z ν : ℝ) : ℝ :=
  (τ0 / τQ) ^ (1 / (1 + z * ν))

lemma epsHat_pos {τ0 τQ z ν : ℝ} (hτ0 : 0 < τ0) (hτQ : 0 < τQ) (_hz : 0 < z) (_hν : 0 < ν) :
    0 < epsHat τ0 τQ z ν := by
  unfold epsHat
  exact rpow_pos_of_pos (div_pos hτ0 hτQ) _

lemma one_add_pos {z ν : ℝ} (hz : 0 < z) (hν : 0 < ν) : 0 < 1 + z * ν := by
  positivity

lemma epsHat_pow {τ0 τQ z ν : ℝ} (hτ0 : 0 < τ0) (hτQ : 0 < τQ) (hz : 0 < z) (hν : 0 < ν) :
    epsHat τ0 τQ z ν ^ (1 + z * ν) = τ0 / τQ := by
  unfold epsHat
  rw [← rpow_mul (div_nonneg hτ0.le hτQ.le)]
  have hβ : (1 + z * ν) ≠ 0 := (one_add_pos hz hν).ne'
  rw [show (1 / (1 + z * ν)) * (1 + z * ν) = 1 by field_simp [hβ], rpow_one]

/-- Freeze-out holds at `ε̂`, and `ε̂` is the only positive solution.

The defect power is `ξ₀^{−d} (τ_Q / τ₀)^{−dν / (1 + zν)}`. Covers that
derivation step of `be-34`, not the Boltzmann factor and not the missing
`1/a^d` prefactor. -/
theorem exponent (τ0 τQ ξ0 z ν d : ℝ) (hτ0 : 0 < τ0) (hτQ : 0 < τQ) (hξ : 0 < ξ0)
    (hz : 0 < z) (hν : 0 < ν) (hd : 0 < d) :
    τ0 * epsHat τ0 τQ z ν ^ (-(z * ν)) = epsHat τ0 τQ z ν * τQ ∧
      (∀ ε : ℝ, 0 < ε →
        (τ0 * ε ^ (-(z * ν)) = ε * τQ ↔ ε = epsHat τ0 τQ z ν)) ∧
      (ξ0 * epsHat τ0 τQ z ν ^ (-ν)) ^ (-d) =
        ξ0 ^ (-d) * (τQ / τ0) ^ (-(d * ν) / (1 + z * ν)) := by
  set eH := epsHat τ0 τQ z ν
  have heH : 0 < eH := epsHat_pos hτ0 hτQ hz hν
  have hβ : 0 < 1 + z * ν := one_add_pos hz hν
  have hpow : eH ^ (1 + z * ν) = τ0 / τQ := epsHat_pow hτ0 hτQ hz hν
  have hfreeze : τ0 * eH ^ (-(z * ν)) = eH * τQ := by
    have hτ : τ0 = eH * τQ * eH ^ (z * ν) := by
      calc
        τ0 = τQ * (τ0 / τQ) := by field_simp [hτQ.ne']
        _ = τQ * eH ^ (1 + z * ν) := by rw [← hpow]
        _ = τQ * (eH ^ (1 : ℝ) * eH ^ (z * ν)) := by rw [rpow_add heH]
        _ = eH * τQ * eH ^ (z * ν) := by rw [rpow_one]; ring
    calc
      τ0 * eH ^ (-(z * ν))
          = (eH * τQ * eH ^ (z * ν)) * eH ^ (-(z * ν)) := by rw [hτ]
      _ = eH * τQ * (eH ^ (z * ν) * eH ^ (-(z * ν))) := by ring
      _ = eH * τQ * eH ^ (z * ν + -(z * ν)) := by rw [← rpow_add heH]
      _ = eH * τQ * eH ^ (0 : ℝ) := by
        congr 1
        ring_nf
      _ = eH * τQ := by rw [rpow_zero, mul_one]
  refine ⟨hfreeze, ?_, ?_⟩
  · intro ε hε
    constructor
    · intro h
      have hτ : τ0 = τQ * ε ^ (1 + z * ν) := by
        have hmul := congrArg (fun t : ℝ => t * ε ^ (z * ν)) h
        have hcancel : ε ^ (-(z * ν)) * ε ^ (z * ν) = 1 := by
          rw [← rpow_add hε]
          ring_nf
          exact rpow_zero _
        calc
          τ0 = τ0 * (ε ^ (-(z * ν)) * ε ^ (z * ν)) := by rw [hcancel, mul_one]
          _ = τ0 * ε ^ (-(z * ν)) * ε ^ (z * ν) := by ring
          _ = ε * τQ * ε ^ (z * ν) := by rw [hmul]
          _ = τQ * (ε ^ (1 : ℝ) * ε ^ (z * ν)) := by rw [rpow_one]; ring
          _ = τQ * ε ^ ((1 : ℝ) + z * ν) := by rw [← rpow_add hε]
      have hεpow : ε ^ (1 + z * ν) = τ0 / τQ := by
        have hτQ : τQ ≠ 0 := hτQ.ne'
        field_simp [hτQ] at hτ ⊢
        linarith
      calc
        ε = (ε ^ (1 + z * ν)) ^ (1 / (1 + z * ν)) := by
          rw [← rpow_mul hε.le]
          have hβ0 : (1 + z * ν) ≠ 0 := hβ.ne'
          rw [show (1 + z * ν) * (1 / (1 + z * ν)) = 1 by field_simp [hβ0], rpow_one]
        _ = (τ0 / τQ) ^ (1 / (1 + z * ν)) := by rw [hεpow]
        _ = eH := rfl
    · intro hεeq
      simpa [hεeq] using hfreeze
  · have hξpow : (ξ0 * eH ^ (-ν)) ^ (-d) = ξ0 ^ (-d) * (eH ^ (-ν)) ^ (-d) := by
      rw [mul_rpow hξ.le (rpow_pos_of_pos heH _).le]
    have hεexp : (eH ^ (-ν)) ^ (-d) = eH ^ (d * ν) := by
      rw [← rpow_mul heH.le]
      congr 1
      ring
    have hscale : eH ^ (d * ν) = (τQ / τ0) ^ (-(d * ν) / (1 + z * ν)) := by
      have hbase : 0 ≤ τ0 / τQ := div_nonneg hτ0.le hτQ.le
      calc
        eH ^ (d * ν) = ((τ0 / τQ) ^ (1 / (1 + z * ν))) ^ (d * ν) := rfl
        _ = (τ0 / τQ) ^ ((1 / (1 + z * ν)) * (d * ν)) := by rw [← rpow_mul hbase]
        _ = (τ0 / τQ) ^ ((d * ν) / (1 + z * ν)) := by
          congr 1
          field_simp [hβ.ne']
        _ = ((τQ / τ0)⁻¹) ^ ((d * ν) / (1 + z * ν)) := by rw [inv_div]
        _ = ((τQ / τ0) ^ ((d * ν) / (1 + z * ν)))⁻¹ := by
          rw [inv_rpow (div_nonneg hτQ.le hτ0.le)]
        _ = (τQ / τ0) ^ (-((d * ν) / (1 + z * ν))) := by
          rw [← rpow_neg (div_nonneg hτQ.le hτ0.le)]
        _ = (τQ / τ0) ^ (-(d * ν) / (1 + z * ν)) := by
          congr 1
          ring
    calc
      (ξ0 * eH ^ (-ν)) ^ (-d) = ξ0 ^ (-d) * (eH ^ (-ν)) ^ (-d) := hξpow
      _ = ξ0 ^ (-d) * eH ^ (d * ν) := by rw [hεexp]
      _ = ξ0 ^ (-d) * (τQ / τ0) ^ (-(d * ν) / (1 + z * ν)) := by rw [hscale]

/-- Dropping the `1` in the denominator is not the freeze-out exponent. -/
theorem wrong_dictionary_omit_one (τ0 τQ ξ0 z ν d : ℝ) (hτ0 : 0 < τ0) (hτQ : 0 < τQ)
    (hξ : 0 < ξ0) (hz : 0 < z) (hν : 0 < ν) (hd : 0 < d) (hneq : τ0 ≠ τQ) :
    (ξ0 * epsHat τ0 τQ z ν ^ (-ν)) ^ (-d) ≠
      ξ0 ^ (-d) * (τQ / τ0) ^ (-(d * ν) / (z * ν)) := by
  have hexp := (exponent τ0 τQ ξ0 z ν d hτ0 hτQ hξ hz hν hd).2.2
  intro h
  have hξ0 : ξ0 ^ (-d) ≠ 0 := (rpow_pos_of_pos hξ _).ne'
  have hb : 0 < τQ / τ0 := div_pos hτQ hτ0
  have hbase : (τQ / τ0) ^ (-(d * ν) / (1 + z * ν)) =
      (τQ / τ0) ^ (-(d * ν) / (z * ν)) := by
    have heq : ξ0 ^ (-d) * (τQ / τ0) ^ (-(d * ν) / (1 + z * ν)) =
        ξ0 ^ (-d) * (τQ / τ0) ^ (-(d * ν) / (z * ν)) := hexp.symm.trans h
    exact mul_left_cancel₀ hξ0 heq
  have hlog := congrArg log hbase
  rw [log_rpow hb, log_rpow hb] at hlog
  have hlog0 : log (τQ / τ0) ≠ 0 := by
    intro hzero
    rcases log_eq_zero.mp hzero with h0 | h1 | hn
    · exact hb.ne' h0
    · have : τQ = τ0 := by field_simp [hτ0.ne'] at h1; linarith
      exact hneq this.symm
    · linarith
  have hp : -(d * ν) / (1 + z * ν) ≠ -(d * ν) / (z * ν) := by
    have hβ : 1 + z * ν ≠ 0 := (one_add_pos hz hν).ne'
    have hzn : z * ν ≠ 0 := mul_ne_zero hz.ne' hν.ne'
    have hdn : d * ν ≠ 0 := mul_ne_zero hd.ne' hν.ne'
    intro hsame
    field_simp [hβ, hzn, hdn] at hsame
    linarith
  exact hp (mul_right_cancel₀ hlog0 hlog)

end PhysJS.KibbleZurek
