/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Sqrt
import Physlib.ClassicalMechanics.Pendulum.SimplePendulum.SmallAngle

/-!
`ab-pendulum-linear`. Bridge. Covers the transformation, not `bound.delta`.

Physlib proves that a smooth lift satisfies the linearized pendulum equation
`θ̈ + ω² θ = 0` if and only if it is the equation of motion of the associated
harmonic oscillator, whose mass is `m ℓ²` and whose spring constant is `m g ℓ`,
so `ω = √(g/ℓ)`. This module imports that theorem. It does not reprove it, and
it does not certify the period error `bound.delta`.
-/

namespace PhysJS.Pendulum

open ClassicalMechanics Real
open scoped ContDiff

/-- For a smooth lift of the angle, the linearized pendulum is the harmonic
oscillator `toHarmonicOscillator` (mass `m ℓ²`, spring constant `m g ℓ`).

Covers the transformation of `ab-pendulum-linear`, not `bound.delta`. -/
theorem linearizedEquationOfMotion_iff (S : SimplePendulum)
    (θ : Time → EuclideanSpace ℝ (Fin 1)) (hθ : ContDiff ℝ ∞ θ) :
    S.LinearizedEquationOfMotion θ ↔ S.toHarmonicOscillator.EquationOfMotion θ :=
  S.linearizedEquationOfMotion_iff θ hθ

/-- The associated oscillator has frequency `ω = √(g/ℓ)`. -/
theorem toHarmonicOscillator_ω (S : SimplePendulum) :
    S.toHarmonicOscillator.ω = S.ω :=
  S.toHarmonicOscillator_ω

/-- Dropping `ℓ` from the dictionary (mass `m`, spring `m g`) yields `√g`,
not `√(g/ℓ)`, whenever the length is not `1`. -/
theorem wrong_dictionary_drops_length (g ℓ : ℝ) (hg : 0 < g) (hℓ : 0 < ℓ) (hℓ1 : ℓ ≠ 1) :
    sqrt g ≠ sqrt (g / ℓ) := by
  intro h
  have hg0 : 0 ≤ g := hg.le
  have hdiv : 0 ≤ g / ℓ := div_nonneg hg.le hℓ.le
  have hsq : g = g / ℓ := by
    have := congrArg (· ^ 2) h
    simpa [sq_sqrt hg0, sq_sqrt hdiv] using this
  have : ℓ = 1 := by
    have hℓ0 : ℓ ≠ 0 := hℓ.ne'
    field_simp [hℓ0] at hsq
    nlinarith
  exact hℓ1 this

end PhysJS.Pendulum
