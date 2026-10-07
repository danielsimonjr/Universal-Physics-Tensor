/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.DerivHyp
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Bounds
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-172`. Bridge. Cantilever fundamental frequency.

The catalog equation is

```
f₁ = (λ₁² / 2π) √(E I / (ρ A L⁴)),    cos λ₁ cosh λ₁ = −1
```

with `λ₁` the first positive root. `frequency_eq` derives the frequency
formula from the Euler–Bernoulli beam equation `E I w'''' + ρ A ẅ = 0`.
Separation `w = φ(x) cos(ω t)` gives `E I φ'''' = ρ A ω² φ`. With
`φ'''' = β⁴ φ` this is `β⁴ E I = ρ A ω²`, so `ω = β² √(E I / (ρ A))`. The
general mode is `a cos βx + b sin βx + c cosh βx + d sinh βx`. The clamp
(`φ(0) = φ'(0) = 0`) removes `c, d`; the free end (`φ''(L) = φ'''(L) = 0`)
leaves a 2 × 2 system with determinant `2 (1 + cos λ cosh λ)`, `λ = β L`.
A nontrivial mode therefore needs `cos λ cosh λ = −1`
(`characteristic_equation`).

`first_root` proves the root is real and bracketed. `g(λ) = cos λ cosh λ + 1`
is positive on `(0, π/2]`, equals `1` at `π/2`, and is negative at `π`
(`cosh π > 1`), so the intermediate value theorem puts a root in
`(π/2, π)`. On that interval `g' = cos sinh − sin cosh < 0`, so the root is
the only one below `π` and hence the first. This certifies the bracket
`π²/4 < λ₁² < π²`. It does **not** evaluate the decimal `1.8751`; the
number is the root of a transcendental equation and is left as such.

Premises: Euler–Bernoulli, uniform section, no added mass, no damping, rigid
clamp. `effective_mass` is the consistency check with the tip stiffness
`3 E I / L³` of `be-171`: the Rayleigh mass is `3 ρ A L / λ⁴`. This is not
the pinned–pinned or clamped–clamped spectrum.
-/

namespace PhysJS.CantileverFrequency

open Real

/-- The characteristic function `cos λ cosh λ + 1`. -/
noncomputable def g (l : ℝ) : ℝ := Real.cos l * Real.cosh l + 1

lemma g_continuous : Continuous g := by
  unfold g
  fun_prop

lemma g_hasDerivAt (y : ℝ) :
    HasDerivAt g (-Real.sin y * Real.cosh y + Real.cos y * Real.sinh y) y := by
  have h1 := (Real.hasDerivAt_cos y).mul (Real.hasDerivAt_cosh y)
  have h2 := h1.add_const 1
  exact h2

/-- No positive root up to `π / 2`: both factors are nonnegative there. -/
theorem no_root_low (y : ℝ) (hy : 0 < y) (hy2 : y ≤ π / 2) : 0 < g y := by
  unfold g
  have hc : 0 ≤ Real.cos y :=
    Real.cos_nonneg_of_neg_pi_div_two_le_of_le (by linarith [Real.pi_pos]) hy2
  have hch : 1 ≤ Real.cosh y := Real.one_le_cosh y
  nlinarith

/-- `g` strictly decreases on `[π/2, π]`. -/
theorem g_strictAnti : StrictAntiOn g (Set.Icc (π / 2) π) := by
  refine strictAntiOn_of_deriv_neg (convex_Icc _ _) g_continuous.continuousOn ?_
  intro y hy
  rw [interior_Icc] at hy
  obtain ⟨hy1, hy2⟩ := hy
  rw [(g_hasDerivAt y).deriv]
  have hs : 0 < Real.sin y :=
    Real.sin_pos_of_pos_of_lt_pi (by linarith [Real.pi_pos]) hy2
  have hc : Real.cos y < 0 :=
    Real.cos_neg_of_pi_div_two_lt_of_lt hy1 (by linarith [Real.pi_pos])
  have hch : 0 < Real.cosh y := Real.cosh_pos y
  have hsh : 0 < Real.sinh y := Real.sinh_pos_iff.mpr (by linarith [Real.pi_pos])
  nlinarith [mul_pos hs hch, mul_neg_of_neg_of_pos hc hsh]

