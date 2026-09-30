/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Sqrt
import Physlib.ClassicalMechanics.Pendulum.SimplePendulum.SmallAngle

/-!
Smoke module for the lake project.

Importing `Mathlib` and `Physlib` here is the build-time check that both
direct requires resolve. Milestone 1 replaces this file with the bridge lemmas.
-/

namespace PhysJS

/-- `Mathlib.Data.Real.Sqrt` is on the import path. -/
theorem sqrt_zero : Real.sqrt 0 = 0 := Real.sqrt_zero

/-- `Physlib.ClassicalMechanics.Pendulum.SimplePendulum.SmallAngle` is on the import path. -/
theorem physlib_pendulum_import (S : ClassicalMechanics.SimplePendulum) :
    S.toHarmonicOscillator.m = S.inertia :=
  S.toHarmonicOscillator_m

end PhysJS
