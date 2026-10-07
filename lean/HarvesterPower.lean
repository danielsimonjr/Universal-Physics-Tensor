/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-181`. Bridge. Vibration-harvester power at resonance.

The catalog equation is the Williams–Yates form

```
P = m ζ_e A² / (4 ω_n (ζ_e + ζ_m)²)
```

at resonance, which at the matched load `ζ_e = ζ_m` is
`P = m A² / (16 ζ_m ω_n)`. `harvester_eq` derives both from the
steady-state response of the base-driven spring–mass.

The proof mass `m` on a spring `k` with total damper `c = c_e + c_m` follows
`m z̈ + c ż + k z = m A cos(ω t)` in the base frame, `A` the base-acceleration
amplitude. The steady state is `z = a cos(ω t) + b sin(ω t)`. Matching the
`cos` and `sin` coefficients (`steady_state`) gives

```
(k − m ω²) a + c ω b = m A,    (k − m ω²) b − c ω a = 0
```

so `a² + b² = (m A)² / ((k − m ω²)² + (c ω)²)` (`amplitude_sq`). At
resonance `k = m ω_n²`, `ω = ω_n` this is `(m A)² / (c ω_n)²`. The electrical
damper dissipates `c_e ż²`; its average over one cycle is
`(1/2) c_e ω² (a² + b²)` (`mean_dissipation`, an integral over a period). With
`c_e = 2 m ω_n ζ_e`, `c_m = 2 m ω_n ζ_m` this is the Williams–Yates power.

Result for the report: the matched-load factor `1/16` is **not** different. Setting
`ζ_e = ζ_m` in the Williams–Yates form gives `1/16` exactly, and
`matched_is_max` proves `ζ_e = ζ_m` is the maximum over `ζ_e`.

Premises: linear spring–mass, electrical damping proportional to velocity,
sinusoidal base excitation, steady state (the transient has decayed),
resonant drive `ω = ω_n`. It is the mechanical power into the electrical
damper, not the power delivered to a circuit load after rectification.
`quarter_not_sixteenth` separates `1/4` for `1/16`.
-/

namespace PhysJS.HarvesterPower

open intervalIntegral

/-- Williams–Yates resonant power. -/
noncomputable def power (m ζe ζm A ωn : ℝ) : ℝ :=
  m * ζe * A ^ 2 / (4 * ωn * (ζe + ζm) ^ 2)

/-- The `cos` and `sin` coefficients of a steady-state response. The ODE
holds at every `t`; evaluate at `t = 0` and at `ω t = π / 2`. -/
theorem steady_state (z z1 z2 : ℝ → ℝ) (m c k A ω a b : ℝ) (hω : 0 < ω)
    (hz : ∀ t, z t = a * Real.cos (ω * t) + b * Real.sin (ω * t))
    (h1 : ∀ t, HasDerivAt z (z1 t) t) (h2 : ∀ t, HasDerivAt z1 (z2 t) t)
    (hode : ∀ t, m * z2 t + c * z1 t + k * z t = m * A * Real.cos (ω * t)) :
    (k - m * ω ^ 2) * a + c * ω * b = m * A ∧ (k - m * ω ^ 2) * b - c * ω * a = 0 := by
  have hzf : z = fun t => a * Real.cos (ω * t) + b * Real.sin (ω * t) := funext hz
  have hlin : ∀ t, HasDerivAt (fun s : ℝ => ω * s) ω t := fun t => by
    simpa using (hasDerivAt_id t).const_mul ω
  have hd1 : ∀ t, HasDerivAt z (ω * (-a * Real.sin (ω * t) + b * Real.cos (ω * t))) t := by
    intro t
    rw [hzf]
    have hc := (Real.hasDerivAt_cos (ω * t)).comp t (hlin t)
    have hs := (Real.hasDerivAt_sin (ω * t)).comp t (hlin t)
    exact ((hc.const_mul a).add (hs.const_mul b)).congr_deriv (by ring)
  have hz1 : ∀ t, z1 t = ω * (-a * Real.sin (ω * t) + b * Real.cos (ω * t)) :=
    fun t => (h1 t).unique (hd1 t)
  have hz1f : z1 = fun t => ω * (-a * Real.sin (ω * t) + b * Real.cos (ω * t)) := funext hz1
  have hd2 : ∀ t, HasDerivAt z1 (-ω ^ 2 * (a * Real.cos (ω * t) + b * Real.sin (ω * t))) t := by
    intro t
    rw [hz1f]
    have hc := (Real.hasDerivAt_cos (ω * t)).comp t (hlin t)
    have hs := (Real.hasDerivAt_sin (ω * t)).comp t (hlin t)
    have := (((hs.const_mul (-a)).add (hc.const_mul b))).const_mul ω
    exact this.congr_deriv (by ring)
  have hz2 : ∀ t, z2 t = -ω ^ 2 * (a * Real.cos (ω * t) + b * Real.sin (ω * t)) :=
    fun t => (h2 t).unique (hd2 t)
  constructor
  · have := hode 0
    rw [hz2, hz1, hz] at this
    simp at this
    linarith
  · have := hode (Real.pi / (2 * ω))
    have hx : ω * (Real.pi / (2 * ω)) = Real.pi / 2 := by field_simp
    rw [hz2, hz1, hz, hx] at this
    simp at this
    linarith

/-- Squared amplitude of the steady state. -/
theorem amplitude_sq (m c k A ω a b : ℝ) (hden : 0 < (k - m * ω ^ 2) ^ 2 + (c * ω) ^ 2)
    (e1 : (k - m * ω ^ 2) * a + c * ω * b = m * A) (e2 : (k - m * ω ^ 2) * b - c * ω * a = 0) :
    a ^ 2 + b ^ 2 = (m * A) ^ 2 / ((k - m * ω ^ 2) ^ 2 + (c * ω) ^ 2) := by
  rw [eq_div_iff hden.ne']
  have : (a ^ 2 + b ^ 2) * ((k - m * ω ^ 2) ^ 2 + (c * ω) ^ 2) =
      ((k - m * ω ^ 2) * a + c * ω * b) ^ 2 + ((k - m * ω ^ 2) * b - c * ω * a) ^ 2 := by ring
  rw [this, e1, e2]
  ring

/-- Integral of the squared velocity profile over one cycle. -/
theorem cycle_integral (a b : ℝ) :
    (∫ u in (0 : ℝ)..(2 * Real.pi), (-a * Real.sin u + b * Real.cos u) ^ 2) =
      Real.pi * (a ^ 2 + b ^ 2) := by
  have hexp : ∀ u : ℝ, (-a * Real.sin u + b * Real.cos u) ^ 2 =
      a ^ 2 * Real.sin u ^ 2 + b ^ 2 * Real.cos u ^ 2 - 2 * a * b * (Real.sin u * Real.cos u) := by
    intro u; ring
  simp_rw [hexp]
  have i1 : IntervalIntegrable (fun u : ℝ => a ^ 2 * Real.sin u ^ 2) MeasureTheory.volume 0
      (2 * Real.pi) := (by fun_prop : Continuous fun u : ℝ => a ^ 2 * Real.sin u ^ 2).intervalIntegrable _ _
  have i2 : IntervalIntegrable (fun u : ℝ => b ^ 2 * Real.cos u ^ 2) MeasureTheory.volume 0
      (2 * Real.pi) := (by fun_prop : Continuous fun u : ℝ => b ^ 2 * Real.cos u ^ 2).intervalIntegrable _ _
  have i3 : IntervalIntegrable (fun u : ℝ => 2 * a * b * (Real.sin u * Real.cos u))
      MeasureTheory.volume 0 (2 * Real.pi) :=
    (by fun_prop : Continuous fun u : ℝ => 2 * a * b * (Real.sin u * Real.cos u)).intervalIntegrable _ _
  rw [integral_sub (i1.add i2) i3, integral_add i1 i2, integral_const_mul, integral_const_mul,
    integral_const_mul, integral_sin_sq, integral_cos_sq, integral_sin_mul_cos₁]
  simp [Real.sin_two_pi, Real.cos_two_pi]
  ring

/-- Cycle average of `c_e ż²` for `ż = ω (−a sin ω t + b cos ω t)`. -/
theorem mean_dissipation (ce ω a b : ℝ) (hω : 0 < ω) :
    (1 / (2 * Real.pi / ω)) *
        (∫ t in (0 : ℝ)..(2 * Real.pi / ω),
          ce * (ω * (-a * Real.sin (ω * t) + b * Real.cos (ω * t))) ^ 2) =
      (1 / 2) * ce * ω ^ 2 * (a ^ 2 + b ^ 2) := by
  have hpt : ∀ t : ℝ, ce * (ω * (-a * Real.sin (ω * t) + b * Real.cos (ω * t))) ^ 2 =
      (ce * ω ^ 2) * (fun u : ℝ => (-a * Real.sin u + b * Real.cos u) ^ 2) (ω * t) := by
    intro t; simp only []; ring
  simp_rw [hpt]
  rw [integral_const_mul, integral_comp_mul_left (fun u : ℝ => (-a * Real.sin u + b * Real.cos u) ^ 2) hω.ne']
  have hup : ω * (2 * Real.pi / ω) = 2 * Real.pi := by field_simp
  rw [hup, mul_zero, cycle_integral]
  simp only [smul_eq_mul]
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp

/-- Williams–Yates power at resonance, from the steady state.

`hP` is the cycle-averaged dissipation in the electrical damper.

Kind `bridge` on `PhysJS.HarvesterPower.harvester_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not the
power into a rectified circuit load, and not off-resonance. -/
theorem harvester_eq (z z1 z2 : ℝ → ℝ) (m ζe ζm A ωn a b P : ℝ)
    (hm : 0 < m) (hζe : 0 < ζe) (hζm : 0 < ζm) (hωn : 0 < ωn)
    (hz : ∀ t, z t = a * Real.cos (ωn * t) + b * Real.sin (ωn * t))
    (h1 : ∀ t, HasDerivAt z (z1 t) t) (h2 : ∀ t, HasDerivAt z1 (z2 t) t)
    (hode : ∀ t, m * z2 t + (2 * m * ωn * ζe + 2 * m * ωn * ζm) * z1 t + (m * ωn ^ 2) * z t =
      m * A * Real.cos (ωn * t))
    (hP : P = (1 / (2 * Real.pi / ωn)) *
      (∫ t in (0 : ℝ)..(2 * Real.pi / ωn),
        (2 * m * ωn * ζe) * (z1 t) ^ 2)) :
    P = power m ζe ζm A ωn ∧ (ζe = ζm → P = m * A ^ 2 / (16 * ζm * ωn)) := by
  obtain ⟨e1, e2⟩ := steady_state z z1 z2 m (2 * m * ωn * ζe + 2 * m * ωn * ζm) (m * ωn ^ 2) A ωn a b hωn
    hz h1 h2 hode
  -- the velocity profile
  have hlin : ∀ t, HasDerivAt (fun s : ℝ => ωn * s) ωn t := fun t => by
    simpa using (hasDerivAt_id t).const_mul ωn
  have hzf : z = fun t => a * Real.cos (ωn * t) + b * Real.sin (ωn * t) := funext hz
  have hd1 : ∀ t, HasDerivAt z (ωn * (-a * Real.sin (ωn * t) + b * Real.cos (ωn * t))) t := by
    intro t
    rw [hzf]
    have hc := (Real.hasDerivAt_cos (ωn * t)).comp t (hlin t)
    have hs := (Real.hasDerivAt_sin (ωn * t)).comp t (hlin t)
    exact ((hc.const_mul a).add (hs.const_mul b)).congr_deriv (by ring)
  have hz1 : ∀ t, z1 t = ωn * (-a * Real.sin (ωn * t) + b * Real.cos (ωn * t)) :=
    fun t => (h1 t).unique (hd1 t)
  have hP2 : P = (1 / 2) * (2 * m * ωn * ζe) * ωn ^ 2 * (a ^ 2 + b ^ 2) := by
    rw [hP]
    simp_rw [hz1]
    exact mean_dissipation (2 * m * ωn * ζe) ωn a b hωn
  -- resonance: k - m ω² = 0
  have hres : m * ωn ^ 2 - m * ωn ^ 2 = 0 := sub_self _
  have e1' : (2 * m * ωn * ζe + 2 * m * ωn * ζm) * ωn * b = m * A := by
    simpa [hres] using e1
  have e2' : (2 * m * ωn * ζe + 2 * m * ωn * ζm) * ωn * a = 0 := by
    simpa [hres] using e2
  have hc : 0 < 2 * m * ωn * ζe + 2 * m * ωn * ζm := by positivity
  have ha : a = 0 := by
    rcases mul_eq_zero.mp e2' with h | h
    · exact absurd h (by positivity)
    · exact h
  have hb : b = m * A / ((2 * m * ωn * ζe + 2 * m * ωn * ζm) * ωn) := by
    rw [eq_div_iff (by positivity)]
    linarith
  have hpow : P = power m ζe ζm A ωn := by
    rw [hP2, ha, hb]
    unfold power
    have hs : ζe + ζm ≠ 0 := by positivity
    field_simp
    ring
  refine ⟨hpow, ?_⟩
  intro hζ
  rw [hpow]
  unfold power
  rw [hζ]
  field_simp
  ring