/-- Existence, bracketing and uniqueness of the first positive root of
`cos λ cosh λ = −1`. -/
theorem first_root :
    ∃ l : ℝ, π / 2 < l ∧ l < π ∧ Real.cos l * Real.cosh l = -1 ∧
      (∀ y, 0 < y → y < π → Real.cos y * Real.cosh y = -1 → y = l) ∧
      (∀ y, 0 < y → y < l → Real.cos y * Real.cosh y ≠ -1) := by
  have hpi := Real.pi_pos
  have ha : g (π / 2) = 1 := by simp [g]
  have hb : g π < 0 := by
    have : 1 < Real.cosh π := Real.one_lt_cosh.mpr hpi.ne'
    simp only [g, Real.cos_pi]
    linarith
  obtain ⟨l, hl, hgl⟩ := intermediate_value_Icc' (by linarith : π / 2 ≤ π)
    g_continuous.continuousOn (show (0 : ℝ) ∈ Set.Icc (g π) (g (π / 2)) from
      ⟨hb.le, by rw [ha]; norm_num⟩)
  have hl1 : π / 2 < l := by
    rcases hl.1.eq_or_lt with h | h
    · rw [← h, ha] at hgl; norm_num at hgl
    · exact h
  have hl2 : l < π := by
    rcases hl.2.eq_or_lt with h | h
    · rw [h] at hgl; linarith
    · exact h
  have hroot : Real.cos l * Real.cosh l = -1 := by
    have : Real.cos l * Real.cosh l + 1 = 0 := hgl
    linarith
  have huniq : ∀ y, 0 < y → y < π → Real.cos y * Real.cosh y = -1 → y = l := by
    intro y hy hyπ hyr
    have hgy : g y = 0 := by unfold g; linarith
    by_cases hlow : y ≤ π / 2
    · have := no_root_low y hy hlow
      linarith
    · rw [not_le] at hlow
      exact g_strictAnti.injOn ⟨hlow.le, hyπ.le⟩ ⟨hl1.le, hl2.le⟩ (hgy.trans hgl.symm)
  refine ⟨l, hl1, hl2, hroot, huniq, ?_⟩
  intro y hy hyl hyr
  have := huniq y hy (by linarith) hyr
  linarith

/-- The mode `a cos βx + b sin βx + c cosh βx + d sinh βx`. -/
noncomputable def phi (a b c d β x : ℝ) : ℝ :=
  a * Real.cos (β * x) + b * Real.sin (β * x) + c * Real.cosh (β * x) + d * Real.sinh (β * x)

noncomputable def phi1 (a b c d β x : ℝ) : ℝ :=
  β * (-a * Real.sin (β * x) + b * Real.cos (β * x) + c * Real.sinh (β * x) + d * Real.cosh (β * x))

noncomputable def phi2 (a b c d β x : ℝ) : ℝ :=
  β ^ 2 * (-a * Real.cos (β * x) + -b * Real.sin (β * x) + c * Real.cosh (β * x) + d * Real.sinh (β * x))

noncomputable def phi3 (a b c d β x : ℝ) : ℝ :=
  β ^ 3 * (a * Real.sin (β * x) + -b * Real.cos (β * x) + c * Real.sinh (β * x) + d * Real.cosh (β * x))

noncomputable def phi4 (a b c d β x : ℝ) : ℝ :=
  β ^ 4 * (a * Real.cos (β * x) + b * Real.sin (β * x) + c * Real.cosh (β * x) + d * Real.sinh (β * x))

private lemma inner (β x : ℝ) : HasDerivAt (fun t => β * t) β x := by
  simpa using (hasDerivAt_id x).const_mul β

private lemma dcos (β x : ℝ) : HasDerivAt (fun t => Real.cos (β * t)) (-Real.sin (β * x) * β) x :=
  (Real.hasDerivAt_cos (β * x)).comp x (inner β x)

private lemma dsin (β x : ℝ) : HasDerivAt (fun t => Real.sin (β * t)) (Real.cos (β * x) * β) x :=
  (Real.hasDerivAt_sin (β * x)).comp x (inner β x)

private lemma dcosh (β x : ℝ) : HasDerivAt (fun t => Real.cosh (β * t)) (Real.sinh (β * x) * β) x :=
  (Real.hasDerivAt_cosh (β * x)).comp x (inner β x)

private lemma dsinh (β x : ℝ) : HasDerivAt (fun t => Real.sinh (β * t)) (Real.cosh (β * x) * β) x :=
  (Real.hasDerivAt_sinh (β * x)).comp x (inner β x)

