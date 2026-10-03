/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.Real.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-68`. Bridge. Tolman–Ehrenfest in the repository signature.

The catalog equation is

```
T √(-g_00) = const
```

in the signature `(−,+,+,+)`, so `g_00 < 0` outside a horizon.
`hydrostatic_constant` derives the equality of the product at the
endpoints of an interval. The premises, at each interior point, are

```
dp = -(ρ + p) d ln N
dp = (ρ + p) d ln T
N = √(-g_00)
```

with `ρ + p ≠ 0`. The first is hydrostatic equilibrium in the static
metric, written on the lapse. The second is the equilibrium Gibbs
relation used for vanishing chemical-potential gradient. Neither is
derived here from `∇_μ T^{μν} = 0` or from an equation of state.
`redshift_equilibrium` is the other route: one coordinate period has
proper frequency `ν √(-g_00) = 1/Δt`, and equilibrium means the two
static observers assign the same `T / ν`.

`units_do_not_entail` is the negative control on dimensions. `{d ln T}`
and `{g dr / c²}` are two dimensionless groups, and a constant
temperature does not force them to agree. `mostly_plus_needs_the_minus`
uses that Mathlib's `Real.sqrt` returns `0` on a negative input, so the
product without the minus is `0`. `signature_translation` is the 1930
writing: `T √g_44 = T √(-g_00)` when `g_44 = -g_00`.

Not a horizon temperature. Not `PhysJS.HawkingUnruh.dictionary`.
`T ‖ξ‖ = const` is out of scope.
-/

namespace PhysJS.TolmanEhrenfest

open Real Set Filter

/-- The catalog product in the signature `(−,+,+,+)`. -/
noncomputable def tolmanProduct (T g00 : ℝ) : ℝ :=
  T * Real.sqrt (-g00)

/-- Hydrostatic balance and the equilibrium Gibbs relation kill the
derivative of `ln T + ln N`.

`N = exp logLapse` and `T = exp logT`. `hhydro` and `hgibbs` are the two
expressions for one pressure derivative. -/
theorem log_sum_deriv_zero (logT logLapse p : ℝ → ℝ) (ρp : ℝ) (z dL dT : ℝ)
    (hlogT : HasDerivAt logT dT z) (hlogL : HasDerivAt logLapse dL z)
    (hhydro : HasDerivAt p (-(ρp * dL)) z) (hgibbs : HasDerivAt p (ρp * dT) z)
    (hρ : ρp ≠ 0) :
    HasDerivAt (fun y => logT y + logLapse y) 0 z := by
  have heq : ρp * dT = -(ρp * dL) := by
    have h1 := hgibbs.deriv
    have h2 := hhydro.deriv
    rw [← h1, h2]
  have hd : dT = -dL := by
    apply mul_left_cancel₀ hρ
    calc
      ρp * dT = -(ρp * dL) := heq
      _ = ρp * -dL := by ring
  have hsum := hlogT.add hlogL
  exact hsum.congr_deriv (by rw [hd]; ring)

/-- Those two relations give `d/dz (T N) = 0`. -/
theorem product_deriv_zero (T lapse logT logLapse p : ℝ → ℝ) (ρp : ℝ) (z : ℝ)
    (hT : ∀ y, T y = Real.exp (logT y)) (hL : ∀ y, lapse y = Real.exp (logLapse y))
    (hlogT : DifferentiableAt ℝ logT z) (hlogL : DifferentiableAt ℝ logLapse z)
    (hhydro : HasDerivAt p (-(ρp * deriv logLapse z)) z)
    (hgibbs : HasDerivAt p (ρp * deriv logT z) z) (hρ : ρp ≠ 0) :
    HasDerivAt (fun y => T y * lapse y) 0 z := by
  have hsum := log_sum_deriv_zero logT logLapse p ρp z (deriv logLapse z) (deriv logT z)
    hlogT.hasDerivAt hlogL.hasDerivAt hhydro hgibbs hρ
  have hexp := hsum.exp
  have hexp0 := hexp.congr_deriv (mul_zero (Real.exp (logT z + logLapse z)))
  have hfun : ∀ y, T y * lapse y = Real.exp (logT y + logLapse y) := by
    intro y
    rw [hT y, hL y, Real.exp_add]
  exact hexp0.congr_of_eventuallyEq (Eventually.of_forall hfun)

/-- On a static interval, `T √(-g_00)` agrees at the endpoints.

`hstatic` is the lapse of a static observer in the signature `(−,+,+,+)`.
`hhydro` and `hgibbs` are the equilibrium premises on the open interval.
`hcont` is continuity of `T N` up to the endpoints. The hydrostatic
equation is not derived from `∇_μ T^{μν} = 0`, and the Gibbs relation is
not derived from an equation of state.

Kind `bridge` on `PhysJS.TolmanEhrenfest.hydrostatic_constant`. The covers
line still begins with `derivation-step`. Not a horizon temperature, and
not `T ‖ξ‖ = const`. -/
theorem hydrostatic_constant (T lapse g00 logT logLapse p ρp : ℝ → ℝ) {a b : ℝ}
    (hab : a < b) (hT : ∀ y, T y = Real.exp (logT y))
    (hL : ∀ y, lapse y = Real.exp (logLapse y))
    (hstatic : ∀ z ∈ Icc a b, lapse z = Real.sqrt (-g00 z))
    (hlogT : ∀ z ∈ Ioo a b, DifferentiableAt ℝ logT z)
    (hlogL : ∀ z ∈ Ioo a b, DifferentiableAt ℝ logLapse z)
    (hhydro : ∀ z ∈ Ioo a b, HasDerivAt p (-(ρp z * deriv logLapse z)) z)
    (hgibbs : ∀ z ∈ Ioo a b, HasDerivAt p (ρp z * deriv logT z) z)
    (hρ : ∀ z ∈ Ioo a b, ρp z ≠ 0)
    (hcont : ContinuousOn (fun z => T z * lapse z) (Icc a b)) :
    tolmanProduct (T a) (g00 a) = tolmanProduct (T b) (g00 b) := by
  have hderiv : ∀ z ∈ Ioo a b, HasDerivAt (fun y => T y * lapse y) 0 z := by
    intro z hz
    exact product_deriv_zero T lapse logT logLapse p (ρp z) z hT hL (hlogT z hz)
      (hlogL z hz) (hhydro z hz) (hgibbs z hz) (hρ z hz)
  obtain ⟨_c, _hc, hslope⟩ :=
    exists_hasDerivAt_eq_slope (fun z => T z * lapse z) (fun _ => (0 : ℝ)) hab hcont hderiv
  have hsub : b - a ≠ 0 := sub_ne_zero.mpr hab.ne'
  have hdiff : T b * lapse b = T a * lapse a := by
    have hzero : (T b * lapse b - T a * lapse a) / (b - a) = 0 := hslope.symm
    rw [div_eq_zero_iff] at hzero
    rcases hzero with h | h
    · linarith
    · exact absurd h hsub
  have ha : a ∈ Icc a b := left_mem_Icc.mpr hab.le
  have hbmem : b ∈ Icc a b := right_mem_Icc.mpr hab.le
  unfold tolmanProduct
  rw [← hstatic a ha, ← hstatic b hbmem]
  exact hdiff.symm

/-- Proper frequency of one coordinate period, and `T / ν` the same for two
static observers, give the same product.

`hfreq` is the static redshift in the signature `(−,+,+,+)`. `heq` is the
equilibrium hypothesis. This does not use the hydrostatic equation. -/
theorem redshift_equilibrium (T1 T2 ν1 ν2 g1 g2 Δt : ℝ) (hg1 : g1 < 0) (hg2 : g2 < 0)
    (hΔ : 0 < Δt) (hν1 : ν1 ≠ 0) (hν2 : ν2 ≠ 0)
    (hfreq1 : ν1 * Real.sqrt (-g1) = 1 / Δt) (hfreq2 : ν2 * Real.sqrt (-g2) = 1 / Δt)
    (heq : T1 / ν1 = T2 / ν2) :
    tolmanProduct T1 g1 = tolmanProduct T2 g2 := by
  have _hg1 : 0 < -g1 := neg_pos.mpr hg1
  have _hg2 : 0 < -g2 := neg_pos.mpr hg2
  have hfreq1' : ν1 * Real.sqrt (-g1) * Δt = 1 := by
    field_simp [hΔ.ne'] at hfreq1
    exact hfreq1
  have hfreq2' : ν2 * Real.sqrt (-g2) * Δt = 1 := by
    field_simp [hΔ.ne'] at hfreq2
    exact hfreq2
  have h1 : T1 * Real.sqrt (-g1) = (T1 / ν1) * (1 / Δt) := by
    field_simp [hν1, hΔ.ne']
    calc
      T1 * Real.sqrt (-g1) * ν1 * Δt = T1 * (ν1 * Real.sqrt (-g1) * Δt) := by ring
      _ = T1 := by rw [hfreq1']; ring
  have h2 : T2 * Real.sqrt (-g2) = (T2 / ν2) * (1 / Δt) := by
    field_simp [hν2, hΔ.ne']
    calc
      T2 * Real.sqrt (-g2) * ν2 * Δt = T2 * (ν2 * Real.sqrt (-g2) * Δt) := by ring
      _ = T2 := by rw [hfreq2']; ring
  unfold tolmanProduct
  rw [h1, h2, heq]

/-- Two dimensionless groups do not force the identification.

A constant temperature has `dlnT = 0` while `g dr / c^2` need not vanish. -/
theorem units_do_not_entail
    (dlnT g c dr : ℝ) (hc : 0 < c) (hgroups : dlnT = 0) (hg : g * dr / c ^ 2 ≠ 0) :
    dlnT ≠ g * dr / c ^ 2 := by
  have _hc2 : 0 < c ^ 2 := sq_pos_of_pos hc
  rw [hgroups]
  exact hg.symm

/-- In the repository signature, `g00 < 0`. Mathlib's `Real.sqrt` returns 0
on a negative input, so `sqrt g00 = 0` and is not the criterion.

The minus sign is the signature hypothesis. -/
theorem mostly_plus_needs_the_minus
    (T g00 : ℝ) (hT : 0 < T) (hg : g00 < 0) :
    T * Real.sqrt (-g00) ≠ T * Real.sqrt g00 := by
  have hsqrt : Real.sqrt g00 = 0 := Real.sqrt_eq_zero_of_nonpos hg.le
  have hpos : 0 < Real.sqrt (-g00) := Real.sqrt_pos.mpr (neg_pos.mpr hg)
  intro hEq
  rw [hsqrt, mul_zero] at hEq
  exact (mul_pos hT hpos).ne' hEq

/-- The 1930 writing uses a positive `g_44`. It is the same product when
`g_44 = -g_00`. -/
theorem signature_translation (T g00 g44 : ℝ) (h : g44 = -g00) :
    T * Real.sqrt g44 = T * Real.sqrt (-g00) := by
  rw [h]

end PhysJS.TolmanEhrenfest
