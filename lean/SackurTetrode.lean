/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.ThermalDeBroglie
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-167`. Bridge. The Sackur–Tetrode entropy.

The catalog equation is

```
S = N k_B (ln(n_Q / n) + 5/2)
```

with `n_Q = (2 π m k_B T / h²)^{3/2}`. `sackur_tetrode` takes that thermal
concentration from `PhysJS.ThermalDeBroglie.wavelength_eq`: `n_Q = λ_T^{−3}`
and the two writings of `λ_T` agree. The Stirling step
`ln N! = N ln N − N` is a hypothesis, not the series for `ln N!`. The
energy `U = (3/2) N k_B T` is the ideal-gas equipartition hypothesis.
-/

namespace PhysJS.SackurTetrode

open Real

/-- Ideal-gas entropy from the thermal wavelength of `be-12`.

`hZ` uses the Stirling hypothesis `ln N! = N ln N − N` inside `ln Z`.
`hλ` is `PhysJS.ThermalDeBroglie.wavelength`, and the proof rewrites it
with `wavelength_eq`.

Not a
second proof of `be-12`. -/
theorem sackur_tetrode (S N kB nQ n V lam m ℏ hpl T U F Z : ℝ)
    (hm : 0 < m) (hkB : 0 < kB) (hT : 0 < T) (hℏ : 0 < ℏ) (hN : 0 < N) (hV : 0 < V)
    (hnQpos : 0 < nQ) (hh : hpl = 2 * π * ℏ)
    (hlam : lam = PhysJS.ThermalDeBroglie.wavelength ℏ m kB T)
    (hnQ : nQ = lam⁻¹ ^ 3)
    (hn : n = N / V)
    (hZ : Real.log Z = N * Real.log (V * nQ) - (N * Real.log N - N))
    (hF : F = -kB * T * Real.log Z)
    (hU : U = (3 / 2) * N * kB * T)
    (hS : S = (U - F) / T) :
    S = N * kB * (Real.log (nQ / n) + 5 / 2) ∧
      lam = PhysJS.ThermalDeBroglie.wavelengthH hpl m kB T := by
  have hwave :=
    PhysJS.ThermalDeBroglie.wavelength_eq ℏ hpl m kB T hm hkB hT hℏ hh
  have hlamH : lam = PhysJS.ThermalDeBroglie.wavelengthH hpl m kB T := hlam.trans hwave
  have hln : Real.log (V * nQ) - Real.log N = Real.log (nQ / n) := by
    have hVn : V * nQ ≠ 0 := mul_ne_zero hV.ne' hnQpos.ne'
    rw [← Real.log_div hVn hN.ne']
    congr 1
    rw [hn]
    field_simp [hV.ne']
  have hlogZ : Real.log Z = N * (Real.log (nQ / n) + 1) := by
    rw [hZ]
    have hlin : N * Real.log (V * nQ) - (N * Real.log N - N) =
        N * (Real.log (V * nQ) - Real.log N + 1) := by ring
    rw [hlin, hln]
  have hent : S = N * kB * (Real.log (nQ / n) + 5 / 2) := by
    rw [hS, hU, hF, hlogZ]
    field_simp [hT.ne']
    ring
  exact ⟨hent, hlamH⟩

end PhysJS.SackurTetrode
