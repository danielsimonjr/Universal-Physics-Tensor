/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-107`. Bridge. The lower-hybrid frequency.

Proved under these hypotheses. Ions and electrons are cold, singly
charged fluids in a uniform field. In the window `ω_ci ≪ ω ≪ ω_ce`
the Stix sum `S` vanishes in the form

```
1 + ω_pe² / ω_ce² = ω_pi² / ω²
```

The mass definitions give `ω_pe² / ω_ce² = ω_pi² / (ω_ci ω_ce)`, so

```
ω_LH² = 1 / (1/ω_pi² + 1/(ω_ci ω_ce))
```

The dense limit drops the leading `1` when `ω_pe² ≫ ω_ce²`. That drop
is a hypothesis, and it leaves `ω² = ω_ci ω_ce`. This is not a
cyclotron monomial and not `ω_pe`.
-/

namespace PhysJS.LowerHybrid

/-- `ω_pe² / ω_ce² = ω_pi² / (ω_ci ω_ce)` for singly charged cold fluids. -/
theorem mass_ratio (n e eps me mi B : ℝ)
    (hn : n ≠ 0) (he : e ≠ 0) (hε : eps ≠ 0) (hme : me ≠ 0) (hmi : mi ≠ 0) (hB : B ≠ 0) :
    (n * e ^ 2 / (eps * me)) / (e * B / me) ^ 2 =
      (n * e ^ 2 / (eps * mi)) / ((e * B / mi) * (e * B / me)) := by
  field_simp [hn, he, hε, hme, hmi, hB]

/-- Lower hybrid from the ordered cold balance `1 + ω_pi²/(ω_ci ω_ce) = ω_pi²/ω²`. -/
theorem lower_hybrid_eq (ω ωpi ωci ωce : ℝ)
    (hω : ω ≠ 0) (hpi : ωpi ≠ 0) (hci : ωci ≠ 0) (hce : ωce ≠ 0)
    (hS : 1 + ωpi ^ 2 / (ωci * ωce) = ωpi ^ 2 / ω ^ 2) :
    ω ^ 2 = 1 / (1 / ωpi ^ 2 + 1 / (ωci * ωce)) := by
  have hclear : (ωci * ωce + ωpi ^ 2) * ω ^ 2 = ωpi ^ 2 * (ωci * ωce) := by
    have h := congrArg (fun z => z * (ωci * ωce * ω ^ 2)) hS
    have hl : (1 + ωpi ^ 2 / (ωci * ωce)) * (ωci * ωce * ω ^ 2) =
        (ωci * ωce + ωpi ^ 2) * ω ^ 2 := by field_simp [hci, hce]
    have hr : ωpi ^ 2 / ω ^ 2 * (ωci * ωce * ω ^ 2) = ωpi ^ 2 * (ωci * ωce) := by
      field_simp [hω]
    rw [hl, hr] at h
    exact h
  have hprod : ωpi ^ 2 * ωci * ωce ≠ 0 :=
    mul_ne_zero (mul_ne_zero (pow_ne_zero 2 hpi) hci) hce
  have hid : (1 / ωpi ^ 2 + 1 / (ωci * ωce)) * (ωpi ^ 2 * ωci * ωce) =
      ωci * ωce + ωpi ^ 2 := by field_simp [hpi, hci, hce]
  have hden : 1 / ωpi ^ 2 + 1 / (ωci * ωce) ≠ 0 := by
    intro hzero
    have hsum : ωci * ωce + ωpi ^ 2 = 0 := by
      have h0 : (1 / ωpi ^ 2 + 1 / (ωci * ωce)) * (ωpi ^ 2 * ωci * ωce) = 0 := by
        rw [hzero, zero_mul]
      rw [hid] at h0
      exact h0
    have : ωpi ^ 2 * (ωci * ωce) = 0 := by
      simpa [hsum] using hclear
    exact hprod (by simpa [mul_assoc] using this)
  rw [eq_div_iff hden]
  apply mul_right_cancel₀ hprod
  calc
    ω ^ 2 * (1 / ωpi ^ 2 + 1 / (ωci * ωce)) * (ωpi ^ 2 * ωci * ωce)
        = ω ^ 2 * ((1 / ωpi ^ 2 + 1 / (ωci * ωce)) * (ωpi ^ 2 * ωci * ωce)) := by ring
      _ = ω ^ 2 * (ωci * ωce + ωpi ^ 2) := by rw [hid]
      _ = (ωci * ωce + ωpi ^ 2) * ω ^ 2 := by ring
      _ = ωpi ^ 2 * (ωci * ωce) := hclear
      _ = 1 * (ωpi ^ 2 * ωci * ωce) := by ring

/-- Dense ordering: dropping the `1` leaves the geometric mean. -/
theorem dense_limit (ω ωpi ωci ωce : ℝ) (hpi : ωpi ≠ 0) (hci : ωci ≠ 0) (hce : ωce ≠ 0)
    (hdrop : ωpi ^ 2 / (ωci * ωce) = ωpi ^ 2 / ω ^ 2) :
    ω ^ 2 = ωci * ωce := by
  have hω : ω ≠ 0 := by
    intro hz
    have h0 : ωpi ^ 2 / ω ^ 2 = 0 := by simp [hz]
    rw [← hdrop] at h0
    exact div_ne_zero (pow_ne_zero 2 hpi) (mul_ne_zero hci hce) h0
  have hclear : ωpi ^ 2 * ω ^ 2 = ωpi ^ 2 * (ωci * ωce) := by
    have h := congrArg (fun z => z * (ωci * ωce * ω ^ 2)) hdrop
    have hl : ωpi ^ 2 / (ωci * ωce) * (ωci * ωce * ω ^ 2) = ωpi ^ 2 * ω ^ 2 := by
      field_simp [hci, hce]
    have hr : ωpi ^ 2 / ω ^ 2 * (ωci * ωce * ω ^ 2) = ωpi ^ 2 * (ωci * ωce) := by
      field_simp [hω]
    rw [hl, hr] at h
    exact h
  apply mul_left_cancel₀ (pow_ne_zero 2 hpi)
  exact hclear

end PhysJS.LowerHybrid
