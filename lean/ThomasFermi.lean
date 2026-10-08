/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.FermiSea
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-137`. Bridge. Thomas–Fermi screening wavevector.

The catalog equation is

```
k_TF² = e² g(E_F) / ε0 = (e² / ε0) (3 n) / (2 E_F)
```

`e` is the elementary charge and `g(E_F)` counts both spins. `thomas_fermi`
derives both writings. The decaying profile `φ = φ0 exp(−k x)` has second
derivative `k² φ`. Linear response puts the excess electron density at
`δn = g(E_F) e φ`, and Poisson's equation is `φ'' = e δn / ε0`, so
`φ'' = e² g(E_F) φ / ε0`. Matching at one depth where `φ ≠ 0` fixes `k²`.
`g(E_F) = (3/2) n / E_F` is `PhysJS.FermiSea.dos_factor`, the integral of a
`√E` density, not a second proof of the prefactor in `be-135`. A flat
density leaves the factor `1`. The classical Debye temperature is not this
row.
-/

namespace PhysJS.ThomasFermi

open Real

/-- Decaying electrostatic potential. -/
noncomputable def screened (φ0 k x : ℝ) : ℝ :=
  φ0 * Real.exp (-k * x)

theorem hasDerivAt_screened (φ0 k x : ℝ) :
    HasDerivAt (fun y => screened φ0 k y) (-k * screened φ0 k x) x := by
  unfold screened
  have hlin : HasDerivAt (fun y => -k * y) (-k) x := by
    simpa using (hasDerivAt_id x).const_mul (-k)
  convert hlin.exp.const_mul φ0 using 1
  ring

theorem deriv_screened (φ0 k y : ℝ) :
    deriv (fun z => screened φ0 k z) y = -k * screened φ0 k y :=
  (hasDerivAt_screened φ0 k y).deriv

theorem hasDerivAt_slope (φ0 k x : ℝ) :
    HasDerivAt (fun y => -k * screened φ0 k y) (k ^ 2 * screened φ0 k x) x := by
  convert (hasDerivAt_screened φ0 k x).const_mul (-k) using 1
  ring

/-- Poisson plus the linear density response fix `k²`.

`hresponse` is `δn = g(E_F) e φ` at `x`. `hPoisson` is `φ'' = e δn / ε0`
at that depth. `φ0 ≠ 0` keeps the profile from vanishing. -/
theorem wavevector_squared
    (φ0 k e eps gF δn x : ℝ) (he : e ≠ 0) (heps : eps ≠ 0) (hφ : φ0 ≠ 0)
    (hresponse : δn = gF * e * screened φ0 k x)
    (hPoisson : HasDerivAt (fun y => deriv (fun z => screened φ0 k z) y)
      (e * δn / eps) x) :
    k ^ 2 = e ^ 2 * gF / eps := by
  have _ := he
  have hfun : (fun y => deriv (fun z => screened φ0 k z) y) =
      fun y => -k * screened φ0 k y := by
    ext y
    exact deriv_screened φ0 k y
  rw [hfun] at hPoisson
  have huniq : e * δn / eps = k ^ 2 * screened φ0 k x :=
    hPoisson.unique (hasDerivAt_slope φ0 k x)
  rw [hresponse] at huniq
  have hne : screened φ0 k x ≠ 0 := by
    unfold screened
    exact mul_ne_zero hφ (Real.exp_ne_zero _)
  field_simp [heps, hne] at huniq
  field_simp [heps]
  linarith

/-- Thomas–Fermi wavevector.

`hcum` is the parabolic cumulative whose value is
`PhysJS.FermiSea.dos_factor`. `e` is the elementary charge.

Not the
prefactor of `be-135`, and not a classical Debye length. -/
theorem thomas_fermi
    (k e eps gF n EF δn φ0 x : ℝ) (he : e ≠ 0) (heps : eps ≠ 0) (hφ : φ0 ≠ 0)
    (hEF : 0 < EF)
    (hcum : n = gF * ∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF))
    (hresponse : δn = gF * e * screened φ0 k x)
    (hPoisson : HasDerivAt (fun y => deriv (fun z => screened φ0 k z) y)
      (e * δn / eps) x) :
    k ^ 2 = e ^ 2 * gF / eps ∧ k ^ 2 = e ^ 2 * (3 * n) / (2 * eps * EF) := by
  have hsq := wavevector_squared φ0 k e eps gF δn x he heps hφ hresponse hPoisson
  have hdos := (FermiSea.dos_factor gF n EF hEF hcum).2
  refine ⟨hsq, ?_⟩
  rw [hsq, hdos]
  field_simp [heps, hEF.ne']

/-- `g = n / E_F` is not the parabolic factor `(3/2) n / E_F`. -/
theorem flat_not_parabolic (n EF : ℝ) (hn : n ≠ 0) (hEF : EF ≠ 0) :
    n / EF ≠ (3 / 2) * n / EF := by
  intro hEq
  field_simp [hEF] at hEq
  linarith

end PhysJS.ThomasFermi
