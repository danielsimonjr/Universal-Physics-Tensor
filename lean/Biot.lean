/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.FourierConduction
import lean.SteadyProfile
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Order.Filter.AtTopBot.Ring
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-156`. Bridge. The Biot number as the internal over the external temperature drop.

The catalog product is `Bi k = h L_c`. The Biot number is the quotient
`Bi = h L / k`, not a hypothesis on temperature drops. `biot_eq` derives the
drop ratio from a plane wall in steady conduction (`T'' = 0`) with the face
`x = L` cooled by a fluid at `T∞`, using `PhysJS.SteadyProfile.linear_profile`.
`biot_fourier` reaches the same ratio through `PhysJS.FourierConduction.fourier_eq`
and the Robin face `−k T'(L) = h (T(L) − T∞)` without assuming linearity first.
With `L = V / A`, `Bi = h V / (k A)` is the plane wall only. This is not a
lumped-capacitance criterion.
-/

namespace PhysJS.Biot

open Filter Topology
open PhysJS.SteadyProfile PhysJS.FourierConduction

/-- Constant flux through the slab and Robin cooling at `x = L` make
`Bi = h L / k` equal the internal over external temperature drop.

`hflux` is `dT/dx = −q / k`; `hrobin` is `−k T'(L) = h (T(L) − T∞)`. -/
theorem biot_fourier (T : ℝ → ℝ) (Bi hcoeff k L q Tinf : ℝ)
    (hk : k ≠ 0) (hh : hcoeff ≠ 0) (hext : T L ≠ Tinf)
    (hBi : Bi = hcoeff * L / k)
    (hflux : ∀ x, HasDerivAt T (-q / k) x)
    (hrobin : -k * deriv T L = hcoeff * (T L - Tinf)) :
    Bi = (T 0 - T L) / (T L - Tinf) := by
  have hf := fourier_eq T q k L hk hflux
  have hext' : T L - Tinf ≠ 0 := sub_ne_zero.mpr hext
  have hq : q ≠ 0 := by
    intro h0
    have hderiv := (hflux L).deriv
    simp [h0] at hderiv
    rw [hderiv] at hrobin
    have hz : hcoeff * (T L - Tinf) = 0 := by linarith
    rcases mul_eq_zero.mp hz with hh0 | hext0
    · exact absurd hh0 hh
    · exact hext' hext0
  have hfluxL : -k * deriv T L = q := by
    rw [(hflux L).deriv]
    field_simp [hk]
  have hq_face : q = hcoeff * (T L - Tinf) := by linarith [hrobin, hfluxL]
  have hdrop : T 0 - T L = q * L / k := by
    have h1 : k * (T 0 - T L) = q * L := by linarith [hf]
    field_simp [hk]
    linarith
  rw [hBi, hdrop, hq_face]
  field_simp [hk, hext', hq]

/-- The steady wall's internal drop over its surface drop is `h L / k`.

`hrobin` is `−k T'(L) = h (T(L) − T∞)`. `Bi` is the quotient `h L / k`. -/
theorem biot_eq (T : ℝ → ℝ) (Bi hcoeff k L V A Tinf : ℝ)
    (hk : k ≠ 0) (hA : A ≠ 0)
    (h1 : Differentiable ℝ T) (h2 : Differentiable ℝ (deriv T))
    (h0 : ∀ x, deriv (deriv T) x = 0)
    (hrobin : -k * deriv T L = hcoeff * (T L - Tinf))
    (hext : T L ≠ Tinf)
    (hLdef : L = V / A)
    (hBi : Bi = hcoeff * L / k) :
    Bi = (T 0 - T L) / (T L - Tinf) ∧ Bi = hcoeff * V / (k * A) ∧ Bi * k = hcoeff * L := by
  obtain ⟨hslope, hlin⟩ := linear_profile T h1 h2 h0
  rw [hslope L] at hrobin
  have hext' : T L - Tinf ≠ 0 := sub_ne_zero.mpr hext
  have hdrop : T 0 - T L = -(deriv T 0 * L) := by
    rw [hlin L]
    ring
  have hscaled : hcoeff * L * (T L - Tinf) = -k * deriv T 0 * L := by
    calc
      hcoeff * L * (T L - Tinf) = L * (hcoeff * (T L - Tinf)) := by ring
      _ = L * (-k * deriv T 0) := by rw [hrobin]
      _ = -k * deriv T 0 * L := by ring
  have hratio : Bi = (T 0 - T L) / (T L - Tinf) := by
    rw [hBi, hdrop]
    rw [div_eq_div_iff hk hext']
    nlinarith [hscaled]
  refine ⟨hratio, ?_, ?_⟩
  · rw [hBi, hLdef]
    field_simp
  · rw [hBi]
    field_simp

/-- For positive `h`, `k`, and `L`, the quotient `Bi = h L / k` is positive. -/
theorem biot_sign (Bi hcoeff k L : ℝ) (hh : 0 < hcoeff) (hk : 0 < k) (hL : 0 < L)
    (hBi : Bi = hcoeff * L / k) : 0 < Bi := by
  rw [hBi]
  positivity

/-- For `h > 0`, `k > 0`, `L > 0` and `T(L) > T∞`, the steady wall is hotter inside. -/
theorem biot_hotter_inside (T : ℝ → ℝ) (hcoeff k L q Tinf : ℝ)
    (hk : 0 < k) (hh : 0 < hcoeff) (hL : 0 < L) (hext : Tinf < T L)
    (hflux : ∀ x, HasDerivAt T (-q / k) x)
    (hrobin : -k * deriv T L = hcoeff * (T L - Tinf)) :
    T L < T 0 := by
  have hf := fourier_eq T q k L hk.ne' hflux
  have hfluxL : -k * deriv T L = q := by
    rw [(hflux L).deriv]
    field_simp [hk.ne']
  have hq_face : q = hcoeff * (T L - Tinf) := by linarith [hrobin, hfluxL]
  have hq : 0 < q := by
    rw [hq_face]
    exact mul_pos hh (sub_pos.mpr hext)
  have hdrop : T 0 - T L = q * L / k := by
    have h1 : k * (T 0 - T L) = q * L := by linarith [hf]
    field_simp [hk.ne']
    linarith
  have hpos : 0 < T 0 - T L := by
    rw [hdrop]
    exact div_pos (mul_pos hq hL) hk
  exact sub_pos.mp hpos

/-- With a positive external drop, `Bi < 1` iff the internal drop is smaller. -/
theorem biot_lt_one_iff (Bi Tint Text : ℝ) (hText : 0 < Text) (hBi : Bi = Tint / Text) :
    Bi < 1 ↔ Tint < Text := by
  rw [hBi, div_lt_one hText]

/-- `Bi = 1` exactly when `h L = k`. -/
theorem biot_eq_one (Bi hcoeff k L : ℝ) (hk : k ≠ 0) (hBi : Bi = hcoeff * L / k) :
    Bi = 1 ↔ hcoeff * L = k := by
  rw [hBi]
  field_simp [hk]

/-- At fixed `h` and `L`, `Bi = h L / k` tends to `0` as `k → ∞`. -/
theorem biot_k_tendsto_zero (hcoeff L : ℝ) :
    Tendsto (fun k : ℝ => hcoeff * L / k) atTop (𝓝 0) := by
  have hinv := tendsto_inv_atTop_zero (𝕜 := ℝ)
  have hid : Tendsto (fun k : ℝ => k) atTop atTop := tendsto_id
  have hk : Tendsto (fun k : ℝ => k⁻¹) atTop (𝓝 0) := hinv.comp hid
  simpa [div_eq_mul_inv] using Filter.Tendsto.const_mul (hcoeff * L) hk

/-- Exact profile `T(x) = 2 − x`: `k = h = L = 1`, `T∞ = 0`, `T(L) = 1`, slope `−1`. -/
noncomputable def unitWall (x : ℝ) : ℝ := 2 - x

theorem biot_unit_profile :
    HasDerivAt unitWall (-1) 1 ∧
      (-(1 : ℝ) * deriv unitWall 1 = 1 * (unitWall 1 - 0)) ∧
      ((1 : ℝ) * 1 / 1 = 1) ∧
      unitWall 0 - unitWall 1 = unitWall 1 - 0 := by
  have hderiv : HasDerivAt unitWall (-1) 1 := by
    unfold unitWall
    have h := (hasDerivAt_const (1 : ℝ) (2 : ℝ)).sub (hasDerivAt_id' (1 : ℝ))
    convert h using 1
    ring
  refine ⟨hderiv, ?_, by norm_num, ?_⟩
  · rw [hderiv.deriv]
    norm_num
  · unfold unitWall
    norm_num

/-- Catalog inputs `h = 25`, `L = 0.02`, `k = 16` give `Bi = 1/32`. -/
theorem biot_catalog :
    (25 : ℝ) * (2 / 100) / 16 = 1 / 32 := by
  norm_num

end PhysJS.Biot
