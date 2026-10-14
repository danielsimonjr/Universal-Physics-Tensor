/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-216`. Bridge. Schwarzschild innermost stable circular orbit and photon sphere.

The catalog equations are

```
r_ISCO = 6 G M / c²
r_ph   = 3 G M / c²
```

Write `m = G M / c²`. For a massive test particle of specific angular
momentum `L` in the Schwarzschild vacuum the radial equation is
`(dr/dτ)² = E² − V(r)` (lengths in units with `c = 1` after dividing by `c²`) with

```
V(r) = (1 − 2m/r) (1 + L²/r²)
```

`hasDerivAt_V` and `hasDerivAt_dV` give the first and second derivatives
exactly. A circular orbit is `V'(r) = 0`. `isco_eq` takes the marginal
condition `V'(r) = V''(r) = 0` (inflection point of the effective
potential) with `m > 0`, `r > 0`, and derives `r = 6 m` and
`L² = 12 m²`. For light the potential is `(1 − 2m/r)/r²` (per `b⁻²`) and
`photon_sphere_eq` derives that its extremum is at `r = 3 m`.
`catalog_forms` gives the `G M / c²` forms by
`m = G M / c²`.

Premises: non-rotating, vacuum, test particle (no self-force). Not a
derivation of the Schwarzschild metric. Units alone fix the monomial
`G M / c²` only; the coefficients 6 and 3 are the geodesic algebra proved
here. The numerical 8.86 km and 4.43 km values are not evaluated.
-/

namespace PhysJS.SchwarzschildCircularOrbits

/-- Massive-particle effective potential; `ℓ = L²`. -/
noncomputable def V (m ℓ r : ℝ) : ℝ :=
  1 - 2 * m * r⁻¹ + ℓ * (r⁻¹) ^ 2 - 2 * m * ℓ * (r⁻¹) ^ 3

/-- `V'`. -/
noncomputable def dV (m ℓ r : ℝ) : ℝ :=
  2 * m * (r⁻¹) ^ 2 - 2 * ℓ * (r⁻¹) ^ 3 + 6 * m * ℓ * (r⁻¹) ^ 4

/-- `V''`. -/
noncomputable def ddV (m ℓ r : ℝ) : ℝ :=
  -4 * m * (r⁻¹) ^ 3 + 6 * ℓ * (r⁻¹) ^ 4 - 24 * m * ℓ * (r⁻¹) ^ 5

/-- Photon effective potential per `b⁻²`: `(1 − 2m/r)/r²`. -/
noncomputable def Vph (m r : ℝ) : ℝ :=
  (r⁻¹) ^ 2 - 2 * m * (r⁻¹) ^ 3

/-- Its derivative. -/
noncomputable def dVph (m r : ℝ) : ℝ :=
  -2 * (r⁻¹) ^ 3 + 6 * m * (r⁻¹) ^ 4

lemma hasDerivAt_invpow (n : ℕ) (r : ℝ) (hr : r ≠ 0) :
    HasDerivAt (fun y : ℝ => (y⁻¹) ^ (n + 1)) (-((n : ℝ) + 1) * (r⁻¹) ^ (n + 2)) r := by
  have h := (hasDerivAt_inv hr).pow (n + 1)
  refine h.congr_deriv ?_
  simp only [Nat.add_sub_cancel]
  push_cast
  rw [← inv_pow]
  ring

theorem hasDerivAt_V (m ℓ r : ℝ) (hr : r ≠ 0) : HasDerivAt (V m ℓ) (dV m ℓ r) r := by
  have h1 := hasDerivAt_inv hr
  have h2 := hasDerivAt_invpow 1 r hr
  have h3 := hasDerivAt_invpow 2 r hr
  have h := ((((hasDerivAt_const r (1 : ℝ)).sub (h1.const_mul (2 * m))).add
    (h2.const_mul ℓ)).sub (h3.const_mul (2 * m * ℓ)))
  have hfun : V m ℓ = fun y : ℝ => 1 - 2 * m * y⁻¹ + ℓ * (y⁻¹) ^ (1 + 1) - 2 * m * ℓ * (y⁻¹) ^ (2 + 1) := by
    ext y; simp [V]
  rw [hfun]
  refine h.congr_deriv ?_
  unfold dV
  push_cast
  field_simp
  ring