/-- A four-term combination of `cos, sin, cosh, sinh` of `β t` has the
expected derivative. -/
private lemma comb (a b c d β x : ℝ) :
    HasDerivAt (fun t => a * Real.cos (β * t) + b * Real.sin (β * t) +
        c * Real.cosh (β * t) + d * Real.sinh (β * t))
      (β * (-a * Real.sin (β * x) + b * Real.cos (β * x) + c * Real.sinh (β * x) +
        d * Real.cosh (β * x))) x := by
  have := ((((dcos β x).const_mul a).add ((dsin β x).const_mul b)).add
    ((dcosh β x).const_mul c)).add ((dsinh β x).const_mul d)
  exact this.congr_deriv (by ring)

/-- The companion family with `sin, cos, sinh, cosh`. -/
private lemma comb' (p q r s β x : ℝ) :
    HasDerivAt (fun t => p * Real.sin (β * t) + q * Real.cos (β * t) +
        r * Real.sinh (β * t) + s * Real.cosh (β * t))
      (β * (p * Real.cos (β * x) - q * Real.sin (β * x) + r * Real.cosh (β * x) +
        s * Real.sinh (β * x))) x := by
  have := ((((dsin β x).const_mul p).add ((dcos β x).const_mul q)).add
    ((dsinh β x).const_mul r)).add ((dcosh β x).const_mul s)
  exact this.congr_deriv (by ring)

/-- First derivative of the mode. -/
lemma phi_deriv (a b c d β x : ℝ) : HasDerivAt (phi a b c d β) (phi1 a b c d β x) x :=
  comb a b c d β x

