/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring
import Mathlib.Topology.Algebra.InfiniteSum.Ring

/-!
`be-164`. Bridge. The Planck spectrum.

The catalog equation is

```
u (exp(h ν / (k_B T)) − 1) c³ = 8 π h ν³
```

`bose_factor` proves the geometric series for the mean occupation of one
oscillator, `1 / (e^x − 1) = ∑_{n≥1} e^{−n x}`. `planck_eq` multiplies that
occupation by the mode density `8 π ν² / c³` and by the quantum `h ν`. The
factor `8 π`, two polarizations in a volume, is a hypothesis. The integral
over frequency is `be-165`, not this row.
-/

namespace PhysJS.PlanckSpectrum

open Real
open scoped Real

/-- Bose factor as a geometric series, for `x > 0`. -/
theorem bose_factor (x : ℝ) (hx : 0 < x) :
    (1 : ℝ) / (exp x - 1) = ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) := by
  let r : ℝ := exp (-x)
  have hrpos : 0 ≤ r := (exp_pos _).le
  have hr : ‖r‖ < 1 := by
    rw [Real.norm_of_nonneg hrpos, exp_lt_one_iff]
    linarith
  have hgeom : ∑' n : ℕ, r ^ n = (1 - r)⁻¹ := tsum_geometric_of_norm_lt_one hr
  have hfun : (fun n : ℕ => r ^ (n + 1)) = fun n => r * r ^ n := by
    funext n
    rw [pow_succ, mul_comm]
  have hshift : ∑' n : ℕ, r ^ (n + 1) = r * (1 - r)⁻¹ := by
    rw [hfun, tsum_mul_left, hgeom]
  have hterm : ∀ n : ℕ, r ^ (n + 1) = exp (-((n + 1 : ℕ) : ℝ) * x) := by
    intro n
    rw [show r = exp (-x) by rfl, ← exp_nat_mul, Nat.cast_add, Nat.cast_one]
    ring_nf
  have hsum : ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) = r / (1 - r) := by
    have hcongr : (fun n : ℕ => exp (-((n + 1 : ℕ) : ℝ) * x)) = fun n => r ^ (n + 1) := by
      funext n
      exact (hterm n).symm
    rw [hcongr, hshift, div_eq_mul_inv]
  rw [hsum]
  have hden : 1 - r ≠ 0 := by
    have : r < 1 := by
      have hnorm := hr
      rwa [Real.norm_of_nonneg hrpos] at hnorm
    linarith
  simp only [r, exp_neg]
  field_simp [hden]

/-- Spectral energy density of one mode, times the proved Bose factor.

`hmode` is `8 π ν² / c³`. `hu` multiplies by `h ν` and by `bose_factor`. -/
theorem planck_eq (u mode h ν c kB T : ℝ)
    (hc : c ≠ 0) (hkB : kB ≠ 0) (hh : h ≠ 0) (hT : 0 < T)
    (hx : 0 < h * ν / (kB * T))
    (hmode : mode = 8 * π * ν ^ 2 / c ^ 3)
    (hu : u = mode * h * ν * (1 / (exp (h * ν / (kB * T)) - 1))) :
    u * (exp (h * ν / (kB * T)) - 1) * c ^ 3 = 8 * π * h * ν ^ 3 ∧
      (1 : ℝ) / (exp (h * ν / (kB * T)) - 1) =
        ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * (h * ν / (kB * T))) := by
  refine ⟨?_, bose_factor _ hx⟩
  have hden : exp (h * ν / (kB * T)) - 1 ≠ 0 := by
    have hgt : 1 < exp (h * ν / (kB * T)) := (one_lt_exp_iff).2 hx
    linarith
  rw [hu, hmode]
  have hden' : exp (ν * h / (kB * T)) - 1 ≠ 0 := by
    rw [mul_comm ν h]
    exact hden
  field_simp [hc, hden']

end PhysJS.PlanckSpectrum
