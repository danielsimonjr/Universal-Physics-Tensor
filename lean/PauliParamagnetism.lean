/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.FermiSea
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-94`. Bridge. Pauli paramagnetism.

The catalog equation is

```
χ_P = μ₀ μ_B² g(E_F) = μ₀ μ_B² (3 n) / (2 E_F)
```

`pauli` derives it. The Zeeman hypothesis, in linear response, is that the
two spin Fermi spheres differ by `g(E_F) μ_B B` carriers and the moment per
carrier is `μ_B`, so `M = μ_B² g(E_F) B`. Susceptibility is `μ₀ M / B`.
`g(E_F) = (3/2) n / E_F` is `PhysJS.FermiSea.dos_factor`, the integral of a
`√E` density. Both spins are already inside `g(E_F)`. A flat density leaves
the factor `1`, not `3/2`.
-/

namespace PhysJS.PauliParamagnetism

open Real

/-- Pauli susceptibility. `hM` is the Zeeman imbalance of the two spin
spheres. `hdos` is the parabolic density at the Fermi energy.

Kind `bridge` on `PhysJS.PauliParamagnetism.pauli`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not Landau
diamagnetism. -/
theorem pauli (χP μ0 μB gF n EF B M : ℝ) (hB : B ≠ 0) (hEF : EF ≠ 0)
    (hM : M = μB * (gF * μB * B))
    (hχ : χP = μ0 * M / B)
    (hdos : gF = (3 / 2) * n / EF) :
    χP = μ0 * μB ^ 2 * gF ∧ χP = μ0 * μB ^ 2 * (3 * n) / (2 * EF) := by
  have hlin : χP = μ0 * μB ^ 2 * gF := by
    rw [hχ, hM]
    field_simp [hB]
  refine ⟨hlin, ?_⟩
  rw [hlin, hdos]
  field_simp [hEF]

/-- The `√E` integral is the factor `3/2`. -/
theorem parabolic_dos (gF n EF : ℝ) (hEF : 0 < EF)
    (hcum : n = gF * ∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF)) :
    gF = (3 / 2) * n / EF :=
  (FermiSea.dos_factor gF n EF hEF hcum).2

/-- `g = n/E_F` is not `(3/2) n/E_F`. -/
theorem flat_not_sqrt (n EF : ℝ) (hn : n ≠ 0) (hEF : EF ≠ 0) :
    n / EF ≠ (3 / 2) * n / EF := by
  intro hEq
  field_simp [hEF] at hEq
  have : n = (3 / 2) * n := by linarith
  linarith

end PhysJS.PauliParamagnetism
