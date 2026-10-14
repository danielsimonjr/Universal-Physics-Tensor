/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.KelvinRelation
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-83`. Bridge. The first Thomson relation.

The catalog equation is

```
μ_T = T dS/dT
```

`thomson_eq` derives it from the Kelvin relation as a function of
temperature. `be-73`, `PhysJS.KelvinRelation.peltier_eq`, is `Π = S T` at
one temperature. Here that equality holds along the temperature axis:
`Π(t) = S(t) · t`. The entropy carried by the charge current is `S`. The
Thomson heat is what is left when the change in Peltier heat is charged
against that convected entropy,

```
μ_T = dΠ/dT − S
```

The product rule on `Π(t) = S(t) · t` gives `dΠ/dT = S + T dS/dT`, so
`μ_T = T dS/dT`. `slope_not_thomson` keeps `dΠ/dT` and drops the subtraction
of `S`. This is not a second copy of `Π = S T`.
-/

namespace PhysJS.Thomson

/-- First Thomson relation. `hkelvin` is `Π = S T` at every temperature,
the conclusion of `PhysJS.KelvinRelation.peltier_eq` read as a function.
`hμ` is the Thomson split of the Peltier slope.

Not
`PhysJS.KelvinRelation.peltier_eq` itself. -/
theorem thomson_eq (S Pel : ℝ → ℝ) (T μ S' dPel : ℝ)
    (hkelvin : ∀ t, Pel t = S t * t)
    (hS : HasDerivAt S S' T)
    (hPel : HasDerivAt Pel dPel T)
    (hμ : μ = dPel - S T) :
    μ = T * S' := by
  have hprod : HasDerivAt (fun t => S t * t) (S' * T + S T * 1) T :=
    hS.mul (hasDerivAt_id T)
  have hfun : (fun t => S t * t) = Pel := by
    ext t
    exact (hkelvin t).symm
  have hPel' : HasDerivAt Pel (S' * T + S T) T := by
    simpa [hfun, mul_one] using hprod
  have hderiv : dPel = S' * T + S T := by
    have hleft := hPel.deriv
    have hright := hPel'.deriv
    rw [hleft] at hright
    exact hright
  rw [hμ, hderiv]
  ring

/-- `dΠ/dT` still contains the convected `S`. It is not `μ_T`. -/
theorem slope_not_thomson (dPel S T μ : ℝ) (hμ : μ = dPel - S * T) (hS : S * T ≠ 0) :
    dPel ≠ μ := by
  intro hEq
  apply hS
  rw [hμ] at hEq
  linarith

end PhysJS.Thomson