theorem hasDerivAt_dV (m ℓ r : ℝ) (hr : r ≠ 0) : HasDerivAt (dV m ℓ) (ddV m ℓ r) r := by
  have h2 := hasDerivAt_invpow 1 r hr
  have h3 := hasDerivAt_invpow 2 r hr
  have h4 := hasDerivAt_invpow 3 r hr
  have h := (((h2.const_mul (2 * m)).sub (h3.const_mul (2 * ℓ))).add (h4.const_mul (6 * m * ℓ)))
  have hfun : dV m ℓ = fun y : ℝ => 2 * m * (y⁻¹) ^ (1 + 1) - 2 * ℓ * (y⁻¹) ^ (2 + 1)
      + 6 * m * ℓ * (y⁻¹) ^ (3 + 1) := by
    ext y; simp [dV]
  rw [hfun]
  refine h.congr_deriv ?_
  unfold ddV
  push_cast
  field_simp
  ring

theorem hasDerivAt_Vph (m r : ℝ) (hr : r ≠ 0) : HasDerivAt (Vph m) (dVph m r) r := by
  have h2 := hasDerivAt_invpow 1 r hr
  have h3 := hasDerivAt_invpow 2 r hr
  have h := (h2.sub (h3.const_mul (2 * m)))
  have hfun : Vph m = fun y : ℝ => (y⁻¹) ^ (1 + 1) - 2 * m * (y⁻¹) ^ (2 + 1) := by
    ext y; simp [Vph]
  rw [hfun]
  refine h.congr_deriv ?_
  unfold dVph
  push_cast
  field_simp
  ring

/-- `V'(r) = 2 (m r² − ℓ r + 3 m ℓ) / r⁴`. -/
lemma dV_factor (m ℓ r : ℝ) (hr : r ≠ 0) :
    dV m ℓ r = 2 * (m * r ^ 2 - ℓ * r + 3 * m * ℓ) / r ^ 4 := by
  unfold dV; field_simp; ring

/-- `V''(r) = (2 (2 m r − ℓ) r − 8 (m r² − ℓ r + 3 m ℓ)) / r⁵`. -/
lemma ddV_factor (m ℓ r : ℝ) (hr : r ≠ 0) :
    ddV m ℓ r = (2 * (2 * m * r - ℓ) * r - 8 * (m * r ^ 2 - ℓ * r + 3 * m * ℓ)) / r ^ 5 := by
  unfold ddV; field_simp; ring

/-- ISCO: the effective potential has an inflection point, `V' = V'' = 0`,
exactly at `r = 6 m` with `L² = 12 m²`. Hypotheses are derivative facts
about `V`. -/
theorem isco_eq (m ℓ r : ℝ) (hm : 0 < m) (hr : 0 < r)
    (h1 : HasDerivAt (V m ℓ) 0 r)
    (h2 : HasDerivAt (dV m ℓ) 0 r) :
    r = 6 * m ∧ ℓ = 12 * m ^ 2 := by
  have hr0 : r ≠ 0 := hr.ne'
  have e1 : dV m ℓ r = 0 := (hasDerivAt_V m ℓ r hr0).unique h1
  have e2 : ddV m ℓ r = 0 := (hasDerivAt_dV m ℓ r hr0).unique h2
  rw [dV_factor m ℓ r hr0] at e1
  rw [ddV_factor m ℓ r hr0] at e2
  have q : m * r ^ 2 - ℓ * r + 3 * m * ℓ = 0 := by
    have : (2 : ℝ) * (m * r ^ 2 - ℓ * r + 3 * m * ℓ) = 0 := by
      have h4 : r ^ 4 ≠ 0 := pow_ne_zero 4 hr0
      exact (div_eq_zero_iff.mp e1).resolve_right h4
    linarith
  have q' : 2 * m * r - ℓ = 0 := by
    have h5 : r ^ 5 ≠ 0 := pow_ne_zero 5 hr0
    have := (div_eq_zero_iff.mp e2).resolve_right h5
    rw [q] at this
    have : (2 * (2 * m * r - ℓ)) * r = 0 := by linarith
    rcases mul_eq_zero.mp this with h | h
    · linarith
    · exact absurd h hr0
  have hℓr : ℓ = 2 * m * r := by linarith
  have : m * r * (6 * m - r) = 0 := by
    rw [hℓr] at q; nlinarith [q]
  have hmr : m * r ≠ 0 := (mul_pos hm hr).ne'
  have hr6 : 6 * m - r = 0 := (mul_eq_zero.mp this).resolve_left hmr
  have hrr : r = 6 * m := by linarith
  refine ⟨hrr, ?_⟩
  rw [hℓr, hrr]; ring