/-- Second derivative of the mode. -/
lemma phi1_deriv (a b c d β x : ℝ) : HasDerivAt (phi1 a b c d β) (phi2 a b c d β x) x := by
  have h := (comb' (-a) b c d β x).const_mul β
  refine h.congr_deriv ?_
  unfold phi2
  ring

/-- Third derivative of the mode. -/
lemma phi2_deriv (a b c d β x : ℝ) : HasDerivAt (phi2 a b c d β) (phi3 a b c d β x) x := by
  have h := (comb (-a) (-b) c d β x).const_mul (β ^ 2)
  refine h.congr_deriv ?_
  unfold phi3
  ring

/-- Fourth derivative of the mode. -/
lemma phi3_deriv (a b c d β x : ℝ) : HasDerivAt (phi3 a b c d β) (phi4 a b c d β x) x := by
  have h := (comb' a (-b) c d β x).const_mul (β ^ 3)
  refine h.congr_deriv ?_
  unfold phi4
  ring

/-- The fourth derivative is `β⁴ φ`. -/
lemma phi4_eq (a b c d β x : ℝ) : phi4 a b c d β x = β ^ 4 * phi a b c d β x := by
  unfold phi4 phi
  ring

/-- Clamped–free boundary conditions force `cos λ cosh λ = −1` for a
nontrivial mode. The hypotheses are `φ(0) = φ'(0) = 0` and
`φ''(L) = φ'''(L) = 0`. -/
theorem characteristic_equation (a b c d β L : ℝ) (hβ : β ≠ 0)
    (h0 : phi a b c d β 0 = 0) (h1 : phi1 a b c d β 0 = 0)
    (h2 : phi2 a b c d β L = 0) (h3 : phi3 a b c d β L = 0)
    (hnt : a ≠ 0 ∨ b ≠ 0) :
    Real.cos (β * L) * Real.cosh (β * L) = -1 := by
  unfold phi at h0
  unfold phi1 at h1
  unfold phi2 at h2
  unfold phi3 at h3
  simp only [mul_zero, Real.cos_zero, Real.sin_zero, Real.cosh_zero, Real.sinh_zero] at h0 h1
  have hc : c = -a := by linarith
  have hb' : β * (b + d) = 0 := by linarith
  have hd : d = -b := by
    rcases mul_eq_zero.mp hb' with h | h
    · exact absurd h hβ
    · linarith
  subst hc hd
  have e1 : -a * (Real.cos (β * L) + Real.cosh (β * L)) -
      b * (Real.sin (β * L) + Real.sinh (β * L)) = 0 := by
    have hβ2 : β ^ 2 ≠ 0 := pow_ne_zero 2 hβ
    rcases mul_eq_zero.mp h2 with h | h
    · exact absurd h hβ2
    · linarith
  have e2 : a * (Real.sin (β * L) - Real.sinh (β * L)) -
      b * (Real.cos (β * L) + Real.cosh (β * L)) = 0 := by
    have hβ3 : β ^ 3 ≠ 0 := pow_ne_zero 3 hβ
    rcases mul_eq_zero.mp h3 with h | h
    · exact absurd h hβ3
    · linarith
  have hcs : Real.cos (β * L) ^ 2 + Real.sin (β * L) ^ 2 = 1 := Real.cos_sq_add_sin_sq _
  have hhyp : Real.cosh (β * L) ^ 2 - Real.sinh (β * L) ^ 2 = 1 := Real.cosh_sq_sub_sinh_sq _
  have hdet : (2 * (1 + Real.cos (β * L) * Real.cosh (β * L))) * a = 0 ∧
      (2 * (1 + Real.cos (β * L) * Real.cosh (β * L))) * b = 0 := by
    constructor
    · linear_combination (-(Real.cos (β * L) + Real.cosh (β * L))) * e1 +
        (Real.sin (β * L) + Real.sinh (β * L)) * e2 - a * hcs - a * hhyp
    · linear_combination (-(Real.sin (β * L) - Real.sinh (β * L))) * e1 -
        (Real.cos (β * L) + Real.cosh (β * L)) * e2 - b * hcs - b * hhyp
  have hzero : 1 + Real.cos (β * L) * Real.cosh (β * L) = 0 := by
    rcases hnt with ha | hb
    · rcases mul_eq_zero.mp hdet.1 with h | h
      · linarith
      · exact absurd h ha
    · rcases mul_eq_zero.mp hdet.2 with h | h
      · linarith
      · exact absurd h hb
  linarith

/-- Conversely, a root in `(0, π)` gives a nontrivial clamped–free mode. -/
theorem mode_exists (β L : ℝ) (hβ : 0 < β) (hL : 0 < L)
    (hlam : β * L < π) (hroot : Real.cos (β * L) * Real.cosh (β * L) = -1) :
    ∃ a b c d : ℝ, (a ≠ 0 ∨ b ≠ 0) ∧ phi a b c d β 0 = 0 ∧ phi1 a b c d β 0 = 0 ∧
      phi2 a b c d β L = 0 ∧ phi3 a b c d β L = 0 := by
  have hlp : 0 < β * L := mul_pos hβ hL
  have hs : 0 < Real.sin (β * L) := Real.sin_pos_of_pos_of_lt_pi hlp hlam
  have hsh : 0 < Real.sinh (β * L) := Real.sinh_pos_iff.mpr hlp
  have hcs : Real.cos (β * L) ^ 2 + Real.sin (β * L) ^ 2 = 1 := Real.cos_sq_add_sin_sq _
  have hhyp : Real.cosh (β * L) ^ 2 - Real.sinh (β * L) ^ 2 = 1 := Real.cosh_sq_sub_sinh_sq _
  refine ⟨Real.sin (β * L) + Real.sinh (β * L),
    -(Real.cos (β * L) + Real.cosh (β * L)), -(Real.sin (β * L) + Real.sinh (β * L)),
    (Real.cos (β * L) + Real.cosh (β * L)), Or.inl (by linarith), ?_, ?_, ?_, ?_⟩
  · simp [phi]
  · simp [phi1]
  · simp only [phi2]
    ring
  · simp only [phi3]
    linear_combination (β ^ 3) * (hcs + hhyp + 2 * hroot)

/-- The cantilever fundamental frequency.

`hsep` is the separated beam equation `E I φ⁗ = ρ A ω² φ`. The boundary
conditions are clamp and free end. `hfund` says `λ = β L` is the smallest
positive root, which is what the fundamental mode is.

Kind `bridge` on `PhysJS.CantileverFrequency.frequency_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
decimal for `λ₁`, and not an added-mass or damped frequency. -/
theorem frequency_eq (E I ρ A L ω β a b c d : ℝ)
    (hE : 0 < E) (hI : 0 < I) (hρ : 0 < ρ) (hA : 0 < A) (hL : 0 < L)
    (hω : 0 < ω) (hβ : 0 < β)
    (hsep : ∀ x, E * I * phi4 a b c d β x = ρ * A * ω ^ 2 * phi a b c d β x)
    (hnz : ∃ x0, phi a b c d β x0 ≠ 0)
    (h0 : phi a b c d β 0 = 0) (h1 : phi1 a b c d β 0 = 0)
    (h2 : phi2 a b c d β L = 0) (h3 : phi3 a b c d β L = 0) (hnt : a ≠ 0 ∨ b ≠ 0)
    (hfund : ∀ y, 0 < y → y < β * L → Real.cos y * Real.cosh y ≠ -1) :
    Real.cos (β * L) * Real.cosh (β * L) = -1 ∧
      π / 2 < β * L ∧ β * L < π ∧
      π ^ 2 / 4 < (β * L) ^ 2 ∧ (β * L) ^ 2 < π ^ 2 ∧
      ω = (β * L) ^ 2 / L ^ 2 * Real.sqrt (E * I / (ρ * A)) ∧
      ω / (2 * π) = (β * L) ^ 2 / (2 * π) * Real.sqrt (E * I / (ρ * A * L ^ 4)) := by
  have hroot := characteristic_equation a b c d β L hβ.ne' h0 h1 h2 h3 hnt
  obtain ⟨l, hl1, hl2, hlr, huniq, _⟩ := first_root
  have hlp : 0 < β * L := mul_pos hβ hL
  have hle : β * L ≤ l := by
    by_contra hlt
    rw [not_le] at hlt
    exact hfund l (by linarith [Real.pi_pos]) hlt hlr
  have hlt : β * L < π := by linarith
  have heq : β * L = l := huniq _ hlp hlt hroot
  have hlow : π / 2 < β * L := by rw [heq]; exact hl1
  obtain ⟨x0, hx0⟩ := hnz
  have hdisp : E * I * β ^ 4 = ρ * A * ω ^ 2 := by
    have := hsep x0
    rw [phi4_eq] at this
    have h' : (E * I * β ^ 4 - ρ * A * ω ^ 2) * phi a b c d β x0 = 0 := by linarith
    rcases mul_eq_zero.mp h' with h | h
    · linarith
    · exact absurd h hx0
  have hρA : 0 < ρ * A := mul_pos hρ hA
  have hEI : 0 < E * I := mul_pos hE hI
  have hs : 0 < Real.sqrt (E * I / (ρ * A)) := Real.sqrt_pos.mpr (div_pos hEI hρA)
  have hs2 : Real.sqrt (E * I / (ρ * A)) ^ 2 = E * I / (ρ * A) :=
    Real.sq_sqrt (div_pos hEI hρA).le
  have homega : ω = β ^ 2 * Real.sqrt (E * I / (ρ * A)) := by
    have hsq : ω ^ 2 = (β ^ 2 * Real.sqrt (E * I / (ρ * A))) ^ 2 := by
      have h4 : (β ^ 2) ^ 2 = β ^ 4 := by ring
      rw [mul_pow, hs2, h4]
      field_simp
      linarith
    exact (sq_eq_sq₀ hω.le (by positivity)).mp hsq
  have hω2 : ω = (β * L) ^ 2 / L ^ 2 * Real.sqrt (E * I / (ρ * A)) := by
    rw [homega]
    field_simp
  have hsqrt : Real.sqrt (E * I / (ρ * A * L ^ 4)) = Real.sqrt (E * I / (ρ * A)) / L ^ 2 := by
    have : E * I / (ρ * A * L ^ 4) = (Real.sqrt (E * I / (ρ * A)) / L ^ 2) ^ 2 := by
      rw [div_pow, hs2]
      field_simp
    rw [this, Real.sqrt_sq (by positivity)]
  refine ⟨hroot, hlow, hlt, ?_, ?_, hω2, ?_⟩
  · nlinarith [Real.pi_pos]
  · nlinarith [Real.pi_pos]
  · rw [hω2, hsqrt]
    field_simp

/-- Consistency with `be-171`. With the tip stiffness `3 E I / L³` and the
Rayleigh mass `3 ρ A L / λ⁴`, `ω² = k / m_eff` is the same `ω²`. -/
theorem effective_mass (E I ρ A L lam ω : ℝ) (hρ : ρ ≠ 0) (hA : A ≠ 0) (hL : L ≠ 0)
    (hlam : lam ≠ 0)
    (hω : ω ^ 2 = lam ^ 4 / L ^ 4 * (E * I / (ρ * A))) :
    ω ^ 2 = (3 * E * I / L ^ 3) / (3 * ρ * A * L / lam ^ 4) := by
  rw [hω]
  field_simp

/-- `π / 2` is not a root, so the lower end of the bracket is strict. -/
theorem half_pi_not_root : Real.cos (π / 2) * Real.cosh (π / 2) ≠ -1 := by
  simp

end PhysJS.CantileverFrequency
