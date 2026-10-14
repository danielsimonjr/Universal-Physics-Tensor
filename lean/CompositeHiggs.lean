/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-40`. Bridge. `V/f⁴` depends only on `h/f`.

With `θ = h/f` and `f ≠ 0`,

```
V(h) / f⁴ = −α sin²θ + β [sin⁴θ − sin²θ cos²θ]
```

Both terms carry `f⁴`, so the ratio depends on `h` only through `θ`.
The pre-correction first term `−α f² sin²θ`, divided by `f⁴`, is
`−α sin²θ / f²`. It depends on `f`, and it agrees with `−α sin²θ`
only when `f² = 1`. This is not SILH matching onto a confining theory.
The catalog records this id as not-a-bridge. This lemma does not
decide that.
-/

namespace PhysJS.CompositeHiggs

open Real

/-- The scale-free shape `−α sin²θ + β [sin⁴θ − sin²θ cos²θ]`. -/
noncomputable def reduced (alpha beta theta : ℝ) : ℝ :=
  -alpha * sin theta ^ 2 + beta * (sin theta ^ 4 - sin theta ^ 2 * cos theta ^ 2)

/-- `V(h) = f⁴` times the scale-free shape at `θ = h/f`. -/
noncomputable def potential (alpha beta f h : ℝ) : ℝ :=
  f ^ 4 * reduced alpha beta (h / f)

/-- `V/f⁴` depends on `h` only through `θ = h/f`, and both terms carry `f⁴`.

Not a SILH matching. -/
theorem scale_free (alpha beta f h f' h' : ℝ) (hf : f ≠ 0) (hf' : f' ≠ 0)
    (hθ : h / f = h' / f') :
    potential alpha beta f h / f ^ 4 = reduced alpha beta (h / f) ∧
      potential alpha beta f h / f ^ 4 = potential alpha beta f' h' / f' ^ 4 ∧
        f ^ 4 * (-alpha * sin (h / f) ^ 2) +
            f ^ 4 * (beta * (sin (h / f) ^ 4 - sin (h / f) ^ 2 * cos (h / f) ^ 2)) =
          potential alpha beta f h := by
  have h4 : f ^ 4 ≠ 0 := pow_ne_zero 4 hf
  have h4' : f' ^ 4 ≠ 0 := pow_ne_zero 4 hf'
  refine ⟨?_, ?_, ?_⟩
  · unfold potential
    exact mul_div_cancel_left₀ (reduced alpha beta (h / f)) h4
  · rw [show potential alpha beta f h / f ^ 4 = reduced alpha beta (h / f) by
        unfold potential; exact mul_div_cancel_left₀ (reduced alpha beta (h / f)) h4,
      show potential alpha beta f' h' / f' ^ 4 = reduced alpha beta (h' / f') by
        unfold potential; exact mul_div_cancel_left₀ (reduced alpha beta (h' / f')) h4']
    rw [hθ]
  · unfold potential reduced
    ring

/-- The pre-correction first term `−α f² sin²θ`, divided by `f⁴`, is
`−α sin²θ / f²`. It is not the scale-free term when `f² ≠ 1`. -/
theorem wrong_power (alpha f theta : ℝ) (hf : f ≠ 0) (halpha : alpha ≠ 0) (hs : sin theta ≠ 0)
    (hf2 : f ^ 2 ≠ 1) :
    -alpha * f ^ 2 * sin theta ^ 2 / f ^ 4 = -alpha * sin theta ^ 2 / f ^ 2 ∧
      -alpha * f ^ 2 * sin theta ^ 2 / f ^ 4 ≠ -alpha * sin theta ^ 2 := by
  refine ⟨?_, ?_⟩
  · rw [div_eq_div_iff (pow_ne_zero 4 hf) (pow_ne_zero 2 hf)]
    ring
  · intro h
    have hαs : -alpha * sin theta ^ 2 ≠ 0 :=
      mul_ne_zero (neg_ne_zero.mpr halpha) (pow_ne_zero 2 hs)
    have hre : (-alpha * sin theta ^ 2) * f ^ 2 = (-alpha * sin theta ^ 2) * f ^ 4 := by
      calc
        (-alpha * sin theta ^ 2) * f ^ 2 = -alpha * f ^ 2 * sin theta ^ 2 := by ring
        _ = -alpha * sin theta ^ 2 * f ^ 4 := by
          rw [div_eq_iff (pow_ne_zero 4 hf)] at h
          exact h
        _ = (-alpha * sin theta ^ 2) * f ^ 4 := by ring
    have hf4 : f ^ 2 = f ^ 4 := mul_left_cancel₀ hαs hre
    have : f ^ 2 * (f ^ 2 - 1) = 0 := by
      have : f ^ 4 = f ^ 2 * f ^ 2 := by ring
      rw [this] at hf4
      linarith
    rcases mul_eq_zero.mp this with hf0 | hone
    · exact absurd hf0 (pow_ne_zero 2 hf)
    · exact hf2 (sub_eq_zero.mp hone)

end PhysJS.CompositeHiggs
