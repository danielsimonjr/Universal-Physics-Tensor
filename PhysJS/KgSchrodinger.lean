/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import PhysJS.Inequalities
import PhysJS.PlaneWave

/-!
`ab-kg-schrodinger`. Covers `bound.delta` exactly, at the dispersion relation.

The non-relativistic kinetic frequency is `ω₀ x² / 2` with `x = ck/ω₀`.
The Klein–Gordon branch contributes `ω₀ (√(1 + x²) - 1)`. Their relative
error simplifies to `(√(1 + x²) - 1) / (√(1 + x²) + 1)`, which is the closed
form in the scoping report §4.3. UPT's `kgNonrelativisticError` is the same
quantity written as `|(√(1 + x²) - 1) / (x²/2) - 1|`.

The regime is `x ≤ 1/10`. The error increases with `x`, so the value at the
edge is the supremum: that supremum is `bound.delta`. `covers_bound_delta`
does not derive the dispersion relation from the PDE.

`planeWave_iff_dispersion` does. A non-trivial real plane wave solves
`u_tt = c² u_xx − ω₀² u` if and only if `ω² = c² k² + ω₀²`, and a non-zero
complex plane wave solves `i ψ_t = −κ ψ_xx` with `κ = c²/(2 ω₀)` if and only
if `ω = κ k²`. That is the rank-1a transformation. It covers that statement
only, and it does not prove `covers_bound_delta`.
-/

namespace PhysJS.KgSchrodinger

open Real PhysJS

/-- Regime edge `ck/ω₀ ≤ 0.1`. -/
noncomputable def regimeEdge : ℝ := 1 / 10

/-- Relative kinetic-frequency error `(√(1 + x²) - 1) / (√(1 + x²) + 1)`. -/
noncomputable def kgSchrodingerError (x : ℝ) : ℝ :=
  (sqrt (1 + x ^ 2) - 1) / (sqrt (1 + x ^ 2) + 1)

/-- UPT's `kgNonrelativisticError` at the regime edge. -/
noncomputable def delta : ℝ :=
  |(sqrt (1 + regimeEdge ^ 2) - 1) / (regimeEdge ^ 2 / 2) - 1|

