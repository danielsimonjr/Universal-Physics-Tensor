/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Probability.Distributions.Gaussian.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import lean.CapacitorNoise

/-!
`be-177`. Bridge. Equipartition displacement of a harmonic spring.

The catalog equation is

```
⟨x²⟩ = k_B T / k
```

from one quadratic term of classical equipartition. `displacement_eq`
derives it, and it is the mechanical twin of `be-87`
(`PhysJS.CapacitorNoise`). The spring defines `dU/dx = k x` with
`U(0) = 0`, so `U = (k / 2) x²`. The canonical weight is
`exp(−U / (k_B T))`. Its integral is the Gaussian integral
`√(2π k_B T / k)`, and the normalized weight is `gaussianPDFReal` of mean
`0` and variance `k_B T / k`. Mathlib's variance of that law is the mean
square. The energy per mode is `(k / 2) ⟨x²⟩ = (1 / 2) k_B T`.

`calibration_eq` is the AFM use: `k = k_B T / ⟨x²⟩`.
`half_not_equipartition` separates `k_B T / (2 k)`, the value if the energy
half is dropped, and `three_halves_not_quadratic` the kinetic `(3/2) k_B T`.
Premises: harmonic, thermal equilibrium, classical (`ℏ ω ≪ k_B T`). This is
not the quantum zero-point variance.
-/

namespace PhysJS.EquipartitionDisplacement

open MeasureTheory ProbabilityTheory

/-- Mean-square thermal displacement of one spring mode.

`hU` is the spring law `dU/dx = k x`, `h0` is `U(0) = 0`.

Not the quantum variance, and not `(3/2) k_B T`. -/
theorem displacement_eq (U : ℝ → ℝ) (k kB T : ℝ) (hk : 0 < k) (hkB : 0 < kB) (hT : 0 < T)
    (hU : ∀ y, HasDerivAt U (k * y) y) (h0 : U 0 = 0) :
    (∀ x, U x = (k / 2) * x ^ 2) ∧
      (∫ x : ℝ, Real.exp (-((k / 2) * x ^ 2) / (kB * T))) =
        Real.sqrt (2 * Real.pi * (kB * T / k)) ∧
      (∀ x, Real.exp (-((k / 2) * x ^ 2) / (kB * T)) /
          Real.sqrt (2 * Real.pi * (kB * T / k)) =
        gaussianPDFReal (0 : ℝ) (Real.toNNReal (kB * T / k)) x) ∧
      (∫ x, x ^ 2 ∂gaussianReal (0 : ℝ) (Real.toNNReal (kB * T / k))) = kB * T / k ∧
      (k / 2) * (kB * T / k) = (1 / 2) * kB * T := by
  have hkT : 0 < kB * T := mul_pos hkB hT
  have hnoise := PhysJS.CapacitorNoise.noise_eq U k kB T hk hkB hT hU h0
  exact ⟨hnoise.1, PhysJS.CapacitorNoise.partition_function k kB T hk hkT,
    fun x => PhysJS.CapacitorNoise.boltzmann_is_gaussian k kB T x hk hkT,
    hnoise.2.1, hnoise.2.2⟩

/-- AFM thermal calibration: the stiffness from the measured mean square. -/
theorem calibration_eq (k kB T msq : ℝ) (hk : 0 < k) (hkB : 0 < kB) (hT : 0 < T)
    (hmsq : msq = kB * T / k) : k = kB * T / msq := by
  have hkT : 0 < kB * T := mul_pos hkB hT
  rw [hmsq]
  field_simp

/-- Dropping the energy half gives `k_B T / (2 k)`, which differs. -/
theorem half_not_equipartition (k kB T : ℝ) (hk : 0 < k) (hkT : 0 < kB * T) :
    kB * T / (2 * k) ≠ kB * T / k :=
  (PhysJS.CapacitorNoise.half_needed k kB T hk hkT).2

/-- Three kinetic halves over one spring is not the quadratic mode. -/
theorem three_halves_not_quadratic (k kB T : ℝ) (hk : k ≠ 0) (hkT : kB * T ≠ 0) :
    (3 / 2) * kB * T / k ≠ kB * T / k :=
  PhysJS.CapacitorNoise.three_halves_not_quadratic k kB T hk hkT

end PhysJS.EquipartitionDisplacement