/-- The Williams–Yates form at `ζ_e = ζ_m` is `m A² / (16 ζ_m ω_n)`. -/
theorem matched_eq (m ζ A ωn : ℝ) (hζ : 0 < ζ) (hω : 0 < ωn) :
    power m ζ ζ A ωn = m * A ^ 2 / (16 * ζ * ωn) := by
  unfold power
  field_simp
  ring

/-- The matched load is the maximum over the electrical damping ratio. -/
theorem matched_is_max (m ζe ζm A ωn : ℝ) (hm : 0 < m) (hζe : 0 < ζe) (hζm : 0 < ζm)
    (hω : 0 < ωn) : power m ζe ζm A ωn ≤ power m ζm ζm A ωn := by
  unfold power
  have hs : 0 < ζe + ζm := by positivity
  have hs2 : 0 < 2 * ζm := by positivity
  rw [div_le_div_iff₀ (by positivity) (by positivity)]
  have hsq : 0 ≤ m * A ^ 2 * (4 * ωn) * (ζe - ζm) ^ 2 * ζm := by positivity
  nlinarith [hsq]

/-- `1/4` in place of `1/16` is a different matched power. -/
theorem quarter_not_sixteenth (m ζ A ωn : ℝ) (hm : m ≠ 0) (hA : A ≠ 0) (hζ : ζ ≠ 0)
    (hω : ωn ≠ 0) : m * A ^ 2 / (4 * ζ * ωn) ≠ m * A ^ 2 / (16 * ζ * ωn) := by
  intro h
  field_simp at h
  have hmA : m * A ^ 2 ≠ 0 := mul_ne_zero hm (pow_ne_zero 2 hA)
  have : (m * A ^ 2) * (ζ * ωn) = 0 := by linarith
  rcases mul_eq_zero.mp this with h1 | h1
  · exact hmA h1
  · exact mul_ne_zero hζ hω h1

end PhysJS.HarvesterPower
