/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.FermiSea
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-92`. Bridge. Sommerfeld electronic heat capacity, from the energy correction.

The catalog equation, per volume, is

```
c_V = (π² / 2) n k_B² T / E_F
```

and, with `g(E_F) = (3/2) n / E_F`,

```
c_V = (π² / 3) k_B² T g(E_F)
```

`electronic_heat` derives the second writing's parabolic form from the first
identification. The Sommerfeld expansion that puts

```
δU = (π² / 6) (k_B T)² g(E_F)
```

into the internal energy is a hypothesis. `PhysJS.Sommerfeld.integral_eq` is
the integral `π²/3` behind that coefficient; this file does not prove it again.
Differentiating `T²` supplies the `2` that turns `π²/6` into `π²/3`.
`PhysJS.FermiSea.dos_factor` is `g(E_F) = (3/2) n / E_F` for `g(E) ∝ √E`.
A flat density `g = n / E_F` leaves `π²/3`, not `π²/2`. The transport step
from the same integral to the Lorenz number is not this row.
-/

namespace PhysJS.SommerfeldHeat

open Real

/-- `∂/∂T` of `(π²/6) (k_B T)² g` is `(π²/3) k_B² T g`. -/
theorem heat_from_energy (c g kB T : ℝ)
    (hc : c = (Real.pi ^ 2 / 3) * kB ^ 2 * T * g) :
    c = 2 * ((Real.pi ^ 2 / 6) * kB ^ 2 * T * g) ∧
      c = (Real.pi ^ 2 / 3) * kB ^ 2 * T * g := by
  refine ⟨?_, hc⟩
  rw [hc]
  ring

/-- Parabolic rewriting. `hcorr` is the Sommerfeld energy correction's
temperature derivative, `c_V = (π²/3) k_B² T g(E_F)`. `hdos` is the parabola.

Not the
Wiedemann–Franz law. -/
theorem electronic_heat (c n EF g kB T : ℝ) (hEF : EF ≠ 0)
    (hcorr : c = (Real.pi ^ 2 / 3) * kB ^ 2 * T * g)
    (hdos : g = (3 / 2) * n / EF) :
    c = (Real.pi ^ 2 / 2) * n * kB ^ 2 * T / EF ∧
      c = (Real.pi ^ 2 / 3) * kB ^ 2 * T * g := by
  refine ⟨?_, hcorr⟩
  rw [hcorr, hdos]
  field_simp [hEF]

/-- The cumulative `√E` density is `PhysJS.FermiSea.dos_factor`. -/
theorem parabolic_dos (gF n EF : ℝ) (hEF : 0 < EF)
    (hcum : n = gF * ∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF)) :
    gF = (3 / 2) * n / EF :=
  (FermiSea.dos_factor gF n EF hEF hcum).2

/-- A flat density `g = n/E_F` is not the parabolic heat capacity. -/
theorem flat_not_parabolic (n EF kB T : ℝ) (hn : n ≠ 0) (hEF : EF ≠ 0) (hk : kB ≠ 0)
    (hT : T ≠ 0) :
    (Real.pi ^ 2 / 3) * n * kB ^ 2 * T / EF ≠
      (Real.pi ^ 2 / 2) * n * kB ^ 2 * T / EF := by
  intro hEq
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hden : EF ≠ 0 := hEF
  have hscale : (Real.pi ^ 2 / 3) * (n * kB ^ 2 * T) =
      (Real.pi ^ 2 / 2) * (n * kB ^ 2 * T) := by
    field_simp [hden] at hEq
    linarith
  have hfac : n * kB ^ 2 * T ≠ 0 :=
    mul_ne_zero (mul_ne_zero hn (pow_ne_zero 2 hk)) hT
  have hπ2 : Real.pi ^ 2 ≠ 0 := pow_ne_zero 2 hπ
  have : (1 : ℝ) / 3 = 1 / 2 := by
    apply mul_left_cancel₀ (mul_ne_zero hπ2 hfac)
    calc
      Real.pi ^ 2 * (n * kB ^ 2 * T) * (1 / 3)
          = (Real.pi ^ 2 / 3) * (n * kB ^ 2 * T) := by ring
      _ = (Real.pi ^ 2 / 2) * (n * kB ^ 2 * T) := hscale
      _ = Real.pi ^ 2 * (n * kB ^ 2 * T) * (1 / 2) := by ring
  norm_num at this

end PhysJS.SommerfeldHeat
