/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-98`. Bridge. BCS specific-heat jump, from the weak-coupling free energy.

The catalog equation is

```
ΔC / C_n = 12 / (7 ζ(3))
```

`heat_jump` derives the ratio. The weak-coupling excess free energy, in units
`k_B = 1`, is the hypothesis

```
F = N(0) (T − T_c) / T_c · Δ² + 7 ζ N(0) / (16 π² T_c²) · Δ⁴
```

`minimized_quartic` is the stationary value `F = −α₀² (T − T_c)² / (4 β)`.
Heat capacity is `−T ∂²F/∂T²` of that function, so the jump at `T_c` is
`T_c α₀² / (2 β)`. The normal heat capacity

```
C_n = (2 π² / 3) N(0) T_c
```

is the Sommerfeld value for both spins, a hypothesis. `ζ` is the coefficient
in the quartic. This file does not identify it with a series and does not
evaluate `1.426`. Strong coupling is a different number. The gap ratio
`2π exp(−γ)` is not this row.
-/

namespace PhysJS.BcsJump

open Real

/-- Stationary value of `α Δ² + β Δ⁴` when `α + 2 β Δ² = 0`. -/
theorem minimized_quartic (α β Δ2 : ℝ) (hβ : β ≠ 0) (hstat : α + 2 * β * Δ2 = 0) :
    α * Δ2 + β * Δ2 ^ 2 = -α ^ 2 / (4 * β) := by
  have hα : α = -2 * β * Δ2 := by linarith
  rw [hα]
  field_simp [hβ]
  ring

/-- Second derivative of `−K (T − T_c)²` is `−2 K`, so `−T` times it is `2 K T`. -/
theorem jump_from_quadratic (F : ℝ → ℝ) (K Tc T C : ℝ)
    (hF : ∀ t, F t = -K * (t - Tc) ^ 2)
    (hC : HasDerivAt (deriv F) C T) :
    C = -2 * K ∧ -T * C = 2 * K * T := by
  have hshift : HasDerivAt (fun s : ℝ => s - Tc) 1 T :=
    (hasDerivAt_id T).sub_const Tc
  have hFfun : F = fun s => -K * (s - Tc) ^ 2 := funext hF
  have hslope : deriv F = fun t => -2 * K * (t - Tc) := by
    funext t
    have hshift_t : HasDerivAt (fun s : ℝ => s - Tc) 1 t :=
      (hasDerivAt_id t).sub_const Tc
    have hsq_t : HasDerivAt (fun s : ℝ => (s - Tc) ^ 2) (2 * (t - Tc)) t := by
      have hmul := hshift_t.mul hshift_t
      convert hmul using 1
      · funext s
        simp [Pi.mul_apply]
        ring
      · ring
    have hmul_t : HasDerivAt (fun s : ℝ => -K * (s - Tc) ^ 2) (-2 * K * (t - Tc)) t := by
      convert (hsq_t.const_mul (-K)) using 1
      ring
    rw [hFfun]
    exact hmul_t.deriv
  have hlin : HasDerivAt (fun t => -2 * K * (t - Tc)) (-2 * K) T := by
    convert (hshift.const_mul (-2 * K)) using 1
    ring
  have hsecond : C = -2 * K := by
    rw [hslope] at hC
    exact hC.unique hlin
  refine ⟨hsecond, ?_⟩
  rw [hsecond]
  ring

/-- BCS jump. `α₀ = N(0)/T_c` and `β` is the quartic coefficient containing
`ζ`. `hjump` is `ΔC = T_c α₀² / (2 β)`, the value of `−T F''` at `T_c`.
`hCn` is the Sommerfeld normal heat capacity.

Not `2π exp(−γ)`. -/
theorem heat_jump (ΔC Cn N0 Tc ζ α0 β : ℝ)
    (hN : N0 ≠ 0) (hT : Tc ≠ 0) (hζ : ζ ≠ 0)
    (hα : α0 = N0 / Tc)
    (hβ : β = 7 * ζ * N0 / (16 * Real.pi ^ 2 * Tc ^ 2))
    (_hβ0 : β ≠ 0)
    (hjump : ΔC = Tc * α0 ^ 2 / (2 * β))
    (hCn : Cn = (2 * Real.pi ^ 2 / 3) * N0 * Tc) :
    ΔC / Cn = 12 / (7 * ζ) := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  rw [hjump, hCn, hα, hβ]
  field_simp [hN, hT, hζ, hπ, _hβ0]
  ring_nf

/-- Dropping a spin in `C_n` replaces `2 π²/3` by `π²/3` and misses `12/(7ζ)`. -/
theorem both_spins_needed (N0 Tc ζ : ℝ) (hN : N0 ≠ 0) (hT : Tc ≠ 0) (hζ : ζ ≠ 0) :
    ((8 * Real.pi ^ 2 * N0 * Tc / (7 * ζ)) / ((Real.pi ^ 2 / 3) * N0 * Tc)) ≠
      (12 : ℝ) / (7 * ζ) := by
  intro hEq
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp [hN, hT, hζ, hπ] at hEq
  norm_num at hEq

end PhysJS.BcsJump
