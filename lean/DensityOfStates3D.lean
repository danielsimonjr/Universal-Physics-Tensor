/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Pow.Deriv
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-135`. Bridge. Three-dimensional density of states, both spins.

The catalog equation, per volume per energy, is

```
g(E) = (1 / (2 π²)) (2 m / ℏ²)^{3/2} √E
```

`dos_3d` derives it. One isotropic parabola and the two-spin count of
`be-88`, `k³ = 3 π² n`, give the cumulative

```
n(E) = (1 / (3 π²)) (2 m E / ℏ²)^{3/2}
```

Differentiating `E^{3/2}` supplies the `3/2` that turns `1/(3 π²)` into
`1/(2 π²)`. One spin is half of that density. `m > 0` keeps the real power
on a positive base. A lattice potential is not this row.
-/

namespace PhysJS.DensityOfStates3D

open Real

/-- Two-spin cumulative for `E = ℏ² k² / (2 m)` and `k³ = 3 π² n`. -/
theorem cumulative (n k E m hbar : ℝ) (hk : 0 ≤ k) (hm : 0 < m) (hh : hbar ≠ 0)
    (hE : 0 ≤ E) (hcount : k ^ 3 = 3 * Real.pi ^ 2 * n)
    (hband : E = hbar ^ 2 * k ^ 2 / (2 * m)) :
    n = (1 / (3 * Real.pi ^ 2)) * (2 * m * E / hbar ^ 2) ^ ((3 : ℝ) / 2) := by
  have _ := hE
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hfac : (3 : ℝ) * Real.pi ^ 2 ≠ 0 :=
    mul_ne_zero (by norm_num) (pow_ne_zero 2 hπ)
  have hk2 : k ^ 2 = 2 * m * E / hbar ^ 2 := by
    have hclear : E * (2 * m) = hbar ^ 2 * k ^ 2 := by
      rw [hband]
      field_simp [hm.ne', hh]
    have hden : hbar ^ 2 ≠ 0 := pow_ne_zero 2 hh
    field_simp [hden, hm.ne'] at hclear ⊢
    linarith
  have hcube : (k ^ 2) ^ ((3 : ℝ) / 2) = k ^ 3 := by
    have hnat : k ^ 2 = k ^ (2 : ℝ) := (Real.rpow_natCast k 2).symm
    calc
      (k ^ 2) ^ ((3 : ℝ) / 2) = (k ^ (2 : ℝ)) ^ ((3 : ℝ) / 2) := by rw [hnat]
      _ = k ^ ((2 : ℝ) * ((3 : ℝ) / 2)) := (Real.rpow_mul hk (2 : ℝ) ((3 : ℝ) / 2)).symm
      _ = k ^ (3 : ℝ) := by
        congr 1
        norm_num
      _ = k ^ 3 := Real.rpow_natCast k 3
  have hpow : k ^ 3 = (2 * m * E / hbar ^ 2) ^ ((3 : ℝ) / 2) := by
    rw [← hcube, hk2]
  rw [hpow] at hcount
  have hn : n * (3 * Real.pi ^ 2) = (2 * m * E / hbar ^ 2) ^ ((3 : ℝ) / 2) := by
    linarith
  field_simp [hfac] at hn ⊢
  linarith

/-- `E^{3/2}` differentiates to `(3/2) √E`, and `3/2` over `3 π²` is `1/(2 π²)`. -/
theorem hasDerivAt_cumulative (m hbar E : ℝ) (hm : 0 < m) (hh : hbar ≠ 0) :
    HasDerivAt (fun t =>
        (1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * t ^ ((3 : ℝ) / 2))
      ((1 / (2 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E) E := by
  have _ := hm
  have _ := hh
  have hone : (1 : ℝ) ≤ (3 : ℝ) / 2 := by norm_num
  have hpow := hasDerivAt_rpow_const (x := E) (p := (3 : ℝ) / 2) (Or.inr hone)
  have hC : HasDerivAt
      (fun t =>
        ((1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2)) * t ^ ((3 : ℝ) / 2))
      (((1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2)) *
        ((3 / 2) * E ^ ((3 : ℝ) / 2 - 1))) E :=
    hpow.const_mul _
  have hsub : (3 : ℝ) / 2 - 1 = 1 / 2 := by norm_num
  have hsqrt : E ^ ((1 : ℝ) / 2) = Real.sqrt E := (Real.sqrt_eq_rpow E).symm
  have hcoef : (1 / (3 * Real.pi ^ 2)) * (3 / 2) = 1 / (2 * Real.pi ^ 2) := by
    field_simp
  convert hC using 1
  rw [hsub, hsqrt]
  calc
    (1 / (2 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E
        = ((1 / (3 * Real.pi ^ 2)) * (3 / 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) *
            Real.sqrt E := by rw [hcoef]
    _ = (1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) *
          ((3 / 2) * Real.sqrt E) := by ring

/-- The cumulative and its derivative agree with `(3/2) n / E`. -/
theorem dos_factor (g n E C : ℝ) (hE : 0 < E)
    (hn : n = (1 / (3 * Real.pi ^ 2)) * C * E ^ ((3 : ℝ) / 2))
    (hg : g = (1 / (2 * Real.pi ^ 2)) * C * Real.sqrt E) :
    g = (3 / 2) * n / E := by
  rw [hg, hn, Real.sqrt_eq_rpow]
  have hpow : E ^ ((3 : ℝ) / 2) = E * E ^ ((1 : ℝ) / 2) := by
    rw [show (3 : ℝ) / 2 = 1 + (1 : ℝ) / 2 by norm_num, Real.rpow_add hE, Real.rpow_one]
  rw [hpow]
  field_simp [hE.ne']

/-- Three-dimensional density of states.

`hcount` is the two-spin sphere, the same integer as `be-88`. `hband` is
one isotropic parabola. `m > 0`, `ℏ ≠ 0`, and `E > 0`.

Kind `bridge` on `PhysJS.DensityOfStates3D.dos_3d`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not one spin. -/
theorem dos_3d (g n k E m hbar : ℝ) (hk : 0 ≤ k) (hm : 0 < m) (hh : hbar ≠ 0)
    (hE : 0 < E) (hcount : k ^ 3 = 3 * Real.pi ^ 2 * n)
    (hband : E = hbar ^ 2 * k ^ 2 / (2 * m))
    (hg : g = (1 / (2 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E) :
    n = (1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * E ^ ((3 : ℝ) / 2) ∧
      g = (3 / 2) * n / E ∧
      HasDerivAt (fun t =>
          (1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * t ^ ((3 : ℝ) / 2))
        g E := by
  have hcum := cumulative n k E m hbar hk hm hh hE.le hcount hband
  have hbase : 0 ≤ 2 * m / hbar ^ 2 := by positivity
  have hsplit : (2 * m * E / hbar ^ 2) ^ ((3 : ℝ) / 2) =
      (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * E ^ ((3 : ℝ) / 2) := by
    have hprod : 2 * m * E / hbar ^ 2 = (2 * m / hbar ^ 2) * E := by
      field_simp [hh]
    rw [hprod, Real.mul_rpow hbase hE.le]
  have hn : n = (1 / (3 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) *
      E ^ ((3 : ℝ) / 2) := by
    rw [hcum, hsplit]
    ring
  have hderiv := hasDerivAt_cumulative m hbar E hm hh
  have hg' : g = (3 / 2) * n / E :=
    dos_factor g n E ((2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2)) hE hn hg
  refine ⟨hn, hg', ?_⟩
  rw [hg]
  exact hderiv

/-- One spin replaces `1/(2 π²)` by `1/(4 π²)`. -/
theorem one_spin_not_two (m hbar E : ℝ) (hm : 0 < m) (hh : hbar ≠ 0) (hE : 0 < E) :
    (1 / (4 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E ≠
      (1 / (2 * Real.pi ^ 2)) * (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E := by
  intro hEq
  have hpos : 0 < (2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E := by
    have hbase : 0 < 2 * m / hbar ^ 2 := by positivity
    exact mul_pos (Real.rpow_pos_of_pos hbase _) (Real.sqrt_pos.mpr hE)
  have hEq' :
      (1 / (4 * Real.pi ^ 2)) * ((2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E) =
        (1 / (2 * Real.pi ^ 2)) * ((2 * m / hbar ^ 2) ^ ((3 : ℝ) / 2) * Real.sqrt E) := by
    simpa [mul_assoc] using hEq
  have hcoef : (1 : ℝ) / (4 * Real.pi ^ 2) = 1 / (2 * Real.pi ^ 2) :=
    mul_right_cancel₀ hpos.ne' hEq'
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp [hπ] at hcoef
  norm_num at hcoef

end PhysJS.DensityOfStates3D
