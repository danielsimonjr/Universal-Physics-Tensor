/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Comp
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-239`. Bridge. Elastic-wave speeds in an isotropic solid.

The catalog equations are

```
c_p = √((K + 4G/3) / ρ)        c_s = √(G / ρ)
```

with `K` the bulk modulus, `G` the shear modulus and `ρ` the density.

The premise is the isotropic Navier-Cauchy equation of motion with Lamé
constant `λ = K − 2G/3`, reduced along the propagation axis. A plane
longitudinal wave has `∇(∇·u) = u_xx` and `∇×∇×u = 0`, so
`ρ u_tt = (λ + 2G) u_xx`. A plane transverse wave has `∇·u = 0`, so
`ρ v_tt = G v_xx`. The reduction itself is taken as the hypothesis. The
theorem proves what follows from it: a travelling profile `f(x − c t)`
with a non-vanishing second derivative somewhere solves the equation
only if `ρ c² = λ + 2G = K + 4G/3` (P) or `ρ c² = G` (S). Then the speeds
are the square roots above, `c_s < c_p`, `c_p² = K/ρ` when `G = 0`
(the fluid sound speed), and `c_p² ≥ E/ρ` with equality only at `λ = 0`:
the thin-bar speed `√(E/ρ)` is a third speed, not either of these.

It does not derive the Navier-Cauchy equation from a stress balance, and
it assumes an infinite, homogeneous, isotropic, linear, small-strain medium.
-/

namespace PhysJS.ElasticWaveSpeeds

/-- A profile `f(x − c t)` solving `ρ u_tt = M u_xx` at all points, with
`f''` non-zero at some point, forces `ρ c² = M`. -/
theorem travelling_wave_modulus (f f1 f2 : ℝ → ℝ) (ρ c M : ℝ)
    (hf : ∀ y, HasDerivAt f (f1 y) y) (hf1 : ∀ y, HasDerivAt f1 (f2 y) y)
    (hPDE : ∀ x t : ℝ,
      ρ * deriv (fun s => deriv (fun τ => f (x - c * τ)) s) t =
        M * deriv (fun y => deriv (fun z => f (z - c * t)) y) x)
    (y0 : ℝ) (hy0 : f2 y0 ≠ 0) : ρ * c ^ 2 = M := by
  have hT : ∀ x s : ℝ, deriv (fun τ => f (x - c * τ)) s = -c * f1 (x - c * s) := by
    intro x s
    have h1 : HasDerivAt (fun τ : ℝ => x - c * τ) (-c) s := by
      simpa using ((hasDerivAt_id s).const_mul c).const_sub x
    have h2 : HasDerivAt (fun τ : ℝ => f (x - c * τ)) (f1 (x - c * s) * -c) s :=
      (hf (x - c * s)).comp s h1
    rw [h2.deriv]; ring
  have hX : ∀ t y : ℝ, deriv (fun z => f (z - c * t)) y = f1 (y - c * t) := by
    intro t y
    have h1 : HasDerivAt (fun z : ℝ => z - c * t) 1 y := by
      simpa using (hasDerivAt_id y).sub_const (c * t)
    have h2 : HasDerivAt (fun z : ℝ => f (z - c * t)) (f1 (y - c * t) * 1) y :=
      (hf (y - c * t)).comp y h1
    rw [h2.deriv]; ring
  have hTT : ∀ x t : ℝ,
      deriv (fun s => deriv (fun τ => f (x - c * τ)) s) t = c ^ 2 * f2 (x - c * t) := by
    intro x t
    have hfun : (fun s => deriv (fun τ => f (x - c * τ)) s) =
        fun s => -c * f1 (x - c * s) := funext (hT x)
    rw [hfun]
    have h1 : HasDerivAt (fun τ : ℝ => x - c * τ) (-c) t := by
      simpa using ((hasDerivAt_id t).const_mul c).const_sub x
    have h2 : HasDerivAt (fun s : ℝ => -c * f1 (x - c * s))
        (-c * (f2 (x - c * t) * -c)) t :=
      ((hf1 (x - c * t)).comp t h1).const_mul (-c)
    rw [h2.deriv]
    ring
  have hXX : ∀ x t : ℝ,
      deriv (fun y => deriv (fun z => f (z - c * t)) y) x = f2 (x - c * t) := by
    intro x t
    have hfun : (fun y => deriv (fun z => f (z - c * t)) y) =
        fun y => f1 (y - c * t) := funext (hX t)
    rw [hfun]
    have h1 : HasDerivAt (fun z : ℝ => z - c * t) 1 x := by
      simpa using (hasDerivAt_id x).sub_const (c * t)
    have h2 : HasDerivAt (fun y : ℝ => f1 (y - c * t)) (f2 (x - c * t) * 1) x :=
      (hf1 (x - c * t)).comp x h1
    rw [h2.deriv]; ring
  have h := hPDE y0 0
  rw [hTT, hXX] at h
  simp only [mul_zero, sub_zero] at h
  have : (ρ * c ^ 2 - M) * f2 y0 = 0 := by linarith
  rcases mul_eq_zero.mp this with h0 | h0
  · linarith
  · exact absurd h0 hy0

/-- P wave. The Navier-Cauchy longitudinal equation `ρ u_tt = (λ + 2G) u_xx`
with `λ = K − 2G/3` holds for a travelling profile of speed `c > 0` with a
non-vanishing `f''`; then `c = √((K + 4G/3)/ρ)`.

Not a derivation
of the Navier-Cauchy equation. -/
theorem pwave_eq (f f1 f2 : ℝ → ℝ) (ρ c K G lam : ℝ)
    (hρ : 0 < ρ) (hc : 0 < c) (hlam : lam = K - 2 * G / 3)
    (hf : ∀ y, HasDerivAt f (f1 y) y) (hf1 : ∀ y, HasDerivAt f1 (f2 y) y)
    (hNavier : ∀ x t : ℝ,
      ρ * deriv (fun s => deriv (fun τ => f (x - c * τ)) s) t =
        (lam + 2 * G) * deriv (fun y => deriv (fun z => f (z - c * t)) y) x)
    (y0 : ℝ) (hy0 : f2 y0 ≠ 0) :
    ρ * c ^ 2 = K + 4 * G / 3 ∧ c = Real.sqrt ((K + 4 * G / 3) / ρ) := by
  have h := travelling_wave_modulus f f1 f2 ρ c (lam + 2 * G) hf hf1 hNavier y0 hy0
  have hM : ρ * c ^ 2 = K + 4 * G / 3 := by rw [h, hlam]; ring
  refine ⟨hM, ?_⟩
  have : (K + 4 * G / 3) / ρ = c ^ 2 := by
    rw [← hM]; field_simp
  rw [this, Real.sqrt_sq hc.le]

/-- S wave. The transverse equation `ρ v_tt = G v_xx` for a travelling
profile of speed `c > 0` with a non-vanishing `f''` gives `c = √(G/ρ)`. -/
theorem swave_eq (f f1 f2 : ℝ → ℝ) (ρ c G : ℝ)
    (hρ : 0 < ρ) (hc : 0 < c)
    (hf : ∀ y, HasDerivAt f (f1 y) y) (hf1 : ∀ y, HasDerivAt f1 (f2 y) y)
    (hNavier : ∀ x t : ℝ,
      ρ * deriv (fun s => deriv (fun τ => f (x - c * τ)) s) t =
        G * deriv (fun y => deriv (fun z => f (z - c * t)) y) x)
    (y0 : ℝ) (hy0 : f2 y0 ≠ 0) :
    ρ * c ^ 2 = G ∧ c = Real.sqrt (G / ρ) := by
  have hM := travelling_wave_modulus f f1 f2 ρ c G hf hf1 hNavier y0 hy0
  refine ⟨hM, ?_⟩
  have : G / ρ = c ^ 2 := by
    rw [← hM]; field_simp
  rw [this, Real.sqrt_sq hc.le]

/-- A fluid (`G = 0`) has `c_p² = K/ρ`, the sound speed. -/
theorem fluid_limit (K ρ : ℝ) : (K + 4 * 0 / 3) / ρ = K / ρ := by ring

/-- With `K, G > 0` the S wave is strictly slower than the P wave. -/
theorem swave_slower (K G ρ : ℝ) (hρ : 0 < ρ) (hK : 0 < K) (hG : 0 < G) :
    Real.sqrt (G / ρ) < Real.sqrt ((K + 4 * G / 3) / ρ) := by
  apply Real.sqrt_lt_sqrt (div_nonneg hG.le hρ.le)
  apply div_lt_div_of_pos_right _ hρ
  linarith

/-- The P-wave modulus exceeds the Young modulus `E = 9KG/(3K+G)` by
`3 λ² / (3K + G)`, with `λ = K − 2G/3`: the bar speed is a different speed,
equal to `c_p` only at `λ = 0`. -/
theorem pmodulus_sub_young (K G : ℝ) (hKG : 3 * K + G ≠ 0) :
    (K + 4 * G / 3) - 9 * K * G / (3 * K + G) = 3 * (K - 2 * G / 3) ^ 2 / (3 * K + G) := by
  rw [eq_div_iff hKG, sub_mul, div_mul_cancel₀ _ hKG]
  ring

theorem pmodulus_ge_young (K G : ℝ) (hK : 0 < K) (hG : 0 < G) :
    9 * K * G / (3 * K + G) ≤ K + 4 * G / 3 := by
  have hpos : 0 < 3 * K + G := by linarith
  have h := pmodulus_sub_young K G hpos.ne'
  have : 0 ≤ 3 * (K - 2 * G / 3) ^ 2 / (3 * K + G) := by positivity
  linarith

/-- Strict separation off `λ = 0` (steel-like `K = 2G`). -/
theorem bar_speed_not_pwave (K G : ℝ) (hK : 0 < K) (hG : 0 < G) (hl : K ≠ 2 * G / 3) :
    9 * K * G / (3 * K + G) < K + 4 * G / 3 := by
  have hpos : 0 < 3 * K + G := by linarith
  have h := pmodulus_sub_young K G hpos.ne'
  have hsq : 0 < (K - 2 * G / 3) ^ 2 := by
    have : K - 2 * G / 3 ≠ 0 := sub_ne_zero.mpr hl
    positivity
  have : 0 < 3 * (K - 2 * G / 3) ^ 2 / (3 * K + G) := by positivity
  linarith

/-- Units alone do not entail the combination: `K + 4G/3` is not `K + G`. -/
theorem combination_not_fixed : ∃ K G : ℝ, K + 4 * G / 3 ≠ K + G :=
  ⟨1, 3, by norm_num⟩

end PhysJS.ElasticWaveSpeeds
