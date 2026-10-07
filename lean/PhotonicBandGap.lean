/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Arctan
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Inverse
import Mathlib.Analysis.Complex.Trigonometric
import Mathlib.LinearAlgebra.Matrix.Notation
import Mathlib.LinearAlgebra.Matrix.Trace
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-236`. Bridge. Photonic band gap of a quarter-wave stack.

The catalog equation is

```
Δω / ω₀ = (4/π) arcsin(|n₂ − n₁| / (n₂ + n₁))
```

`gap_width_eq` derives it from the transfer-matrix trace condition. At
normal incidence a lossless layer of index `n` and phase thickness `φ`
has the characteristic matrix

```
M(n, φ) = [[cos φ, i sin φ / n], [i n sin φ, cos φ]]
```

and the unit cell `M(n₁, φ₁) M(n₂, φ₂)` has half trace
`cos φ₁ cos φ₂ − (1/2)(n₁/n₂ + n₂/n₁) sin φ₁ sin φ₂`
(`halfTrace_eq`, computed from the matrices). Bloch's theorem gives a
propagating wave exactly when `|½ Tr| ≤ 1`; `|½ Tr| > 1` is a gap. For
quarter-wave layers `φ₁ = φ₂ = φ = π ω / (2 ω₀)`. Writing
`φ = π/2 + u` the half trace is `(1 + k) sin² u − k` with
`k = (n₁² + n₂²)/(2 n₁ n₂)`. It never exceeds 1. It is below `−1` exactly
when `sin² u < c²` with `c = |n₁ − n₂|/(n₁ + n₂)`, that is
`|u| < arcsin c` for `|u| ≤ π/2`. The edges are
`ω = ω₀ (1 ± (2/π) arcsin c)`, so `Δω/ω₀ = (4/π) arcsin c`.
This is the first (lowest) gap, in `0 < ω < 2 ω₀`. Premises: infinite
periodic stack, normal incidence, lossless, quarter-wave layers at `ω₀`,
the Bloch criterion `cos(KΛ) = ½ Tr` taken as the definition of a gap.
-/

namespace PhysJS.PhotonicBandGap

open Real Matrix

/-- Characteristic matrix of a lossless layer at normal incidence. -/
noncomputable def layer (n φ : ℝ) : Matrix (Fin 2) (Fin 2) ℂ :=
  !![(Real.cos φ : ℂ), Complex.I * Real.sin φ / n;
     Complex.I * n * Real.sin φ, (Real.cos φ : ℂ)]

/-- Half the real part of the unit-cell trace. -/
noncomputable def halfTrace (n₁ n₂ φ₁ φ₂ : ℝ) : ℝ :=
  (Matrix.trace (layer n₁ φ₁ * layer n₂ φ₂)).re / 2

/-- Half trace of the two-layer unit cell. -/
theorem halfTrace_eq (n₁ n₂ φ₁ φ₂ : ℝ) (h₁ : n₁ ≠ 0) (h₂ : n₂ ≠ 0) :
    halfTrace n₁ n₂ φ₁ φ₂ =
      Real.cos φ₁ * Real.cos φ₂ -
        (1 / 2) * (n₁ / n₂ + n₂ / n₁) * Real.sin φ₁ * Real.sin φ₂ := by
  unfold halfTrace layer
  rw [Matrix.trace_fin_two]
  simp only [Matrix.mul_apply, Fin.sum_univ_two, Matrix.of_apply, Matrix.cons_val',
    Matrix.cons_val_zero, Matrix.cons_val_one, Matrix.empty_val', Matrix.cons_val_fin_one,
    Fin.isValue]
  have h₁' : (n₁ : ℂ) ≠ 0 := Complex.ofReal_ne_zero.mpr h₁
  have h₂' : (n₂ : ℂ) ≠ 0 := Complex.ofReal_ne_zero.mpr h₂
  have hc : Complex.I * Real.sin φ₁ / n₁ * (Complex.I * n₂ * Real.sin φ₂) +
      (Complex.I * n₁ * Real.sin φ₁ * (Complex.I * Real.sin φ₂ / n₂) ) =
      -((n₂ / n₁ + n₁ / n₂ : ℝ) * Real.sin φ₁ * Real.sin φ₂ : ℝ) := by
    push_cast
    field_simp
    ring_nf
    rw [Complex.I_sq]
    ring
  refine (congrArg (fun z : ℂ => z.re / 2)
    (?_ : _ = ((2 * Real.cos φ₁ * Real.cos φ₂ -
      (n₂ / n₁ + n₁ / n₂) * Real.sin φ₁ * Real.sin φ₂ : ℝ) : ℂ))).trans ?_
  · push_cast at hc ⊢
    linear_combination hc
  · simp only [Complex.ofReal_re]
    field_simp
    ring


/-- `k = (n₁² + n₂²) / (2 n₁ n₂)`. -/
noncomputable def kk (n₁ n₂ : ℝ) : ℝ := (n₁ ^ 2 + n₂ ^ 2) / (2 * n₁ * n₂)

/-- Index contrast `c = |n₁ − n₂| / (n₁ + n₂)`. -/
noncomputable def contrast (n₁ n₂ : ℝ) : ℝ := |n₁ - n₂| / (n₁ + n₂)

/-- Quarter-wave half trace in the offset `u = φ − π/2`. -/
theorem quarter_halfTrace (n₁ n₂ u : ℝ) (h₁ : n₁ ≠ 0) (h₂ : n₂ ≠ 0) :
    halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) =
      (1 + kk n₁ n₂) * Real.sin u ^ 2 - kk n₁ n₂ := by
  rw [halfTrace_eq n₁ n₂ _ _ h₁ h₂, add_comm (π / 2) u, Real.cos_add_pi_div_two,
    Real.sin_add_pi_div_two]
  unfold kk
  have hc : Real.cos u ^ 2 = 1 - Real.sin u ^ 2 := by
    rw [← Real.sin_sq_add_cos_sq u]; ring
  have : (1 / 2) * (n₁ / n₂ + n₂ / n₁) = (n₁ ^ 2 + n₂ ^ 2) / (2 * n₁ * n₂) := by
    field_simp
  calc -Real.sin u * -Real.sin u - 1 / 2 * (n₁ / n₂ + n₂ / n₁) * Real.cos u * Real.cos u
      = Real.sin u ^ 2 - ((1 / 2) * (n₁ / n₂ + n₂ / n₁)) * Real.cos u ^ 2 := by ring
    _ = _ := by rw [this, hc]; ring

/-- The identity `c² (1 + k) = k − 1`. -/
theorem contrast_sq (n₁ n₂ : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) :
    contrast n₁ n₂ ^ 2 * (1 + kk n₁ n₂) = kk n₁ n₂ - 1 := by
  unfold contrast kk
  rw [div_pow, sq_abs]
  have : n₁ + n₂ ≠ 0 := by positivity
  field_simp
  ring

theorem contrast_nonneg (n₁ n₂ : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) :
    0 ≤ contrast n₁ n₂ := by
  unfold contrast
  positivity

theorem contrast_le_one (n₁ n₂ : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) :
    contrast n₁ n₂ ≤ 1 := by
  unfold contrast
  rw [div_le_one (by positivity)]
  rw [abs_le]
  constructor <;> linarith

theorem kk_pos (n₁ n₂ : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) : 0 < 1 + kk n₁ n₂ := by
  unfold kk
  positivity

/-- The half trace of a quarter-wave stack never exceeds 1. -/
theorem halfTrace_le_one (n₁ n₂ u : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) :
    halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) ≤ 1 := by
  rw [quarter_halfTrace n₁ n₂ u hn₁.ne' hn₂.ne']
  have h := Real.sin_sq_le_one u
  have hk := kk_pos n₁ n₂ hn₁ hn₂
  nlinarith

/-- Below `−1` exactly when `|sin u| < c`. -/
theorem gap_iff_sin (n₁ n₂ u : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) :
    halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) < -1 ↔
      |Real.sin u| < contrast n₁ n₂ := by
  rw [quarter_halfTrace n₁ n₂ u hn₁.ne' hn₂.ne']
  have hk := kk_pos n₁ n₂ hn₁ hn₂
  have hc := contrast_sq n₁ n₂ hn₁ hn₂
  have hc0 := contrast_nonneg n₁ n₂ hn₁ hn₂
  have h1 : (1 + kk n₁ n₂) * Real.sin u ^ 2 - kk n₁ n₂ < -1 ↔
      Real.sin u ^ 2 < contrast n₁ n₂ ^ 2 := by
    constructor
    · intro h
      by_contra hn
      replace hn := not_lt.mp hn
      nlinarith [mul_le_mul_of_nonneg_left hn hk.le]
    · intro h
      nlinarith [mul_lt_mul_of_pos_left h hk]
  rw [h1, sq_lt_sq, abs_of_nonneg hc0]

/-- At `−1` exactly when `|sin u| = c`. -/
theorem edge_iff_sin (n₁ n₂ u : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) :
    halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) = -1 ↔
      |Real.sin u| = contrast n₁ n₂ := by
  rw [quarter_halfTrace n₁ n₂ u hn₁.ne' hn₂.ne']
  have hk := kk_pos n₁ n₂ hn₁ hn₂
  have hc := contrast_sq n₁ n₂ hn₁ hn₂
  have hc0 := contrast_nonneg n₁ n₂ hn₁ hn₂
  have h1 : (1 + kk n₁ n₂) * Real.sin u ^ 2 - kk n₁ n₂ = -1 ↔
      Real.sin u ^ 2 = contrast n₁ n₂ ^ 2 := by
    constructor
    · intro h
      have : (1 + kk n₁ n₂) * (Real.sin u ^ 2 - contrast n₁ n₂ ^ 2) = 0 := by
        nlinarith
      rcases mul_eq_zero.mp this with h0 | h0
      · exact absurd h0 hk.ne'
      · linarith
    · intro h
      rw [h]
      nlinarith
  rw [h1, sq_eq_sq_iff_abs_eq_abs, abs_of_nonneg hc0]

/-- For `|u| ≤ π/2`, `|sin u| = sin |u|`. -/
theorem abs_sin_eq (u : ℝ) (hu : |u| ≤ π / 2) : |Real.sin u| = Real.sin |u| := by
  rcases le_total 0 u with h | h
  · rw [abs_of_nonneg h, abs_of_nonneg (Real.sin_nonneg_of_nonneg_of_le_pi h
      (by linarith [Real.pi_pos, abs_of_nonneg h]))]
  · have hs : Real.sin u ≤ 0 := Real.sin_nonpos_of_nonpos_of_neg_pi_le h
      (by rw [abs_of_nonpos h] at hu; linarith [Real.pi_pos])
    rw [abs_of_nonpos h, Real.sin_neg, abs_of_nonpos hs]

/-- Gap interior in the offset angle. -/
theorem gap_iff_u (n₁ n₂ u : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) (hu : |u| ≤ π / 2) :
    halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) < -1 ↔
      |u| < Real.arcsin (contrast n₁ n₂) := by
  rw [gap_iff_sin n₁ n₂ u hn₁ hn₂, abs_sin_eq u hu]
  have hc0 := contrast_nonneg n₁ n₂ hn₁ hn₂
  have hc1 := contrast_le_one n₁ n₂ hn₁ hn₂
  rw [Real.lt_arcsin_iff_sin_lt ⟨by linarith [abs_nonneg u, Real.pi_pos], hu⟩
    ⟨by linarith, hc1⟩]

/-- Gap edges in the offset angle. -/
theorem edge_iff_u (n₁ n₂ u : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂) (hu : |u| ≤ π / 2) :
    halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) = -1 ↔
      |u| = Real.arcsin (contrast n₁ n₂) := by
  rw [edge_iff_sin n₁ n₂ u hn₁ hn₂, abs_sin_eq u hu]
  have hc0 := contrast_nonneg n₁ n₂ hn₁ hn₂
  have hc1 := contrast_le_one n₁ n₂ hn₁ hn₂
  constructor
  · intro h
    rw [← h, Real.arcsin_sin (by linarith [abs_nonneg u, Real.pi_pos]) hu]
  · intro h
    rw [h, Real.sin_arcsin (by linarith) hc1]

/-- The two band edges of the first gap and its relative width.

`φ(ω) = π ω / (2 ω₀)` is the quarter-wave phase. `ωlo < ωhi` are two
frequencies in the first band pair `(0, 2ω₀)` at which the half trace of the
unit cell equals `−1`, the Bloch band edges.

Kind `bridge` on `PhysJS.PhotonicBandGap.gap_width_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not
higher-order gaps, oblique incidence, or a finite stack. -/
theorem gap_width_eq (n₁ n₂ ω₀ ωlo ωhi : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂)
    (hω₀ : 0 < ω₀) (hlo₀ : 0 < ωlo) (hlo₁ : ωlo < 2 * ω₀)
    (hhi₀ : 0 < ωhi) (hhi₁ : ωhi < 2 * ω₀) (hlt : ωlo < ωhi)
    (hlo : halfTrace n₁ n₂ (π * ωlo / (2 * ω₀)) (π * ωlo / (2 * ω₀)) = -1)
    (hhi : halfTrace n₁ n₂ (π * ωhi / (2 * ω₀)) (π * ωhi / (2 * ω₀)) = -1) :
    (ωhi - ωlo) / ω₀ = (4 / π) * Real.arcsin (contrast n₁ n₂) := by
  have hpi := Real.pi_pos
  have key : ∀ ω, 0 < ω → ω < 2 * ω₀ →
      halfTrace n₁ n₂ (π * ω / (2 * ω₀)) (π * ω / (2 * ω₀)) = -1 →
      |ω - ω₀| = (2 * ω₀ / π) * Real.arcsin (contrast n₁ n₂) := by
    intro ω h0 h1 h
    have hphi : π * ω / (2 * ω₀) = π / 2 + π * (ω - ω₀) / (2 * ω₀) := by
      field_simp
      ring
    rw [hphi] at h
    have hu : |π * (ω - ω₀) / (2 * ω₀)| ≤ π / 2 := by
      rw [abs_div, abs_mul, abs_of_pos hpi, abs_of_pos (by positivity : 0 < 2 * ω₀),
        div_le_div_iff₀ (by positivity) (by norm_num)]
      have : |ω - ω₀| ≤ ω₀ := by
        rw [abs_le]; constructor <;> linarith
      nlinarith
    have h2 := (edge_iff_u n₁ n₂ _ hn₁ hn₂ hu).mp h
    rw [abs_div, abs_mul, abs_of_pos hpi, abs_of_pos (by positivity : 0 < 2 * ω₀)] at h2
    field_simp at h2 ⊢
    linarith
  have h1 := key ωlo hlo₀ hlo₁ hlo
  have h2 := key ωhi hhi₀ hhi₁ hhi
  set r := (2 * ω₀ / π) * Real.arcsin (contrast n₁ n₂) with hr
  have hlo' : ωlo = ω₀ - r := by
    rcases abs_cases (ωlo - ω₀) with ⟨h, _⟩ | ⟨h, _⟩ <;> rw [h] at h1
    · rcases abs_cases (ωhi - ω₀) with ⟨h', _⟩ | ⟨h', _⟩ <;> rw [h'] at h2 <;> linarith
    · linarith
  have hhi' : ωhi = ω₀ + r := by
    rcases abs_cases (ωhi - ω₀) with ⟨h, _⟩ | ⟨h, _⟩ <;> rw [h] at h2
    · linarith
    · rcases abs_cases (ωlo - ω₀) with ⟨h', _⟩ | ⟨h', _⟩ <;> rw [h'] at h1 <;> linarith
  rw [hlo', hhi', hr]
  field_simp
  ring

/-- Equal indices open no gap: the contrast is zero. -/
theorem no_gap_matched (n : ℝ) : contrast n n = 0 := by
  simp [contrast]

/-- Inside the gap the half trace is below `−1`; outside the gap, within
the first band pair, it is at least `−1`. -/
theorem outside_gap_ge (n₁ n₂ u : ℝ) (hn₁ : 0 < n₁) (hn₂ : 0 < n₂)
    (hu : |u| ≤ π / 2) (hout : Real.arcsin (contrast n₁ n₂) ≤ |u|) :
    -1 ≤ halfTrace n₁ n₂ (π / 2 + u) (π / 2 + u) := by
  by_contra h
  replace h := not_le.mp h
  have := (gap_iff_u n₁ n₂ u hn₁ hn₂ hu).mp h
  linarith

end PhysJS.PhotonicBandGap