/-- Photon sphere: `d/dr [(1 − 2m/r)/r²] = 0` with `r > 0` iff `r = 3 m`. -/
theorem photon_sphere_eq (m r : ℝ) (hr : 0 < r)
    (h : HasDerivAt (Vph m) 0 r) : r = 3 * m := by
  have hr0 : r ≠ 0 := hr.ne'
  have e := (hasDerivAt_Vph m r hr0).unique h
  unfold dVph at e
  have e' : 2 * (3 * m - r) = 0 := by
    have : (2 * (3 * m - r)) / r ^ 4 = 0 := by rw [← e]; field_simp; ring
    exact (div_eq_zero_iff.mp this).resolve_right (pow_ne_zero 4 hr0)
  linarith

/-- Catalog forms: with `m = G M / c²`. -/
theorem catalog_forms (G M c m r_isco r_ph : ℝ) (hm : m = G * M / c ^ 2)
    (h6 : r_isco = 6 * m) (h3 : r_ph = 3 * m) :
    r_isco = 6 * G * M / c ^ 2 ∧ r_ph = 3 * G * M / c ^ 2 := by
  subst hm h6 h3
  constructor <;> ring

/-- The ISCO is twice the photon-sphere radius and `3` times the horizon `2 m`. -/
theorem isco_ratios (m r_isco r_ph : ℝ) (hm : 0 < m)
    (h6 : r_isco = 6 * m) (h3 : r_ph = 3 * m) :
    r_isco = 2 * r_ph ∧ r_isco = 3 * (2 * m) ∧ r_ph < r_isco := by
  subst h6 h3
  refine ⟨by ring, by ring, by linarith⟩

/-- Negative control: the photon-sphere radius is not an ISCO. At `r = 3 m` the
second derivative of the massive potential cannot vanish together with `V' = 0`. -/
theorem photon_radius_not_isco (m ℓ : ℝ) (hm : 0 < m) (hℓ : 0 < ℓ) :
    ¬ (dV m ℓ (3 * m) = 0 ∧ ddV m ℓ (3 * m) = 0) := by
  rintro ⟨e1, e2⟩
  have hr0 : (3 * m) ≠ 0 := by positivity
  rw [dV_factor m ℓ _ hr0] at e1
  have q := (div_eq_zero_iff.mp e1).resolve_right (pow_ne_zero 4 hr0)
  rw [ddV_factor m ℓ _ hr0] at e2
  have q2 := (div_eq_zero_iff.mp e2).resolve_right (pow_ne_zero 5 hr0)
  nlinarith [q, q2, mul_pos hm hm, mul_pos hm hℓ]

/-- Negative control: the Schwarzschild radius `2 m` is not a circular orbit
radius for any `L² > 0`: `V'(2 m) < 0`. -/
theorem horizon_not_circular (m ℓ : ℝ) (hm : 0 < m) (hℓ : 0 < ℓ) : dV m ℓ (2 * m) ≠ 0 := by
  have hr0 : (2 * m) ≠ 0 := by positivity
  rw [dV_factor m ℓ _ hr0]
  have : 2 * (m * (2 * m) ^ 2 - ℓ * (2 * m) + 3 * m * ℓ) = 2 * (4 * m ^ 3 + m * ℓ) := by ring
  rw [this]
  have : 0 < 2 * (4 * m ^ 3 + m * ℓ) := by positivity
  exact (div_pos this (by positivity)).ne'

end PhysJS.SchwarzschildCircularOrbits
