/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-218`. Bridge. Peters inspiral time of a circular binary.

The catalog equation is

```
t = (5/256) c⁵ a⁴ / (G³ m₁ m₂ (m₁ + m₂))
```

Premises: the orbital energy of a circular binary is `E = −G m₁ m₂ / (2 a)`;
the quadrupole power `P(a) = (32/5) G⁴ m₁² m₂² (m₁ + m₂) / (c⁵ a⁵)` is
radiated (hypothesis, see `be-217`); the energy balance is `dE/dt = −P(a(t))`.
`dadt_eq` differentiates `E` along `a(t)` and derives the Peters rate

```
da/dt = −(64/5) G³ m₁ m₂ (m₁ + m₂) / (c⁵ a³)
```

`a⁴ + K t` then has zero derivative (`K = (256/5) G³ m₁ m₂ (m₁ + m₂)/c⁵`),
so `a(t)⁴ = a₀⁴ − K t` on the interval of positive separation
(`quartic_law`). `inspiral_time_eq` states that if the separation reaches
zero at `T` (continuity), then `T = a₀⁴ / K`, which is the catalog time.

Premises: circular, adiabatic, point masses, no mass transfer. The
Newtonian orbital energy is used up to the coalescence point; the true
merger happens at a few Schwarzschild radii, which this formula does not
model. Not a derivation of the quadrupole power. The 1.64 Gyr figure is
not evaluated.
-/

namespace PhysJS.PetersInspiralTime

/-- Quadrupole power at separation `a`. -/
noncomputable def Pgw (G c m₁ m₂ a : ℝ) : ℝ :=
  32 / 5 * G ^ 4 * m₁ ^ 2 * m₂ ^ 2 * (m₁ + m₂) / (c ^ 5 * a ^ 5)

/-- Peters constant `K = (256/5) G³ m₁ m₂ (m₁ + m₂) / c⁵`. -/
noncomputable def K (G c m₁ m₂ : ℝ) : ℝ :=
  256 / 5 * G ^ 3 * m₁ * m₂ * (m₁ + m₂) / c ^ 5

/-- The orbital energy as a function of the separation along the orbit. -/
noncomputable def E (G m₁ m₂ : ℝ) (a : ℝ → ℝ) (t : ℝ) : ℝ :=
  -(G * m₁ * m₂) / 2 * (a t)⁻¹

theorem hasDerivAt_E (G m₁ m₂ : ℝ) (a : ℝ → ℝ) (a' t : ℝ) (ha : HasDerivAt a a' t)
    (hpos : a t ≠ 0) :
    HasDerivAt (E G m₁ m₂ a) (G * m₁ * m₂ / 2 * a' / (a t) ^ 2) t := by
  have h := (ha.inv hpos).const_mul (-(G * m₁ * m₂) / 2)
  have hfun : E G m₁ m₂ a = fun s => -(G * m₁ * m₂) / 2 * (a s)⁻¹ := rfl
  rw [hfun]
  refine h.congr_deriv ?_
  field_simp

/-- Peters rate from `dE/dt = −P`. -/
theorem dadt_eq (G c m₁ m₂ : ℝ) (a : ℝ → ℝ) (a' t : ℝ) (hG : 0 < G) (hc : 0 < c)
    (hm₁ : 0 < m₁) (hm₂ : 0 < m₂)
    (hpos : 0 < a t) (ha : HasDerivAt a a' t)
    (hbal : HasDerivAt (E G m₁ m₂ a) (-(Pgw G c m₁ m₂ (a t))) t) :
    a' = -(64 / 5) * G ^ 3 * m₁ * m₂ * (m₁ + m₂) / (c ^ 5 * (a t) ^ 3) := by
  have hE := hasDerivAt_E G m₁ m₂ a a' t ha hpos.ne'
  have heq := hE.unique hbal
  unfold Pgw at heq
  have hat : a t ≠ 0 := hpos.ne'
  field_simp at heq
  have hGm : G * m₁ * m₂ ≠ 0 := by positivity
  field_simp
  nlinarith [heq]

/-- `a⁴ = a₀⁴ − K t` on `[0, T)`, `a` continuous on `[0, T]`. -/
theorem quartic_law (G c m₁ m₂ T : ℝ) (a : ℝ → ℝ) (a' : ℝ → ℝ)
    (hG : 0 < G) (hc : 0 < c) (hm₁ : 0 < m₁) (hm₂ : 0 < m₂)
    (hpos : ∀ t ∈ Set.Ico 0 T, 0 < a t)
    (hcont : ContinuousOn a (Set.Icc 0 T))
    (ha : ∀ t ∈ Set.Ico 0 T, HasDerivAt a (a' t) t)
    (hbal : ∀ t ∈ Set.Ico 0 T, HasDerivAt (E G m₁ m₂ a) (-(Pgw G c m₁ m₂ (a t))) t) :
    ∀ t ∈ Set.Icc 0 T, (a t) ^ 4 + K G c m₁ m₂ * t = (a 0) ^ 4 := by
  set f : ℝ → ℝ := fun t => (a t) ^ 4 + K G c m₁ m₂ * t with hf
  have hfc : ContinuousOn f (Set.Icc 0 T) :=
    (hcont.pow 4).add (continuousOn_const.mul continuousOn_id)
  have hd : ∀ t ∈ Set.Ico 0 T, HasDerivWithinAt f 0 (Set.Ici t) t := by
    intro t ht
    have hp := hpos t ht
    have hrate := dadt_eq G c m₁ m₂ a (a' t) t hG hc hm₁ hm₂ hp (ha t ht) (hbal t ht)
    have h4 := ((ha t ht).pow 4).add ((hasDerivAt_id t).const_mul (K G c m₁ m₂))
    have hz : (↑(4 : ℕ) * a t ^ (4 - 1) * a' t + K G c m₁ m₂ * 1) = 0 := by
      rw [hrate]
      unfold K
      have : a t ≠ 0 := hp.ne'
      have : c ≠ 0 := hc.ne'
      push_cast
      field_simp
      ring
    exact ((h4.congr_deriv hz).hasDerivWithinAt)
  have hconst := constant_of_has_deriv_right_zero hfc hd
  intro t ht
  have := hconst t ht
  simpa [hf] using this

/-- If the separation reaches zero at `T` the inspiral time is the catalog value. -/
theorem inspiral_time_eq (G c m₁ m₂ T : ℝ) (a : ℝ → ℝ) (a' : ℝ → ℝ)
    (hG : 0 < G) (hc : 0 < c) (hm₁ : 0 < m₁) (hm₂ : 0 < m₂)
    (hpos : ∀ t ∈ Set.Ico 0 T, 0 < a t)
    (hcont : ContinuousOn a (Set.Icc 0 T))
    (ha : ∀ t ∈ Set.Ico 0 T, HasDerivAt a (a' t) t)
    (hbal : ∀ t ∈ Set.Ico 0 T, HasDerivAt (E G m₁ m₂ a) (-(Pgw G c m₁ m₂ (a t))) t)
    (hT : 0 < T) (hzero : a T = 0) :
    T = 5 / 256 * c ^ 5 * (a 0) ^ 4 / (G ^ 3 * m₁ * m₂ * (m₁ + m₂)) := by
  have h := quartic_law G c m₁ m₂ T a a' hG hc hm₁ hm₂ hpos hcont ha hbal T
    ⟨hT.le, le_rfl⟩
  rw [hzero] at h
  have hK : K G c m₁ m₂ ≠ 0 := by unfold K; positivity
  have hT' : T = (a 0) ^ 4 / K G c m₁ m₂ := by
    field_simp
    linarith
  rw [hT']
  unfold K
  have : G ≠ 0 := hG.ne'
  have : m₁ + m₂ ≠ 0 := by positivity
  field_simp

/-- Wrong exponent control: with `da/dt ∝ −a⁻²` (a hypothetical `a³`-law) the
time would scale as `a³`, not `a⁴`; the two laws differ at any `a₀ ≠ 1`
(unit-free comparison of `a₀³` and `a₀⁴`). -/
theorem exponent_four_not_three (a₀ : ℝ) (h0 : 0 < a₀) (h1 : a₀ ≠ 1) :
    a₀ ^ 4 ≠ a₀ ^ 3 := by
  intro h
  have h3 : a₀ ^ 3 ≠ 0 := by positivity
  have : a₀ ^ 3 * (a₀ - 1) = 0 := by ring_nf; ring_nf at h; linarith
  rcases mul_eq_zero.mp this with h' | h'
  · exact h3 h'
  · exact h1 (by linarith)

/-- A bare number does not fix the coefficient: for any positive `κ`, `t = κ a⁴ ...`
is dimensionally the same monomial, but only `κ = 5/256` solves the ODE. -/
theorem coefficient_not_fixed (κ : ℝ) (hκ : κ ≠ 5 / 256) (G c m₁ m₂ a₀ : ℝ)
    (hG : 0 < G) (hc : 0 < c) (hm₁ : 0 < m₁) (hm₂ : 0 < m₂) (ha : 0 < a₀) :
    κ * c ^ 5 * a₀ ^ 4 / (G ^ 3 * m₁ * m₂ * (m₁ + m₂)) ≠
      a₀ ^ 4 / K G c m₁ m₂ := by
  intro h
  unfold K at h
  have : m₁ + m₂ ≠ 0 := by positivity
  have : G ≠ 0 := hG.ne'
  have : c ≠ 0 := hc.ne'
  have : a₀ ≠ 0 := ha.ne'
  field_simp at h
  apply hκ
  nlinarith [h, pow_pos ha 4, pow_pos hc 5, pow_pos hG 3, mul_pos hm₁ hm₂]

end PhysJS.PetersInspiralTime
