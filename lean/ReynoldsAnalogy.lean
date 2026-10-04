/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-86`. Bridge. Reynolds analogy at Prandtl number 1.

The catalog equation is

```
St = C_f / 2
```

when the turbulent Prandtl number is 1. `reynolds_eq` derives it. The wall
fluxes are `τ = μ du/dy` and `q = k dT/dy`. Skin friction and the Stanton
number use

```
C_f = τ / (ρ U² / 2)
St = h / (ρ U c_p)
h = q / ΔT
Pr = μ c_p / k
```

Equal momentum and heat diffusivities, with the same boundary data, put the
same normalized gradient on the wall: `(1/U) du/dy = (1/ΔT) dT/dy`. That
common slope is the hypothesis `hmatch`. The algebra is `St Pr = C_f / 2`.
At `Pr = 1` the `1/2` already present in `C_f` is the Reynolds analogy.
`prandtl_needed` keeps the same fluxes and drops `Pr = 1`.
-/

namespace PhysJS.ReynoldsAnalogy

/-- Equal wall slopes give `St Pr = C_f / 2`. The `1/2` is the skin-friction
normalization. -/
theorem stanton_friction
    (μ k ρ U ΔT cp slopeU slopeT τ q Cf heat St Pr : ℝ)
    (hμ : μ ≠ 0) (hk : k ≠ 0) (hρ : ρ ≠ 0) (hU : U ≠ 0) (hΔ : ΔT ≠ 0) (hcp : cp ≠ 0)
    (hτ : τ = μ * slopeU)
    (hq : q = k * slopeT)
    (hmatch : slopeU / U = slopeT / ΔT)
    (hCf : Cf = τ / (ρ * U ^ 2 / 2))
    (hheat : heat = q / ΔT)
    (hSt : St = heat / (ρ * U * cp))
    (hPr : Pr = μ * cp / k) :
    St * Pr = Cf / 2 := by
  have hslope : slopeT = slopeU * ΔT / U := by
    rw [div_eq_div_iff hU hΔ] at hmatch
    rw [eq_div_iff hU]
    linarith
  rw [hSt, hPr, hheat, hq, hCf, hτ, hslope]
  field_simp [hμ, hk, hρ, hU, hΔ, hcp]

/-- Reynolds analogy. `hmatch` is the shared wall gradient of a boundary
layer whose momentum and heat diffusivities agree.

Kind `bridge` on `PhysJS.ReynoldsAnalogy.reynolds_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
Nusselt correlation. -/
theorem reynolds_eq
    (μ k ρ U ΔT cp slopeU slopeT τ q Cf heat St Pr : ℝ)
    (hμ : μ ≠ 0) (hk : k ≠ 0) (hρ : ρ ≠ 0) (hU : U ≠ 0) (hΔ : ΔT ≠ 0) (hcp : cp ≠ 0)
    (hτ : τ = μ * slopeU)
    (hq : q = k * slopeT)
    (hmatch : slopeU / U = slopeT / ΔT)
    (hCf : Cf = τ / (ρ * U ^ 2 / 2))
    (hheat : heat = q / ΔT)
    (hSt : St = heat / (ρ * U * cp))
    (hPr : Pr = μ * cp / k)
    (hPr1 : Pr = 1) :
    St = Cf / 2 := by
  have hprod := stanton_friction μ k ρ U ΔT cp slopeU slopeT τ q Cf heat St Pr
    hμ hk hρ hU hΔ hcp hτ hq hmatch hCf hheat hSt hPr
  simpa [hPr1, mul_one] using hprod

/-- The same wall, with `Pr ≠ 1` and nonzero skin friction, is not
`St = C_f / 2`. -/
theorem prandtl_needed (St Cf Pr : ℝ) (h : St * Pr = Cf / 2) (hPr : Pr ≠ 1) (hCf : Cf ≠ 0) :
    St ≠ Cf / 2 := by
  intro hSt
  rw [hSt] at h
  have hdiff : (Cf / 2) * (Pr - 1) = 0 := by
    have hsub : (Cf / 2) * Pr - Cf / 2 = 0 := by linarith
    have hfac : (Cf / 2) * Pr - Cf / 2 = (Cf / 2) * (Pr - 1) := by ring
    rw [hfac] at hsub
    exact hsub
  have hhalf : Cf / 2 ≠ 0 := by
    intro hzero
    apply hCf
    linarith
  have : Pr - 1 = 0 := (mul_eq_zero.mp hdiff).resolve_left hhalf
  exact hPr (by linarith)

end PhysJS.ReynoldsAnalogy
