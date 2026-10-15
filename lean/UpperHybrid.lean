/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-105`. Bridge. The upper-hybrid frequency.

Proved under these hypotheses. Electrons are a cold fluid. The magnetic
field is uniform and along `z`. The wave is electrostatic and
perpendicular, with the monochromatic ansatz

```
E_x = E₀ cos(ω t),   v_x = v_{x0} sin(ω t),   v_y = v_{y0} cos(ω t)
```

and `E_y = 0`. Momentum is `m dv/dt = −e (E + v × B)` with `e > 0` the
elementary charge, so the electron charge is `−e`. The displacement
current of this polarization is `∂E_x/∂t = n e v_x / ε0`, which is
`∂E/∂t = −j/ε0` for `j = −n e v`. The amplitudes then satisfy
`ω² = ω_pe² + ω_ce²`, with `ω_pe² = n e² / (ε0 m)` and `ω_ce = e B / m`.
Ions are immobile. A finite `k` is not this limit.
-/

namespace PhysJS.UpperHybrid

noncomputable def ex (E0 ω t : ℝ) : ℝ := E0 * Real.cos (ω * t)

noncomputable def vx (vx0 ω t : ℝ) : ℝ := vx0 * Real.sin (ω * t)

noncomputable def vy (vy0 ω t : ℝ) : ℝ := vy0 * Real.cos (ω * t)

theorem upper_hybrid_eq (E0 vx0 vy0 ω B n e m eps : ℝ)
    (hω : ω ≠ 0) (hm : m ≠ 0) (he : e ≠ 0) (hn : n ≠ 0) (hε : eps ≠ 0) (hE : E0 ≠ 0)
    (hmomx : ∀ t, m * deriv (fun s => vx vx0 ω s) t =
      -e * ex E0 ω t - e * vy vy0 ω t * B)
    (hmomy : ∀ t, m * deriv (fun s => vy vy0 ω s) t = e * vx vx0 ω t * B)
    (hdisp : ∀ t, deriv (fun s => ex E0 ω s) t = n * e / eps * vx vx0 ω t) :
    ω ^ 2 = n * e ^ 2 / (eps * m) + (e * B / m) ^ 2 := by
  have hlin0 : HasDerivAt (fun s => ω * s) ω 0 :=
    ((hasDerivAt_id 0).const_mul ω).congr_deriv (by ring)
  have hzero : ω * 0 = 0 := by ring
  have hx0 : deriv (fun s => vx vx0 ω s) 0 = vx0 * ω := by
    unfold vx
    rw [(hlin0.sin.const_mul vx0).deriv, hzero, Real.cos_zero]
    ring
  have hy0 : deriv (fun s => vy vy0 ω s) 0 = 0 := by
    unfold vy
    rw [(hlin0.cos.const_mul vy0).deriv, hzero, Real.sin_zero]
    ring
  have hex0 : deriv (fun s => ex E0 ω s) 0 = 0 := by
    unfold ex
    rw [(hlin0.cos.const_mul E0).deriv, hzero, Real.sin_zero]
    ring
  let t1 : ℝ := Real.pi / (2 * ω)
  have ht1 : ω * t1 = Real.pi / 2 := by
    dsimp [t1]
    field_simp [hω]
  have hlin1 : HasDerivAt (fun s => ω * s) ω t1 :=
    ((hasDerivAt_id t1).const_mul ω).congr_deriv (by ring)
  have hx1 : deriv (fun s => vx vx0 ω s) t1 = 0 := by
    unfold vx
    rw [(hlin1.sin.const_mul vx0).deriv, ht1, Real.cos_pi_div_two]
    ring
  have hy1 : deriv (fun s => vy vy0 ω s) t1 = -(vy0 * ω) := by
    unfold vy
    rw [(hlin1.cos.const_mul vy0).deriv, ht1, Real.sin_pi_div_two]
    ring
  have hex1 : deriv (fun s => ex E0 ω s) t1 = -(E0 * ω) := by
    unfold ex
    rw [(hlin1.cos.const_mul E0).deriv, ht1, Real.sin_pi_div_two]
    ring
  have hmx : m * vx0 * ω = -e * E0 - e * vy0 * B := by
    have h := hmomx 0
    unfold ex vy at h
    rw [hx0, hzero, Real.cos_zero] at h
    linarith
  have hmy : m * (-(vy0 * ω)) = e * vx0 * B := by
    have h := hmomy t1
    unfold vx at h
    rw [hy1, ht1, Real.sin_pi_div_two] at h
    linarith
  have hd : -(E0 * ω) = n * e / eps * vx0 := by
    have h := hdisp t1
    unfold vx at h
    rw [hex1, ht1, Real.sin_pi_div_two] at h
    linarith
  have hvy : m * ω * vy0 + e * B * vx0 = 0 := by linarith
  have hcleard : -(E0 * ω) * eps = n * e * vx0 := by
    rw [hd]
    field_simp [hε]
  have hvx : n * e * vx0 + E0 * ω * eps = 0 := by linarith
  have hmx' : m * vx0 * ω + e * E0 + e * B * vy0 = 0 := by linarith
  have h1 : vx0 * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) + e * E0 * m * ω = 0 := by
    linear_combination m * ω * hmx' - e * B * hvy
  have h1' : vx0 * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) = -(e * E0 * m * ω) := by linarith
  have hvx' : n * e * vx0 = -(E0 * ω * eps) := by linarith
  have hscaled : E0 * ω * eps * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) =
      n * e * (e * E0 * m * ω) := by
    have hleft : n * e * vx0 * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) =
        -(E0 * ω * eps) * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) := by rw [hvx']
    have hright : n * e * vx0 * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) =
        n * e * (-(e * E0 * m * ω)) := by
      calc
        n * e * vx0 * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2)
            = n * e * (vx0 * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2)) := by ring
          _ = n * e * (-(e * E0 * m * ω)) := by rw [h1']
    have : -(E0 * ω * eps) * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) =
        n * e * (-(e * E0 * m * ω)) := by rw [← hleft, hright]
    linarith
  have hEω : E0 * ω ≠ 0 := mul_ne_zero hE hω
  have hcancel : eps * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) = n * m * e ^ 2 := by
    apply mul_left_cancel₀ hEω
    calc
      E0 * ω * (eps * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2))
          = E0 * ω * eps * (m ^ 2 * ω ^ 2 - e ^ 2 * B ^ 2) := by ring
        _ = n * e * (e * E0 * m * ω) := hscaled
        _ = E0 * ω * (n * m * e ^ 2) := by ring
  have hsplit : ω ^ 2 * (eps * m ^ 2) = n * m * e ^ 2 + eps * e ^ 2 * B ^ 2 := by
    have : eps * m ^ 2 * ω ^ 2 - eps * e ^ 2 * B ^ 2 = n * m * e ^ 2 := by
      convert hcancel using 1
      ring
    linarith
  apply mul_right_cancel₀ (mul_ne_zero hε (pow_ne_zero 2 hm))
  have hsq : (e * B / m) ^ 2 * (eps * m ^ 2) = eps * e ^ 2 * B ^ 2 := by
    field_simp [hm]
  have hplasma : n * e ^ 2 / (eps * m) * (eps * m ^ 2) = n * m * e ^ 2 := by
    field_simp [hm, hε]
  calc
    ω ^ 2 * (eps * m ^ 2) = n * m * e ^ 2 + eps * e ^ 2 * B ^ 2 := hsplit
    _ = n * e ^ 2 / (eps * m) * (eps * m ^ 2) + (e * B / m) ^ 2 * (eps * m ^ 2) := by
      rw [hplasma, hsq]
    _ = (n * e ^ 2 / (eps * m) + (e * B / m) ^ 2) * (eps * m ^ 2) := by ring

end PhysJS.UpperHybrid
