/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-139`. Bridge. Semiconductor Fermi level, intrinsic and extrinsic.

The catalog equations are

```
E_F − (E_c + E_v) / 2 = (3/4) k_B T ln(m_h* / m_e*)
E_c − E_F = k_B T ln(N_c / N_D)
```

`fermi_level` derives both. The Boltzmann tails are the hypotheses. Setting
`n = p` cancels the gap into the midgap offset. The effective-density ratio

```
N_c / N_v = (m_e* / m_h*)^{3/2}
```

is a hypothesis. The `3/4` is half of that `3/2`: the square root that
equalizes `n` and `p` contributes `1/2`, and the densities of states
contribute `3/2`. The extrinsic line inverts `N_D = N_c exp(−(E_c − E_F) / k_B T)`
for complete ionization. `k_B T ≠ 0`. The masses, `N_c`, `N_v`, and `N_D`
are positive. A Fermi–Dirac integral is not this row.
-/

namespace PhysJS.SemiconductorFermi

open Real

/-- Intrinsic offset from midgap. `hratio` is `N_c / N_v = (m_e* / m_h*)^{3/2}`. -/
theorem intrinsic_offset
    (n p Nc Nv Ec Ev μ kT me mh : ℝ)
    (hkT : kT ≠ 0) (hNc : 0 < Nc) (hNv : 0 < Nv) (hme : 0 < me) (hmh : 0 < mh)
    (hn : n = Nc * Real.exp (-(Ec - μ) / kT))
    (hp : p = Nv * Real.exp (-(μ - Ev) / kT))
    (heq : n = p)
    (hratio : Nc / Nv = (me / mh) ^ ((3 : ℝ) / 2)) :
    μ - (Ec + Ev) / 2 = (3 / 4) * kT * Real.log (mh / me) := by
  have hNc0 : Nc ≠ 0 := hNc.ne'
  have hNv0 : Nv ≠ 0 := hNv.ne'
  have hme0 : me ≠ 0 := hme.ne'
  have hmh0 : mh ≠ 0 := hmh.ne'
  have hnp : Nc * Real.exp (-(Ec - μ) / kT) = Nv * Real.exp (-(μ - Ev) / kT) := by
    rw [← hn, heq, hp]
  have hquot : Nc / Nv =
      Real.exp (-(μ - Ev) / kT) / Real.exp (-(Ec - μ) / kT) := by
    apply mul_right_cancel₀ (Real.exp_ne_zero (-(Ec - μ) / kT))
    have hclear : Nc / Nv * Real.exp (-(Ec - μ) / kT) = Real.exp (-(μ - Ev) / kT) := by
      field_simp [hNv0] at hnp ⊢
      linarith
    simpa [div_eq_mul_inv, mul_assoc] using hclear
  have hexp : Real.exp (-(μ - Ev) / kT) / Real.exp (-(Ec - μ) / kT) =
      Real.exp ((Ec + Ev - 2 * μ) / kT) := by
    rw [div_eq_mul_inv, ← Real.exp_neg, ← Real.exp_add]
    congr 1
    field_simp [hkT]
    ring
  have hlog : Real.log (Nc / Nv) = (Ec + Ev - 2 * μ) / kT := by
    rw [hquot, hexp, Real.log_exp]
  have hmass : Real.log (Nc / Nv) = (3 / 2) * Real.log (me / mh) := by
    rw [hratio, Real.log_rpow (div_pos hme hmh)]
  have hflip : Real.log (me / mh) = -Real.log (mh / me) := by
    rw [Real.log_div hme0 hmh0, Real.log_div hmh0 hme0]
    ring
  have henergy : Ec + Ev - 2 * μ = -(3 / 2) * kT * Real.log (mh / me) := by
    have hline : (Ec + Ev - 2 * μ) / kT = (3 / 2) * (-Real.log (mh / me)) := by
      rw [← hlog, hmass, hflip]
    field_simp [hkT] at hline
    linarith
  have htwice : 2 * (μ - (Ec + Ev) / 2) = (3 / 2) * kT * Real.log (mh / me) := by
    linarith
  have htwo : (2 : ℝ) ≠ 0 := by norm_num
  field_simp [htwo] at htwice ⊢
  linarith

/-- Extrinsic n-type line. `hn` is complete ionization into a Boltzmann tail. -/
theorem extrinsic_offset (ND Nc Ec μ kT : ℝ) (hkT : kT ≠ 0) (hNc : 0 < Nc) (hND : 0 < ND)
    (hn : ND = Nc * Real.exp (-(Ec - μ) / kT)) :
    Ec - μ = kT * Real.log (Nc / ND) := by
  have hNc0 : Nc ≠ 0 := hNc.ne'
  have hND0 : ND ≠ 0 := hND.ne'
  have hratio : ND / Nc = Real.exp (-(Ec - μ) / kT) := by
    rw [hn]
    field_simp [hNc0]
  have hlog : Real.log (ND / Nc) = -(Ec - μ) / kT := by
    rw [hratio, Real.log_exp]
  have hflip : Real.log (Nc / ND) = -Real.log (ND / Nc) := by
    rw [Real.log_div hNc0 hND0, Real.log_div hND0 hNc0]
    ring
  have henergy : (Ec - μ) / kT = Real.log (Nc / ND) := by
    calc
      (Ec - μ) / kT = -(-(Ec - μ) / kT) := by ring
      _ = -Real.log (ND / Nc) := by rw [← hlog]
      _ = Real.log (Nc / ND) := by rw [← hflip]
  have hmul := congrArg (fun z => z * kT) henergy
  field_simp [hkT] at hmul
  linarith

/-- Intrinsic midgap offset and the extrinsic logarithm.

`heq` is charge neutrality in the intrinsic case, `n = p`. `hratio` is
`N_c / N_v = (m_e* / m_h*)^{3/2}`. `hdonor` is `N_D` in the Boltzmann tail.
The two chemical potentials are independent variables.

Not a
Fermi–Dirac integral. -/
theorem fermi_level
    (n p Nc Nv ND Ec Ev μi μn kT me mh : ℝ)
    (hkT : kT ≠ 0) (hNc : 0 < Nc) (hNv : 0 < Nv) (hND : 0 < ND)
    (hme : 0 < me) (hmh : 0 < mh)
    (hn : n = Nc * Real.exp (-(Ec - μi) / kT))
    (hp : p = Nv * Real.exp (-(μi - Ev) / kT))
    (heq : n = p)
    (hratio : Nc / Nv = (me / mh) ^ ((3 : ℝ) / 2))
    (hdonor : ND = Nc * Real.exp (-(Ec - μn) / kT)) :
    μi - (Ec + Ev) / 2 = (3 / 4) * kT * Real.log (mh / me) ∧
      Ec - μn = kT * Real.log (Nc / ND) :=
  ⟨intrinsic_offset n p Nc Nv Ec Ev μi kT me mh hkT hNc hNv hme hmh hn hp heq hratio,
    extrinsic_offset ND Nc Ec μn kT hkT hNc hND hdonor⟩

/-- Dropping the `3/2` inside the mass ratio leaves `1/2`, not `3/4`. -/
theorem three_quarters_not_half (kT ratio : ℝ) (hkT : kT ≠ 0) (hr : ratio ≠ 0) :
    (1 / 2) * kT * ratio ≠ (3 / 4) * kT * ratio := by
  intro hEq
  field_simp [hkT, hr] at hEq
  norm_num at hEq

end PhysJS.SemiconductorFermi