theorem kgSchrodingerError_eq_relative (x : ℝ) (hx : x ≠ 0) :
    kgSchrodingerError x = |(sqrt (1 + x ^ 2) - 1) / (x ^ 2 / 2) - 1| := by
  have hx2 : 0 < x ^ 2 := sq_pos_of_ne_zero hx
  set s := sqrt (1 + x ^ 2)
  have hs0 : 0 ≤ 1 + x ^ 2 := by nlinarith [sq_nonneg x]
  have hs_sq : s ^ 2 = 1 + x ^ 2 := sq_sqrt hs0
  have hs1 : 1 ≤ s := sqrt_one_le_sqrt_one_add_sq x
  have hfac : x ^ 2 = (s - 1) * (s + 1) := by nlinarith [hs_sq]
  have hden : s + 1 ≠ 0 := by linarith
  have hrel : (s - 1) / (x ^ 2 / 2) = 2 / (s + 1) := by
    symm
    rw [div_eq_div_iff hden (div_ne_zero hx2.ne' two_ne_zero)]
    nlinarith [hfac]
  have hdiff : 2 / (s + 1) - 1 = (1 - s) / (s + 1) := by
    calc
      2 / (s + 1) - 1 = 2 / (s + 1) - (s + 1) / (s + 1) := by rw [div_self hden]
      _ = (2 - (s + 1)) / (s + 1) := by rw [div_sub_div_same]
      _ = (1 - s) / (s + 1) := by ring
  have hnonpos : (1 - s) / (s + 1) ≤ 0 :=
    div_nonpos_of_nonpos_of_nonneg (by linarith) (by linarith)
  calc
    kgSchrodingerError x = (s - 1) / (s + 1) := by simp [kgSchrodingerError, s]
    _ = -((1 - s) / (s + 1)) := by
      calc
        (s - 1) / (s + 1) = (-(1 - s)) / (s + 1) := by ring
        _ = -((1 - s) / (s + 1)) := by rw [neg_div]
    _ = |(s - 1) / (x ^ 2 / 2) - 1| := by
      rw [hrel, hdiff, abs_of_nonpos hnonpos]

theorem kgSchrodingerError_monotone {x y : ℝ} (hx : 0 ≤ x) (hxy : x ≤ y) :
    kgSchrodingerError x ≤ kgSchrodingerError y := by
  have hs : sqrt (1 + x ^ 2) ≤ sqrt (1 + y ^ 2) := by
    apply sqrt_le_sqrt
    have : x ^ 2 ≤ y ^ 2 := pow_le_pow_left₀ hx hxy 2
    linarith
  unfold kgSchrodingerError
  exact div_sub_one_mono (sqrt_one_le_sqrt_one_add_sq x) hs

/-- The error is monotone on `0 ≤ x ≤ 1/10`, and its edge value is `delta`.

Covers `bound.delta` of `ab-kg-schrodinger` at the dispersion relation. -/
theorem covers_bound_delta :
    (∀ x y : ℝ, 0 ≤ x → x ≤ y → y ≤ regimeEdge →
      kgSchrodingerError x ≤ kgSchrodingerError y) ∧
    kgSchrodingerError regimeEdge = delta := by
  refine ⟨?_, ?_⟩
  · intro x y hx hxy _hy
    exact kgSchrodingerError_monotone hx hxy
  · simpa [delta] using kgSchrodingerError_eq_relative regimeEdge (by norm_num [regimeEdge])

/-- The phase-velocity error `√(1 + x²) - 1` is a different dictionary.
It is the `ab-klein-gordon-wave` error, not the kinetic-frequency error. -/
theorem wrong_dictionary :
    sqrt (1 + regimeEdge ^ 2) - 1 ≠ kgSchrodingerError regimeEdge := by
  intro h
  have hs : (1 : ℝ) < sqrt (1 + regimeEdge ^ 2) := by
    rw [← sqrt_one]
    exact sqrt_lt_sqrt (by norm_num) (by norm_num [regimeEdge])
  set s := sqrt (1 + regimeEdge ^ 2)
  have hEq : (s - 1) / (s + 1) = s - 1 := by
    simpa [kgSchrodingerError, s] using h.symm
  have hden : s + 1 ≠ 0 := by linarith
  have hmul : s - 1 = (s - 1) * (s + 1) := by
    calc
      s - 1 = (s - 1) / (s + 1) * (s + 1) := by rw [div_mul_cancel₀ _ hden]
      _ = (s - 1) * (s + 1) := by rw [hEq]
  have : (s - 1) * s = 0 := by nlinarith [hmul]
  rcases mul_eq_zero.mp this with h0 | h0
  · linarith
  · linarith

open PhysJS.PlaneWave Complex

/-- A non-trivial plane wave solves each side's PDE if and only if its
frequency obeys that side's dispersion relation.

The Klein–Gordon side is `u_tt = c² u_xx − ω₀² u`, with `ω² = c² k² + ω₀²`.
The Schrödinger side is `i ψ_t = −κ ψ_xx` at `κ = c² / (2 ω₀)`, with
`ω = κ k²`, which is `ω = c² k² / (2 ω₀)`. The zero wave is excluded: it
solves every linear equation and does not determine the frequency.

Covers the rank-1a transformation of `ab-kg-schrodinger`. It does not prove
`covers_bound_delta`. -/
theorem planeWave_iff_dispersion (A k ω φ c ω0 : ℝ) (B : ℂ) (kS ωS : ℝ)
    (hω0 : ω0 ≠ 0) (hnt : ∃ x t, planeWave A k ω φ x t ≠ 0) (hB : B ≠ 0) :
    ((∀ x t, timeSecond (planeWave A k ω φ) x t =
        c ^ 2 * spaceSecond (planeWave A k ω φ) x t
          - ω0 ^ 2 * planeWave A k ω φ x t) ↔
      ω ^ 2 = c ^ 2 * k ^ 2 + ω0 ^ 2) ∧
    ((∀ x t, I * deriv (fun s => cPlane B kS ωS x s) t =
        (-((c ^ 2 / (2 * ω0) : ℝ))) *
          deriv (fun y => deriv (fun y => cPlane B kS ωS y t) y) x) ↔
      ωS = c ^ 2 * kS ^ 2 / (2 * ω0)) := by
  refine ⟨kg_solves_iff A k ω φ c ω0 hnt, ?_⟩
  have hsch := schrodinger_solves_iff B kS ωS (c ^ 2 / (2 * ω0)) hB
  constructor
  · intro h
    have hdiv : ωS = c ^ 2 / (2 * ω0) * kS ^ 2 := hsch.mp h
    rw [hdiv]
    field_simp [hω0]
  · intro h
    apply hsch.mpr
    rw [h]
    field_simp [hω0]

/-- The massless wave dispersion is not the Klein–Gordon dispersion when
`ω₀ ≠ 0`. -/
theorem planeWave_wrong_dictionary (c k ω0 : ℝ) (hω0 : ω0 ≠ 0) :
    c ^ 2 * k ^ 2 ≠ c ^ 2 * k ^ 2 + ω0 ^ 2 := by
  intro h
  have : ω0 ^ 2 = 0 := by linarith
  exact hω0 (sq_eq_zero_iff.mp this)

end PhysJS.KgSchrodinger
