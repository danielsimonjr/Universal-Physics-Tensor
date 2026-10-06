/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

open MeasureTheory

/-!
`be-160`. Bridge. Steady Fourier conduction across a slab.

The local law is `q = −k dT/dx` with `q` independent of `x`. Integrating
from `0` to `L` gives

```
q L = −k (T(L) − T(0))
```

`fourier_eq` is that integral. A temperature-dependent conductivity is
not this row.
-/

namespace PhysJS.FourierConduction

/-- Constant flux integrates to the slab drop.

`hflux` is `dT/dx = −q / k` at every point.

Kind `bridge` on `PhysJS.FourierConduction.fourier_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. -/
theorem fourier_eq (T : ℝ → ℝ) (q k L : ℝ) (hk : k ≠ 0)
    (hflux : ∀ x, HasDerivAt T (-q / k) x) :
    q * L = -k * (T L - T 0) := by
  have hderiv : ∀ x ∈ Set.uIcc (0 : ℝ) L, HasDerivAt T (-q / k) x :=
    fun x _ => hflux x
  have hint : IntervalIntegrable (fun _ : ℝ => -q / k) volume 0 L :=
    intervalIntegrable_const
  have hsub := intervalIntegral.integral_eq_sub_of_hasDerivAt hderiv hint
  have hdrop : T L - T 0 = (-q / k) * L := by
    rw [intervalIntegral.integral_const, sub_zero] at hsub
    exact hsub.symm.trans (mul_comm L (-q / k))
  have hmul : k * (T L - T 0) = -q * L := by
    rw [hdrop]
    field_simp [hk]
  linarith

end PhysJS.FourierConduction
