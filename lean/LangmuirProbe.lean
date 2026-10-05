/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-122`. Bridge. Langmuir probe: Bohm flux and floating potential.

Proved under these hypotheses. Ions are cold. A presheath drop
`e Δφ = k_B T_e / 2` and Boltzmann electrons give the sheath-edge
density `n_s = n₀ exp(−1/2)`. Ions cross the edge at the cold Bohm
speed `√(k_B T_e / m_i)`, so the ion flux is
`Γ_i = n₀ exp(−1/2) √(k_B T_e / m_i)`. Electrons at the wall are a
half-Maxwellian,
`Γ_e = n₀ exp(e Φ_w / k_B T_e) √(k_B T_e / (2 π m_e))`.
Floating means `Γ_i = Γ_e`, hence

```
e Φ_w / (k_B T_e) = (1/2) ln(2 π m_e / m_i) − 1/2
```

The numerical value for a particular mass ratio is not evaluated.
This is not Child–Langmuir.
-/

namespace PhysJS.LangmuirProbe

/-- Bohm ion flux after the presheath drop `e Δφ = k_B T_e / 2`. -/
theorem bohm_flux (Γ ns cs n0 kT mi e Δφ : ℝ)
    (he : e ≠ 0) (hk : kT ≠ 0) (hmi : 0 < mi) (hk0 : 0 ≤ kT)
    (hdrop : e * Δφ = kT / 2)
    (hns : ns = n0 * Real.exp (-e * Δφ / kT))
    (hcs : cs = Real.sqrt (kT / mi))
    (hΓ : Γ = ns * cs) :
    Γ = n0 * Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (kT / mi) := by
  have harg : -e * Δφ / kT = -(1 / 2 : ℝ) := by
    field_simp [hk] at hdrop ⊢
    linarith
  rw [hΓ, hns, hcs, harg]

/-- Floating potential from `Γ_i = Γ_e`.

`hion` is `bohm_flux`. `hele` is the half-Maxwellian electron flux. -/
theorem floating_potential (Γi Γe n0 e Φ kT me mi : ℝ)
    (hn : 0 < n0) (hk : 0 < kT) (hme : 0 < me) (hmi : 0 < mi)
    (hion : Γi = n0 * Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (kT / mi))
    (hele : Γe = n0 * Real.exp (e * Φ / kT) * Real.sqrt (kT / (2 * Real.pi * me)))
    (hfloat : Γi = Γe) :
    e * Φ / kT = (1 / 2) * Real.log (2 * Real.pi * me / mi) - 1 / 2 := by
  have hcancel : Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (kT / mi) =
      Real.exp (e * Φ / kT) * Real.sqrt (kT / (2 * Real.pi * me)) := by
    have h := hfloat
    rw [hion, hele] at h
    field_simp [hn.ne'] at h
    exact h
  have hposE : 0 < Real.sqrt (kT / (2 * Real.pi * me)) := by positivity
  have hratio : Real.sqrt (kT / mi) / Real.sqrt (kT / (2 * Real.pi * me)) =
      Real.sqrt (2 * Real.pi * me / mi) := by
    rw [← Real.sqrt_div (by positivity : (0 : ℝ) ≤ kT / mi)]
    congr 1
    field_simp [hk.ne', hmi.ne', hme.ne', Real.pi_ne_zero]
  have hexp : Real.exp (e * Φ / kT) =
      Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (2 * Real.pi * me / mi) := by
    have hdiv : Real.exp (e * Φ / kT) =
        Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (kT / mi) /
          Real.sqrt (kT / (2 * Real.pi * me)) := by
      rw [eq_div_iff hposE.ne']
      linarith
    calc
      Real.exp (e * Φ / kT) =
          Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (kT / mi) /
            Real.sqrt (kT / (2 * Real.pi * me)) := hdiv
      _ = Real.exp (-(1 / 2 : ℝ)) *
          (Real.sqrt (kT / mi) / Real.sqrt (kT / (2 * Real.pi * me))) := by ring
      _ = Real.exp (-(1 / 2 : ℝ)) * Real.sqrt (2 * Real.pi * me / mi) := by rw [hratio]
  have hposArg : 0 ≤ 2 * Real.pi * me / mi := by positivity
  have hlog := congrArg Real.log hexp
  rw [Real.log_exp,
    Real.log_mul (Real.exp_ne_zero _) ((Real.sqrt_pos.mpr (by positivity : (0 : ℝ) <
      2 * Real.pi * me / mi)).ne'),
    Real.log_exp, Real.log_sqrt hposArg] at hlog
  linarith

end PhysJS.LangmuirProbe
