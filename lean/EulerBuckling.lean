/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-78`. Bridge. Euler buckling.

The catalog equation for a pinned–pinned column is

```
P_cr = π² E I / L²
```

`critical_load` is the lowest positive eigenvalue of the Euler–Bernoulli
balance `E I y'' = −P y` with `y(0) = y(L) = 0`. The sine `sin(π x / L)`
meets those ends and the balance at that load. Every other nontrivial
solution of `y'' = −ω² y` with the same ends has `ω L = n π` for a nonzero
integer `n`, so its load is at least this one.

A cantilever, clamped at `0` and free of moment at `L`, is the same
eigenvalue on a column of length `2 L`. `cantilever_load` is
`π² E I / (4 L²)`. `cantilever_not_pinned` separates the two end conditions.
The load is not read off from units: units give `P = E L² f(I / L⁴)`.
-/

namespace PhysJS.EulerBuckling

open Real Set

/-- Pinned–pinned Euler load. -/
noncomputable def pinnedLoad (E I L : ℝ) : ℝ :=
  Real.pi ^ 2 * E * I / L ^ 2

/-- Cantilever Euler load. The `4` is `(2)²` from the quarter-wave. -/
noncomputable def cantileverLoad (E I L : ℝ) : ℝ :=
  Real.pi ^ 2 * E * I / (4 * L ^ 2)

lemma eq_of_deriv_zero (f : ℝ → ℝ) (hf : ∀ y, HasDerivAt f 0 y) (a b : ℝ) : f a = f b := by
  by_cases hab : a = b
  · rw [hab]
  have hlt : min a b < max a b := by
    cases le_total a b with
    | inl hle =>
      rw [min_eq_left hle, max_eq_right hle]
      exact lt_of_le_of_ne hle hab
    | inr hle =>
      rw [min_eq_right hle, max_eq_left hle]
      exact lt_of_le_of_ne hle (Ne.symm hab)
  have hcont : ContinuousOn f (Icc (min a b) (max a b)) :=
    fun y _ => (hf y).continuousAt.continuousWithinAt
  have hff : ∀ y ∈ Ioo (min a b) (max a b), HasDerivAt f 0 y := fun y _ => hf y
  obtain ⟨_, _, hslope⟩ := exists_hasDerivAt_eq_slope f (fun _ => (0 : ℝ)) hlt hcont hff
  have hspan : max a b - min a b ≠ 0 := sub_ne_zero.mpr hlt.ne'
  have hflat : f (max a b) = f (min a b) := by
    have hzero : (f (max a b) - f (min a b)) / (max a b - min a b) = 0 := hslope.symm
    rw [div_eq_zero_iff] at hzero
    rcases hzero with h | h
    · linarith
    · exact absurd h hspan
  cases le_total a b with
  | inl hle => simpa [min_eq_left hle, max_eq_right hle] using hflat.symm
  | inr hle => simpa [min_eq_right hle, max_eq_left hle] using hflat

lemma hasDerivAt_energy (y v : ℝ → ℝ) (ω x : ℝ)
    (hvel : HasDerivAt y (v x) x) (hacc : HasDerivAt v (-(ω ^ 2) * y x) x) :
    HasDerivAt (fun t => (v t) ^ 2 + ω ^ 2 * (y t) ^ 2) 0 x := by
  have hy2 : HasDerivAt (fun t => y t ^ 2) (2 * y x * v x) x := by
    have h := hvel.mul hvel
    simp only [pow_two]
    convert h using 1
    ring
  have hv2 : HasDerivAt (fun t => v t ^ 2) (2 * v x * (-(ω ^ 2) * y x)) x := by
    have h := hacc.mul hacc
    simp only [pow_two]
    convert h using 1
    ring
  have hy := hy2.const_mul (ω ^ 2)
  exact (hv2.add hy).congr_deriv (by ring)

/-- Zero data at one point and `y'' = −ω² y` force the zero solution. -/
theorem harmonic_zero (y v : ℝ → ℝ) (ω : ℝ) (hω : ω ≠ 0)
    (hvel : ∀ x, HasDerivAt y (v x) x) (hacc : ∀ x, HasDerivAt v (-(ω ^ 2) * y x) x)
    (hy0 : y 0 = 0) (hv0 : v 0 = 0) (x : ℝ) : y x = 0 := by
  let energy : ℝ → ℝ := fun t => (v t) ^ 2 + ω ^ 2 * (y t) ^ 2
  have hE : ∀ t, HasDerivAt energy 0 t := fun t => hasDerivAt_energy y v ω t (hvel t) (hacc t)
  have hconst := eq_of_deriv_zero energy hE x 0
  have hzero : energy 0 = 0 := by simp [energy, hy0, hv0]
  have hx : energy x = 0 := hconst.trans hzero
  have hy : ω ^ 2 * (y x) ^ 2 = 0 := by
    have hsum : (v x) ^ 2 + ω ^ 2 * (y x) ^ 2 = 0 := by simpa [energy] using hx
    have hvnn : 0 ≤ (v x) ^ 2 := sq_nonneg _
    have hynn : 0 ≤ ω ^ 2 * (y x) ^ 2 := mul_nonneg (sq_nonneg _) (sq_nonneg _)
    linarith
  exact sq_eq_zero_iff.mp ((mul_eq_zero.mp hy).resolve_left (pow_ne_zero 2 hω))

lemma hasDerivAt_sin_mul (ω x : ℝ) :
    HasDerivAt (fun t => Real.sin (ω * t)) (ω * Real.cos (ω * x)) x := by
  have hlin : HasDerivAt (fun t => ω * t) ω x := by
    simpa [mul_one] using (hasDerivAt_id x).const_mul ω
  simpa [mul_comm] using hlin.sin

lemma hasDerivAt_cos_mul (ω x : ℝ) :
    HasDerivAt (fun t => Real.cos (ω * t)) (-(ω * Real.sin (ω * x))) x := by
  have hlin : HasDerivAt (fun t => ω * t) ω x := by
    simpa [mul_one] using (hasDerivAt_id x).const_mul ω
  simpa [mul_comm] using hlin.cos

/-- `y(0) = 0` selects the sine. -/
theorem sine_shape (y v : ℝ → ℝ) (ω : ℝ) (hω : ω ≠ 0)
    (hvel : ∀ x, HasDerivAt y (v x) x) (hacc : ∀ x, HasDerivAt v (-(ω ^ 2) * y x) x)
    (hy0 : y 0 = 0) (x : ℝ) : y x = (v 0 / ω) * Real.sin (ω * x) := by
  let A : ℝ := v 0 / ω
  let z : ℝ → ℝ := y - fun t => A * Real.sin (ω * t)
  let w : ℝ → ℝ := v - fun t => A * ω * Real.cos (ω * t)
  have hvelz : ∀ t, HasDerivAt z (w t) t := by
    intro t
    have hsub := (hvel t).sub ((hasDerivAt_sin_mul ω t).const_mul A)
    simpa [z, w, Pi.sub_apply, mul_assoc, mul_left_comm, mul_comm] using hsub
  have haccz : ∀ t, HasDerivAt w (-(ω ^ 2) * z t) t := by
    intro t
    have hsub := (hacc t).sub ((hasDerivAt_cos_mul ω t).const_mul (A * ω))
    have hrewrite : -(ω ^ 2) * y t - A * ω * -(ω * Real.sin (ω * t)) =
        -(ω ^ 2) * (y t - A * Real.sin (ω * t)) := by
      ring
    simpa [w, z, Pi.sub_apply, mul_assoc, mul_left_comm, mul_comm] using
      hsub.congr_deriv hrewrite
  have hz0 : z 0 = 0 := by simp [z, hy0, Pi.sub_apply]
  have hw0 : w 0 = 0 := by
    simp [w, A, hω, Pi.sub_apply, Real.cos_zero]
  have hz := harmonic_zero z w ω hω hvelz haccz hz0 hw0 x
  have : y x - A * Real.sin (ω * x) = 0 := by simpa [z, Pi.sub_apply] using hz
  linarith

/-- The pinned sine is an eigenfunction at `π² E I / L²`, and no smaller
positive load has a nontrivial pinned solution.

Not a cantilever. -/
theorem critical_load (E I L : ℝ) (hE : 0 < E) (hI : 0 < I) (hL : 0 < L) :
    let y : ℝ → ℝ := fun x => Real.sin (Real.pi * x / L)
    let v : ℝ → ℝ := fun x => (Real.pi / L) * Real.cos (Real.pi * x / L)
    (∀ x, HasDerivAt y (v x) x) ∧
      (∀ x, HasDerivAt v (-(pinnedLoad E I L / (E * I)) * y x) x) ∧
      y 0 = 0 ∧ y L = 0 ∧ y (L / 2) ≠ 0 ∧
      ∀ (P ω : ℝ) (y1 v1 : ℝ → ℝ),
        0 < P → 0 < ω → ω ^ 2 = P / (E * I) →
        (∀ x, HasDerivAt y1 (v1 x) x) →
        (∀ x, HasDerivAt v1 (-(ω ^ 2) * y1 x) x) →
        y1 0 = 0 → y1 L = 0 → (∃ x, y1 x ≠ 0) →
        pinnedLoad E I L ≤ P := by
  intro y v
  refine ⟨?_, ?_, ?_, ?_, ?_, ?_⟩
  · intro x
    have hlin : HasDerivAt (fun t => Real.pi * t / L) (Real.pi / L) x := by
      have h := (hasDerivAt_id x).const_mul (Real.pi / L)
      simpa [div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using h
    simpa [y, v, mul_comm] using hlin.sin
  · intro x
    have hlin : HasDerivAt (fun t => Real.pi * t / L) (Real.pi / L) x := by
      have h := (hasDerivAt_id x).const_mul (Real.pi / L)
      simpa [div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using h
    have hcos := hlin.cos
    have hconst := hcos.const_mul (Real.pi / L)
    have htarget : (Real.pi / L) * (-Real.sin (Real.pi * x / L) * (Real.pi / L)) =
        -(pinnedLoad E I L / (E * I)) * y x := by
      unfold pinnedLoad y
      field_simp [hL.ne', hE.ne', hI.ne']
    simpa [v, y, mul_comm, mul_left_comm, mul_assoc] using hconst.congr_deriv htarget
  · simp [y]
  · have hy : y L = Real.sin Real.pi := by
      simp only [y]
      congr 1
      field_simp [hL.ne']
    simp [hy, Real.sin_pi]
  · have hy : y (L / 2) = Real.sin (Real.pi / 2) := by
      simp only [y]
      congr 1
      field_simp [hL.ne']
    simp [hy, Real.sin_pi_div_two]
  · intro P ω y1 v1 hP hω hdisp hvel hacc hy0 hyL hnon
    have hshape := sine_shape y1 v1 ω hω.ne' hvel hacc hy0
    have hsin : Real.sin (ω * L) = 0 := by
      have hA : v1 0 / ω ≠ 0 := by
        intro hA0
        have hy : ∀ x, y1 x = 0 := by
          intro x
          have := hshape x
          simp [hA0] at this
          exact this
        rcases hnon with ⟨x, hx⟩
        exact hx (hy x)
      have : (v1 0 / ω) * Real.sin (ω * L) = 0 := by simpa [hyL] using hshape L
      exact (mul_eq_zero.mp this).resolve_left hA
    rcases Real.sin_eq_zero_iff.mp hsin with ⟨n, hn⟩
    have hn0 : n ≠ 0 := by
      intro hn0
      have hzero : ω * L = 0 := by simpa [hn0] using hn.symm
      exact (mul_ne_zero hω.ne' hL.ne') hzero
    have hnpos : 0 < n := by
      have hprod : 0 < (n : ℝ) * Real.pi := by
        rw [hn]
        exact mul_pos hω hL
      have hnposR : 0 < (n : ℝ) := pos_of_mul_pos_left hprod Real.pi_pos.le
      exact_mod_cast hnposR
    have hone : (1 : ℝ) ≤ (n : ℝ) := by
      have : (1 : ℤ) ≤ n := by omega
      exact_mod_cast this
    have hωL : Real.pi ≤ ω * L := by
      rw [← hn]
      have hπ : 0 ≤ Real.pi := Real.pi_nonneg
      nlinarith
    have hωge : Real.pi / L ≤ ω := (div_le_iff₀ hL).mpr hωL
    have hsq : (Real.pi / L) ^ 2 ≤ ω ^ 2 := by
      have hπL : 0 ≤ Real.pi / L := div_nonneg Real.pi_nonneg hL.le
      nlinarith
    have hEI : 0 < E * I := mul_pos hE hI
    have hPge : pinnedLoad E I L ≤ E * I * ω ^ 2 := by
      unfold pinnedLoad
      have := mul_le_mul_of_nonneg_left hsq hEI.le
      field_simp [hL.ne'] at this ⊢
      linarith
    rw [hdisp] at hPge
    field_simp [hE.ne', hI.ne'] at hPge
    linarith

/-- Clamped–free column: `z'' = −ω² z`, `z'(0) = 0`, `z(L) = 0`. The lowest
load is `π² E I / (4 L²)`. -/
theorem cantilever_load (E I L : ℝ) (hE : 0 < E) (hI : 0 < I) (hL : 0 < L) :
    let z : ℝ → ℝ := fun x => Real.cos (Real.pi * x / (2 * L))
    let w : ℝ → ℝ := fun x => -(Real.pi / (2 * L)) * Real.sin (Real.pi * x / (2 * L))
    (∀ x, HasDerivAt z (w x) x) ∧
      (∀ x, HasDerivAt w (-(cantileverLoad E I L / (E * I)) * z x) x) ∧
      w 0 = 0 ∧ z L = 0 ∧ z 0 ≠ 0 ∧
      ∀ (P ω : ℝ) (z1 w1 : ℝ → ℝ),
        0 < P → 0 < ω → ω ^ 2 = P / (E * I) →
        (∀ x, HasDerivAt z1 (w1 x) x) →
        (∀ x, HasDerivAt w1 (-(ω ^ 2) * z1 x) x) →
        w1 0 = 0 → z1 L = 0 → z1 0 ≠ 0 →
        cantileverLoad E I L ≤ P := by
  intro z w
  refine ⟨?_, ?_, ?_, ?_, ?_, ?_⟩
  · intro x
    have hlin : HasDerivAt (fun t => Real.pi * t / (2 * L)) (Real.pi / (2 * L)) x := by
      have h := (hasDerivAt_id x).const_mul (Real.pi / (2 * L))
      simpa [div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using h
    simpa [z, w, mul_comm] using hlin.cos
  · intro x
    have hlin : HasDerivAt (fun t => Real.pi * t / (2 * L)) (Real.pi / (2 * L)) x := by
      have h := (hasDerivAt_id x).const_mul (Real.pi / (2 * L))
      simpa [div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc] using h
    have hsin := hlin.sin.const_mul (-(Real.pi / (2 * L)))
    have htarget :
        -(Real.pi / (2 * L)) * (Real.cos (Real.pi * x / (2 * L)) * (Real.pi / (2 * L))) =
          -(cantileverLoad E I L / (E * I)) * z x := by
      unfold cantileverLoad z
      field_simp [hL.ne', hE.ne', hI.ne']
      ring
    simpa [w, mul_comm, mul_left_comm, mul_assoc] using hsin.congr_deriv htarget
  · simp [w]
  · have hz : z L = Real.cos (Real.pi / 2) := by
      simp only [z]
      congr 1
      field_simp [hL.ne']
    simp [hz, Real.cos_pi_div_two]
  · simp [z, Real.cos_zero]
  · intro P ω z1 w1 hP hω hdisp hvel hacc hw0 hzL hz0
    have hshape : ∀ x, z1 x = z1 0 * Real.cos (ω * x) := by
      intro x
      let B : ℝ := z1 0
      let y : ℝ → ℝ := z1 - fun t => B * Real.cos (ω * t)
      let v : ℝ → ℝ := w1 - fun t => B * (-(ω * Real.sin (ω * t)))
      have hvely : ∀ t, HasDerivAt y (v t) t := by
        intro t
        have hsub := (hvel t).sub ((hasDerivAt_cos_mul ω t).const_mul B)
        simpa [y, v, Pi.sub_apply, mul_assoc, mul_left_comm, mul_comm] using hsub
      have haccy : ∀ t, HasDerivAt v (-(ω ^ 2) * y t) t := by
        intro t
        have hsin := (hasDerivAt_sin_mul ω t).const_mul (-ω)
        have hsub := (hacc t).sub (hsin.const_mul B)
        have hrewrite :
            -(ω ^ 2) * z1 t - B * (-ω * (ω * Real.cos (ω * t))) =
              -(ω ^ 2) * (z1 t - B * Real.cos (ω * t)) := by
          ring
        simpa [v, y, Pi.sub_apply, mul_assoc, mul_left_comm, mul_comm] using
          hsub.congr_deriv hrewrite
      have hy0 : y 0 = 0 := by simp [y, B, Pi.sub_apply, Real.cos_zero]
      have hv0 : v 0 = 0 := by simp [v, B, hw0, Pi.sub_apply, Real.sin_zero]
      have hy := harmonic_zero y v ω hω.ne' hvely haccy hy0 hv0 x
      have : z1 x - B * Real.cos (ω * x) = 0 := by simpa [y, Pi.sub_apply] using hy
      linarith
    have hcos0 : Real.cos (ω * L) = 0 := by
      have : z1 0 * Real.cos (ω * L) = 0 := by simpa [hzL] using hshape L
      exact (mul_eq_zero.mp this).resolve_left hz0
    have hsin0 : Real.sin (ω * L + Real.pi / 2) = 0 := by
      simpa [Real.sin_add_pi_div_two] using hcos0
    rcases Real.sin_eq_zero_iff.mp hsin0 with ⟨n, hn⟩
    -- ω L + π/2 = n π, so ω L = (n - 1/2) π. Lowest positive root is π/2.
    have hshift : ω * L = (n : ℝ) * Real.pi - Real.pi / 2 := by linarith
    have hn1 : (1 : ℤ) ≤ n := by
      have hpos : 0 < ω * L := mul_pos hω hL
      have : 0 < (n : ℝ) * Real.pi - Real.pi / 2 := by simpa [hshift] using hpos
      have : Real.pi / 2 < (n : ℝ) * Real.pi := by linarith
      have : (1 : ℝ) / 2 < (n : ℝ) := by
        field_simp [Real.pi_ne_zero] at this
        linarith
      have hn0 : (0 : ℤ) < n := by
        have : (0 : ℝ) < (n : ℝ) := by linarith
        exact_mod_cast this
      omega
    have hhalf : Real.pi / 2 ≤ ω * L := by
      rw [hshift]
      have hcast : (1 : ℝ) ≤ (n : ℝ) := by exact_mod_cast hn1
      nlinarith [Real.pi_pos]
    have hωge : Real.pi / (2 * L) ≤ ω := by
      have h2L : 0 < 2 * L := by positivity
      exact (div_le_iff₀ h2L).mpr (by linarith [hhalf])
    have hsq : (Real.pi / (2 * L)) ^ 2 ≤ ω ^ 2 := by
      have hnn : 0 ≤ Real.pi / (2 * L) := by positivity
      nlinarith
    have hEI : 0 < E * I := mul_pos hE hI
    have hPge : cantileverLoad E I L ≤ E * I * ω ^ 2 := by
      unfold cantileverLoad
      have := mul_le_mul_of_nonneg_left hsq hEI.le
      field_simp [hL.ne'] at this ⊢
      linarith
    rw [hdisp] at hPge
    field_simp [hE.ne', hI.ne'] at hPge
    linarith

/-- The cantilever factor `4` is not the pinned load. -/
theorem cantilever_not_pinned (E I L : ℝ) (hE : E ≠ 0) (hI : I ≠ 0) (hL : L ≠ 0) :
    cantileverLoad E I L ≠ pinnedLoad E I L := by
  unfold cantileverLoad pinnedLoad
  intro hEq
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp [hπ, hE, hI, hL] at hEq
  norm_num at hEq

end PhysJS.EulerBuckling
