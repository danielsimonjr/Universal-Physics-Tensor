/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-88`. Bridge. Parabolic band and the spin-1/2 Fermi sea.

The catalog equations are

```
k_F = (3 π² n)^{1/3}
E_F = ℏ² k_F² / (2 m*)
v_F = ℏ k_F / m*
```

`fermi_sea` derives them. One isotropic minimum has `E(k) = ℏ² k² / (2 m*)`.
Its slope is the group velocity `v = (1/ℏ) dE/dk`, and the second derivative
is the effective mass, `1/m* = ℏ⁻² ∂²E/∂k²`. A periodic box puts one orbital
in each cell of volume `(2π)³`. Two spin states fill a sphere, so

```
n = 2 · (4π/3) k_F³ / (2π)³
```

That count is `k_F³ = 3 π² n`. One spin is a different sphere. The band,
the two-spin count, and `T = 0` are hypotheses. A lattice potential is not
this row.
-/

namespace PhysJS.FermiSea

open Real intervalIntegral Set

/-- Two spins times the sphere. Clearing `(2π)³` leaves `k_F³ = 3 π² n`. -/
theorem state_count (kF n : ℝ)
    (hcount : n = 2 * ((4 / 3) * Real.pi * kF ^ 3) / (2 * Real.pi) ^ 3) :
    kF ^ 3 = 3 * Real.pi ^ 2 * n := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hden : (2 * Real.pi) ^ 3 ≠ 0 := pow_ne_zero 3 (mul_ne_zero (by norm_num) hπ)
  have hclear : n * (2 * Real.pi) ^ 3 = 2 * ((4 / 3) * Real.pi * kF ^ 3) := by
    rw [hcount]
    field_simp [hden]
  have hpow : (2 * Real.pi) ^ 3 = 8 * Real.pi ^ 3 := by ring
  rw [hpow] at hclear
  have hrhs : 2 * ((4 / 3) * Real.pi * kF ^ 3) = (8 / 3) * Real.pi * kF ^ 3 := by ring
  rw [hrhs] at hclear
  have h8π : (8 : ℝ) * Real.pi ≠ 0 := mul_ne_zero (by norm_num) hπ
  apply mul_left_cancel₀ h8π
  calc
    (8 * Real.pi) * kF ^ 3 = n * (24 * Real.pi ^ 3) := by
      have h3 : n * (8 * Real.pi ^ 3) * 3 = (8 / 3) * Real.pi * kF ^ 3 * 3 :=
        congrArg (fun z => z * 3) hclear
      have hleft : n * (8 * Real.pi ^ 3) * 3 = n * (24 * Real.pi ^ 3) := by ring
      have hright : (8 / 3) * Real.pi * kF ^ 3 * 3 = (8 * Real.pi) * kF ^ 3 := by ring
      linarith
    _ = (8 * Real.pi) * (3 * Real.pi ^ 2 * n) := by ring

/-- The nonnegative root of that cube. -/
theorem wavevector_root (kF n : ℝ) (hk : 0 ≤ kF)
    (hcube : kF ^ 3 = 3 * Real.pi ^ 2 * n) :
    kF = (3 * Real.pi ^ 2 * n) ^ ((1 : ℝ) / 3) := by
  have hroot : (kF ^ 3) ^ ((3 : ℕ)⁻¹ : ℝ) = kF :=
    Real.pow_rpow_inv_natCast hk (by decide : (3 : ℕ) ≠ 0)
  have hexp : ((3 : ℕ)⁻¹ : ℝ) = (1 : ℝ) / 3 := by norm_num
  rw [← hroot, ← hcube, hexp]

/-- One spin replaces `3 π²` by `6 π²`. -/
theorem one_spin_not_two (kF n : ℝ) (hn : n ≠ 0)
    (hcount : n = 1 * ((4 / 3) * Real.pi * kF ^ 3) / (2 * Real.pi) ^ 3) :
    kF ^ 3 ≠ 3 * Real.pi ^ 2 * n := by
  have hden : (2 * Real.pi) ^ 3 ≠ 0 :=
    pow_ne_zero 3 (mul_ne_zero (by norm_num) Real.pi_ne_zero)
  have htwo : 2 * n = 2 * ((4 / 3) * Real.pi * kF ^ 3) / (2 * Real.pi) ^ 3 := by
    rw [hcount, one_mul]
    field_simp [hden]
  have hcube := state_count kF (2 * n) htwo
  intro hEq
  have hfac : (3 : ℝ) * Real.pi ^ 2 ≠ 0 :=
    mul_ne_zero (by norm_num) (pow_ne_zero 2 Real.pi_ne_zero)
  have htwice : n = 2 * n := by
    apply mul_left_cancel₀ hfac
    calc
      (3 * Real.pi ^ 2) * n = kF ^ 3 := hEq.symm
      _ = (3 * Real.pi ^ 2) * (2 * n) := hcube
  have hsub : n - 2 * n = 0 := sub_eq_zero.mpr htwice
  have hneg : -n = 0 := by
    convert hsub using 1
    ring
  exact hn (neg_eq_zero.mp hneg)

/-- Parabolic dispersion. `m` is `m*`. -/
noncomputable def band (hbar m k : ℝ) : ℝ :=
  hbar ^ 2 * k ^ 2 / (2 * m)

theorem hasDerivAt_band (hbar m k : ℝ) (hm : m ≠ 0) :
    HasDerivAt (fun q => band hbar m q) (hbar ^ 2 * k / m) k := by
  have hsq : HasDerivAt (fun q : ℝ => q ^ 2) ((2 : ℕ) * k ^ (1 : ℕ)) k := hasDerivAt_pow 2 k
  have hmul := hsq.const_mul (hbar ^ 2 / (2 * m))
  have hfun : (fun q : ℝ => band hbar m q) = fun q => (hbar ^ 2 / (2 * m)) * q ^ 2 := by
    funext q
    simp [band, div_eq_mul_inv]
    ring
  rw [hfun]
  convert hmul using 1
  field_simp [hm]
  ring

theorem hasDerivAt_band_slope (hbar m k : ℝ) (_hm : m ≠ 0) :
    HasDerivAt (fun q => hbar ^ 2 * q / m) (hbar ^ 2 / m) k := by
  have hid : HasDerivAt (fun q : ℝ => q) 1 k := hasDerivAt_id k
  have hmul := hid.const_mul (hbar ^ 2 / m)
  convert hmul using 1
  · funext q
    ring
  · simp

/-- `∫₀^{E_F} √(E/E_F) dE = (2/3) E_F`, so `g(E_F) = (3/2) n / E_F`. -/
theorem dos_factor (gF n EF : ℝ) (hEF : 0 < EF)
    (hcum : n = gF * ∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF)) :
    (∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF)) = (2 / 3) * EF ∧
      gF = (3 / 2) * n / EF := by
  have hhalf : (-1 : ℝ) < 1 / 2 := by norm_num
  have hint : ∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF) =
      (1 / EF ^ ((1 : ℝ) / 2)) * ((EF ^ ((1 : ℝ) / 2 + 1) - (0 : ℝ) ^ ((1 : ℝ) / 2 + 1)) /
        ((1 : ℝ) / 2 + 1)) := by
    rw [integral_congr (fun E hE => ?_), intervalIntegral.integral_const_mul,
      integral_rpow (Or.inl hhalf)]
    rw [Set.uIcc_of_le hEF.le] at hE
    obtain ⟨hE0, _⟩ := hE
    rw [Real.sqrt_eq_rpow, Real.div_rpow hE0 hEF.le, div_eq_mul_inv]
    ring
  have hzero : (0 : ℝ) ^ ((1 : ℝ) / 2 + 1) = 0 := Real.zero_rpow (by norm_num)
  have hsum : (1 : ℝ) / 2 + 1 = 3 / 2 := by norm_num
  have hval : ∫ E in (0 : ℝ)..EF, Real.sqrt (E / EF) = (2 / 3) * EF := by
    rw [hint, hzero, hsum, sub_zero]
    have hdiv : EF ^ ((3 : ℝ) / 2) / ((3 : ℝ) / 2) = EF ^ ((3 : ℝ) / 2) * (2 / 3) := by
      field_simp
    rw [hdiv]
    have hsub : EF ^ ((3 : ℝ) / 2) / EF ^ ((1 : ℝ) / 2) = EF := by
      rw [← Real.rpow_sub hEF]
      have : (3 : ℝ) / 2 - 1 / 2 = 1 := by norm_num
      rw [this, Real.rpow_one]
    calc
      (1 / EF ^ ((1 : ℝ) / 2)) * (EF ^ ((3 : ℝ) / 2) * (2 / 3))
          = (2 / 3) * (EF ^ ((3 : ℝ) / 2) / EF ^ ((1 : ℝ) / 2)) := by ring
      _ = (2 / 3) * EF := by rw [hsub]
  refine ⟨hval, ?_⟩
  rw [hcum, hval]
  field_simp [hEF.ne']

/-- Fermi wavevector, Fermi energy, group velocity, and effective mass.

`hcount` is two spins times the sphere in units of `(2π)³`. `hE` is the
isotropic parabola. `v` is `(1/ℏ) dE/dk` at `k_F`, and `invMass` is
`ℏ⁻²` times the second derivative.

Not a lattice band. -/
theorem fermi_sea
    (kF n EF v invMass hbar m : ℝ)
    (hk : 0 ≤ kF) (hm : m ≠ 0) (hh : hbar ≠ 0)
    (hcount : n = 2 * ((4 / 3) * Real.pi * kF ^ 3) / (2 * Real.pi) ^ 3)
    (hE : EF = band hbar m kF)
    (hv : v = (1 / hbar) * (hbar ^ 2 * kF / m))
    (hinv : invMass = (1 / hbar ^ 2) * (hbar ^ 2 / m)) :
    kF = (3 * Real.pi ^ 2 * n) ^ ((1 : ℝ) / 3) ∧
      EF = hbar ^ 2 * kF ^ 2 / (2 * m) ∧
      v = hbar * kF / m ∧
      invMass = 1 / m := by
  have hcube := state_count kF n hcount
  refine ⟨wavevector_root kF n hk hcube, ?_, ?_, ?_⟩
  · simpa [band] using hE
  · rw [hv]
    field_simp [hh, hm]
  · rw [hinv]
    field_simp [hh, hm]

/-- The slope and the curvature are the derivatives of `band`. -/
theorem band_derivatives (hbar m k : ℝ) (hm : m ≠ 0) :
    HasDerivAt (fun q => band hbar m q) (hbar ^ 2 * k / m) k ∧
      HasDerivAt (fun q => hbar ^ 2 * q / m) (hbar ^ 2 / m) k :=
  ⟨hasDerivAt_band hbar m k hm, hasDerivAt_band_slope hbar m k hm⟩

end PhysJS.FermiSea
