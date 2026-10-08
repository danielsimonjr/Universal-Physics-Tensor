/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-138`. Bridge. Built-in voltage of a p–n junction.

The catalog equation is

```
V_bi = (k_B T / e) ln(N_A N_D / n_i²)
```

`e` is the elementary charge. `builtin_voltage` derives it for complete
ionization and nondegenerate Boltzmann tails. On the n-side the majority
density is `N_D = n_i exp(e (φ_n − φ_i) / k_B T)`. On the p-side
`N_A = n_i exp(−e (φ_p − φ_i) / k_B T)`. The built-in voltage is
`φ_n − φ_p`. The product `n_p N_A = n_i²` is the conclusion of
`PhysJS.MassAction.mass_action` on the p-side and is an input here, not a
second proof of `be-99`. It rewrites the same logarithm as `ln(N_D / n_p)`.
`N_A`, `N_D`, and `n_i` are positive, and `k_B T ≠ 0`, `e ≠ 0`. A
capacitance–voltage profile is not this row.
-/

namespace PhysJS.BuiltinVoltage

open Real

/-- Built-in voltage.

`hn` and `hp` are the Boltzmann tails of the two majority densities measured
from the intrinsic potential. `hproduct` is `n_p N_A = n_i²`.

Not a
second proof of `be-99`, and not the ideal diode of `be-82`. -/
theorem builtin_voltage
    (Vbi φn φp φi NA ND ni np e kT : ℝ)
    (hkT : kT ≠ 0) (he : e ≠ 0) (hni : 0 < ni) (hNA : 0 < NA) (hND : 0 < ND)
    (hn : ND = ni * Real.exp (e * (φn - φi) / kT))
    (hp : NA = ni * Real.exp (-e * (φp - φi) / kT))
    (hV : Vbi = φn - φp)
    (hproduct : np * NA = ni ^ 2) :
    Vbi = (kT / e) * Real.log (NA * ND / ni ^ 2) ∧
      Vbi = (kT / e) * Real.log (ND / np) := by
  have hni0 : ni ≠ 0 := hni.ne'
  have hNA0 : NA ≠ 0 := hNA.ne'
  have hND0 : ND ≠ 0 := hND.ne'
  have hnp0 : np ≠ 0 := by
    have hprod : np * NA ≠ 0 := by
      rw [hproduct]
      exact pow_ne_zero 2 hni0
    exact left_ne_zero_of_mul hprod
  have hDn : ND / ni = Real.exp (e * (φn - φi) / kT) := by
    rw [hn]
    field_simp [hni0]
  have hAp : NA / ni = Real.exp (-e * (φp - φi) / kT) := by
    rw [hp]
    field_simp [hni0]
  have hlogn : Real.log (ND / ni) = e * (φn - φi) / kT := by
    rw [hDn, Real.log_exp]
  have hlogp : Real.log (NA / ni) = -e * (φp - φi) / kT := by
    rw [hAp, Real.log_exp]
  have hφn : φn - φi = (kT / e) * Real.log (ND / ni) := by
    have hmul := congrArg (fun z => z * kT) hlogn
    have hclear : e * (φn - φi) = kT * Real.log (ND / ni) := by
      field_simp [hkT] at hmul
      linarith
    field_simp [he, hkT] at hclear ⊢
    linarith
  have hφp : φi - φp = (kT / e) * Real.log (NA / ni) := by
    have hmul := congrArg (fun z => z * kT) hlogp
    have hclear : -e * (φp - φi) = kT * Real.log (NA / ni) := by
      field_simp [hkT] at hmul
      linarith
    have hflip : e * (φi - φp) = kT * Real.log (NA / ni) := by
      linarith
    field_simp [he, hkT] at hflip ⊢
    linarith
  have hsum : Real.log (ND / ni) + Real.log (NA / ni) =
      Real.log (NA * ND / ni ^ 2) := by
    rw [← Real.log_mul (div_pos hND hni).ne' (div_pos hNA hni).ne']
    congr 1
    field_simp [hni0]
  have hVbi : Vbi = (kT / e) * Real.log (NA * ND / ni ^ 2) := by
    rw [hV, show φn - φp = (φn - φi) + (φi - φp) by ring, hφn, hφp, ← hsum]
    ring
  refine ⟨hVbi, ?_⟩
  have hminor : ND / np = NA * ND / ni ^ 2 := by
    field_simp [hnp0, hni0]
    linarith
  rw [hVbi, hminor]

end PhysJS.BuiltinVoltage
