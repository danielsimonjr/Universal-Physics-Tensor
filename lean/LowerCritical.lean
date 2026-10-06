/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-142`. Bridge. Lower critical field of a London vortex.

The catalog equation is

```
B_c1 = (Φ₀ / (4 π λ²)) ln(λ / ξ),    Φ₀ = h / (2 e)
```

`e` is the elementary charge. `lower_critical` derives the prefactor from
the London line energy. On the annulus `ξ ≤ r ≤ λ` the fluxoid approximation
is the hypothesis

```
j(r) = Φ₀ / (2 π μ0 λ² r)
```

cutting the core at `ξ` and the screening cloud at `λ`. The kinetic energy
density is `μ0 λ² j² / 2`. Its integral is proved and equals
`(Φ₀² / (4 π μ0 λ²)) ln(λ / ξ)`. The thermodynamic definition
`B_c1 = μ0 ε / Φ₀` converts that energy per length into the induction; in
vacuum `B = μ0 H` and `H_c1 = ε / Φ₀`. An additive constant under the
logarithm is a different core energy and does not change
`Φ₀ / (4 π λ²)`. `0 < ξ < λ`, `μ0 ≠ 0`, and `Φ₀ ≠ 0`. The upper critical
field of `be-96` is not this row.
-/

namespace PhysJS.LowerCritical

open Real intervalIntegral MeasureTheory Set

/-- London line energy between the core cutoff `ξ` and `λ`. -/
theorem line_energy (Φ0 μ0 lam xi : ℝ) (hxi : 0 < xi) (hlam : xi < lam) (hμ : μ0 ≠ 0)
    (hΦ : Φ0 ≠ 0) :
    (∫ r in xi..lam,
        (μ0 * lam ^ 2 / 2) * (Φ0 / (2 * Real.pi * μ0 * lam ^ 2 * r)) ^ 2 *
          (2 * Real.pi * r)) =
      (Φ0 ^ 2 / (4 * Real.pi * μ0 * lam ^ 2)) * Real.log (lam / xi) := by
  have hpos : 0 < lam := lt_trans hxi hlam
  have hlam0 : lam ≠ 0 := hpos.ne'
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hpoint : ∀ r ∈ Set.uIcc xi lam,
      (μ0 * lam ^ 2 / 2) * (Φ0 / (2 * Real.pi * μ0 * lam ^ 2 * r)) ^ 2 * (2 * Real.pi * r) =
        (Φ0 ^ 2 / (4 * Real.pi * μ0 * lam ^ 2)) / r := by
    intro r hr
    rw [Set.uIcc_of_le hlam.le] at hr
    have hr0 : r ≠ 0 := (lt_of_lt_of_le hxi hr.1).ne'
    field_simp [hr0, hμ, hlam0, hπ, hΦ]
    ring
  rw [intervalIntegral.integral_congr hpoint]
  rw [intervalIntegral.integral_congr fun r _ =>
      div_eq_mul_one_div (Φ0 ^ 2 / (4 * Real.pi * μ0 * lam ^ 2)) r,
    intervalIntegral.integral_const_mul, integral_one_div_of_pos hxi hpos]

/-- Lower critical field.

`henergy` evaluates the London integral on `ξ ≤ r ≤ λ`; those limits are the
core cutoff. `hB` is `B_c1 = μ0 ε / Φ₀`. `hflux` is `Φ₀ = h / (2 e)`.

Kind `bridge` on `PhysJS.LowerCritical.lower_critical`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not
`be-96`. -/
theorem lower_critical
    (Bc1 eps Φ0 h e μ0 lam xi : ℝ)
    (hxi : 0 < xi) (hlam : xi < lam) (hμ : μ0 ≠ 0) (hΦ : Φ0 ≠ 0) (_he : e ≠ 0)
    (henergy : eps = ∫ r in xi..lam,
        (μ0 * lam ^ 2 / 2) * (Φ0 / (2 * Real.pi * μ0 * lam ^ 2 * r)) ^ 2 *
          (2 * Real.pi * r))
    (hB : Bc1 = μ0 * eps / Φ0)
    (hflux : Φ0 = h / (2 * e)) :
    Bc1 = (Φ0 / (4 * Real.pi * lam ^ 2)) * Real.log (lam / xi) ∧ Φ0 = h / (2 * e) := by
  have hval := line_energy Φ0 μ0 lam xi hxi hlam hμ hΦ
  have hlampos : 0 < lam := lt_trans hxi hlam
  refine ⟨?_, hflux⟩
  rw [hB, henergy, hval]
  field_simp [hμ, hΦ, hlampos.ne']

/-- An additive core constant changes the logarithm and not the prefactor. -/
theorem core_constant (pre logC C : ℝ) (hC : C ≠ 0) (hpre : pre ≠ 0) :
    pre * (logC + C) ≠ pre * logC := by
  intro hEq
  have hdiff : pre * C = 0 := by linarith
  exact mul_ne_zero hpre hC hdiff

end PhysJS.LowerCritical
