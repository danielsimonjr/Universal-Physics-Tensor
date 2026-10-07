/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-225`. Bridge. Synchrotron cooling time.

The catalog equation is

```
t = 3 m_e c / (4 σ_T γ U_B),     U_B = B² / (2 μ₀)
```

Premises (hypotheses): an ultra-relativistic electron of Lorentz factor `γ`
radiates `P = (4/3) σ_T c γ² U_B` (isotropic pitch angles, no
inverse-Compton loss; the coefficient `4/3` is the Larmor/Thomson result
and is not rederived here), with magnetic energy density
`U_B = B² / (2 μ₀)`, and the cooling time is the energy over the power,
`t = γ m_e c² / P`. `cooling_time_eq` derives both catalog forms.

The loss law is then integrated: `γ̇ = −P / (m_e c²) = −κ γ²` with
`κ = (4/3) σ_T U_B / (m_e c)` gives `1/γ(t) = 1/γ₀ + κ t`
(`inverse_gamma_law`, from the zero derivative of `1/γ − κ t`), and the
time for `γ` to halve is `1/(κ γ₀)`, which is the cooling time at `γ₀`
(`halving_time_eq`). So the catalog time is the e-fold-style timescale of
an exact solution, not an arbitrary dimensional combination.

Not a derivation of `4/3`, `σ_T`, or the Lorentz-invariance argument for
`P`. The 2.45e8 yr figure is not evaluated.
-/

namespace PhysJS.SynchrotronCoolingTime

/-- Both catalog forms of the synchrotron cooling time. -/
theorem cooling_time_eq (t P γ m c σT UB B μ0 : ℝ) (hm : 0 < m) (hc : 0 < c)
    (hσ : 0 < σT) (hγ : 0 < γ) (hUB : 0 < UB) (hμ : 0 < μ0)
    (hP : P = 4 / 3 * σT * c * γ ^ 2 * UB) (hU : UB = B ^ 2 / (2 * μ0))
    (ht : t = γ * m * c ^ 2 / P) :
    t = 3 * m * c / (4 * σT * γ * UB) ∧ t = 3 * m * c * μ0 / (2 * σT * γ * B ^ 2) := by
  have hB : B ≠ 0 := by
    intro h; rw [h] at hU; simp at hU; linarith
  have hμ0 : μ0 ≠ 0 := hμ.ne'
  constructor
  · rw [ht, hP]; field_simp
  · rw [ht, hP, hU]; field_simp; norm_num

/-- `1/γ − κ t` is constant along `γ̇ = −κ γ²`. -/
theorem inverse_gamma_law (γ : ℝ → ℝ) (κ T : ℝ)
    (hpos' : ∀ t ∈ Set.Icc 0 T, 0 < γ t)
    (hcont : ContinuousOn γ (Set.Icc 0 T))
    (hd : ∀ t ∈ Set.Ico 0 T, HasDerivAt γ (-(κ * γ t ^ 2)) t) :
    ∀ t ∈ Set.Icc 0 T, (γ t)⁻¹ = (γ 0)⁻¹ + κ * t := by
  set f : ℝ → ℝ := fun t => (γ t)⁻¹ - κ * t with hf
  have hfc : ContinuousOn f (Set.Icc 0 T) :=
    (hcont.inv₀ (fun t ht => (hpos' t ht).ne')).sub (continuousOn_const.mul continuousOn_id)
  have hder : ∀ t ∈ Set.Ico 0 T, HasDerivWithinAt f 0 (Set.Ici t) t := by
    intro t ht
    have hp := hpos' t ⟨ht.1, ht.2.le⟩
    have h := ((hd t ht).inv hp.ne').sub ((hasDerivAt_id t).const_mul κ)
    have hz : (-(-(κ * γ t ^ 2)) / γ t ^ 2 - κ * 1) = 0 := by
      field_simp; ring
    exact (h.congr_deriv hz).hasDerivWithinAt
  have hconst := constant_of_has_deriv_right_zero hfc hder
  intro t ht
  have := hconst t ht
  simp only [hf, mul_zero, sub_zero] at this
  linarith

/-- The time for `γ` to halve equals the cooling time `3 m c / (4 σ_T γ₀ U_B)`. -/
theorem halving_time_eq (γ : ℝ → ℝ) (m c σT UB T th : ℝ) (hm : 0 < m) (hc : 0 < c)
    (hσ : 0 < σT) (hUB : 0 < UB)
    (hpos' : ∀ t ∈ Set.Icc 0 T, 0 < γ t)
    (hcont : ContinuousOn γ (Set.Icc 0 T))
    (hd : ∀ t ∈ Set.Ico 0 T, HasDerivAt γ (-(4 / 3 * σT * UB / (m * c) * γ t ^ 2)) t)
    (hth : th ∈ Set.Icc 0 T) (hhalf : γ th = γ 0 / 2) :
    th = 3 * m * c / (4 * σT * γ 0 * UB) := by
  have h := inverse_gamma_law γ (4 / 3 * σT * UB / (m * c)) T hpos' hcont hd th hth
  have h0 : 0 < γ 0 := hpos' 0 ⟨le_rfl, hth.1.trans hth.2⟩
  rw [hhalf] at h
  have hk : 4 / 3 * σT * UB / (m * c) ≠ 0 := by positivity
  field_simp at h ⊢
  nlinarith [h]

/-- Negative control: `3/4` is the number; the unit-free alternative `1/2` gives another time. -/
theorem coefficient_not_fixed (m c σT γ UB : ℝ) (hm : 0 < m) (hc : 0 < c) (hσ : 0 < σT)
    (hγ : 0 < γ) (hUB : 0 < UB) :
    3 * m * c / (4 * σT * γ * UB) ≠ 2 * m * c / (4 * σT * γ * UB) := by
  intro h
  have hd : 4 * σT * γ * UB ≠ 0 := by positivity
  rw [div_left_inj' hd] at h
  have : 0 < m * c := by positivity
  linarith

end PhysJS.SynchrotronCoolingTime
