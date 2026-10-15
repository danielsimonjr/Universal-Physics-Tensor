/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-235`. Bridge. Photodiode responsivity.

The catalog equation is

```
ℛ = η e λ / (h c)     (A/W)
```

`responsivity_eq` is the photon-counting balance. Optical power `P` at
frequency `ν = c/λ` is a photon flux `Φ = P/(h ν)`. A fraction `η` of the
photons each yield one carrier pair, so the electron rate is `η Φ` and the
photocurrent is `I = e η Φ`. Dividing by `P` gives the responsivity. The
quantum efficiency `η` is a materials input and is not derived; `η ≤ 1`
for one pair per photon, no internal gain. The photocurrent `I` is the
mean current behind the shot-noise formula of `be-85`; this file does not
restate that noise law. Premises: monochromatic light, no gain, no
saturation, no photon recycling.
-/

namespace PhysJS.PhotodiodeResponsivity

/-- Responsivity from the photon-counting balance.

`hν` is `ν = c/λ`, `hΦ` the photon flux, `hrate` the carrier pair rate
`η Φ`, and `hI` the current `e` times that rate.

Not a derivation of `η`. -/
theorem responsivity_eq (P lam hpl c e η ν Φ rate I : ℝ)
    (hP : 0 < P) (hlam : 0 < lam) (hh : 0 < hpl) (hc : 0 < c)
    (hν : ν = c / lam) (hΦ : Φ = P / (hpl * ν))
    (hrate : rate = η * Φ) (hI : I = e * rate) :
    I / P = η * e * lam / (hpl * c) := by
  subst hν hΦ hrate hI
  field_simp

/-- At unit quantum efficiency the responsivity is `e λ / (h c)`, which is
the charge per photon energy `h c / λ`. -/
theorem ideal_responsivity (lam hpl c e : ℝ) :
    (1 : ℝ) * e * lam / (hpl * c) = e / (hpl * c / lam) := by
  by_cases hlam : lam = 0
  · simp [hlam]
  · field_simp

/-- Responsivity is bounded by the ideal value when `0 ≤ η ≤ 1`. -/
theorem responsivity_le_ideal (lam hpl c e η : ℝ) (hlam : 0 < lam) (hh : 0 < hpl)
    (hc : 0 < c) (he : 0 < e) (hη : η ≤ 1) :
    η * e * lam / (hpl * c) ≤ e * lam / (hpl * c) := by
  apply div_le_div_of_nonneg_right _ (by positivity)
  have : 0 < e * lam := by positivity
  nlinarith

/-- `η` is not fixed by the other factors: two efficiencies give two
responsivities. -/
theorem eta_not_fixed (lam hpl c e η₁ η₂ : ℝ) (hlam : 0 < lam) (hh : 0 < hpl)
    (hc : 0 < c) (he : 0 < e) (hne : η₁ ≠ η₂) :
    η₁ * e * lam / (hpl * c) ≠ η₂ * e * lam / (hpl * c) := by
  intro h
  have hd : hpl * c ≠ 0 := by positivity
  field_simp at h
  exact hne h

end PhysJS.PhotodiodeResponsivity
