/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Probability.Moments.Variance
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-85`. Bridge. Full shot noise, one-sided.

The catalog equation is

```
S_I = 2 e I
```

`e` is the elementary charge. `shot_eq` derives it from Poisson arrivals
and the one-sided bandwidth of a rectangular window. In a record of length
`T` the count `N` has mean `(I / e) T`. The Poisson premise is
`Var(N) = mean(N)`; this file does not rebuild the Poisson PMF. Charge
`e` scales that variance by `e²`, and the windowed current is the charge
divided by `T`. The one-sided convention used here is `Δf = 1 / (2 T)`,
the equivalent noise bandwidth of that average. Then `Var(I) = S_I Δf`
gives `S_I = 2 e I`. `two_sided_not_schottky` uses `Δf = 1 / T` and gets
`e I`. This is not a Fourier theorem and not Johnson–Nyquist.
-/

namespace PhysJS.ShotNoise

open MeasureTheory ProbabilityTheory

/-- Full shot noise. `hpoisson` is `Var(N) = ⟨N⟩`. `hband` is the one-sided
window `Δf = 1/(2 T)`.

Not a spectral theorem. -/
theorem shot_eq {Ω : Type*} [MeasurableSpace Ω] (μ : Measure Ω) (N : Ω → ℝ) (e I T : ℝ)
    (he : e ≠ 0) (hT : T ≠ 0)
    (hmean : ∫ ω, N ω ∂μ = (I / e) * T)
    (hpoisson : variance N μ = ∫ ω, N ω ∂μ) :
    let Iavg : Ω → ℝ := fun ω => (e * N ω) / T
    variance Iavg μ = e * I / T ∧ variance Iavg μ / (1 / (2 * T)) = 2 * e * I := by
  intro Iavg
  have hscale : variance Iavg μ = (e / T) ^ 2 * variance N μ := by
    have hfun : Iavg = fun ω => (e / T) * N ω := by
      ext ω
      simp [Iavg]
      field_simp [hT]
    rw [hfun]
    exact variance_const_mul (e / T) N μ
  have hvar : variance Iavg μ = e * I / T := by
    rw [hscale, hpoisson, hmean]
    field_simp [he, hT]
  refine ⟨hvar, ?_⟩
  rw [hvar]
  field_simp [hT]

/-- A two-sided bandwidth `Δf = 1/T` produces `e I`, not `2 e I`. -/
theorem two_sided_not_schottky {Ω : Type*} [MeasurableSpace Ω] (μ : Measure Ω) (N : Ω → ℝ) (e I T : ℝ)
    (he : e ≠ 0) (hT : T ≠ 0) (hprod : e * I ≠ 0)
    (hmean : ∫ ω, N ω ∂μ = (I / e) * T)
    (hpoisson : variance N μ = ∫ ω, N ω ∂μ) :
    let Iavg : Ω → ℝ := fun ω => (e * N ω) / T
    variance Iavg μ / (1 / T) = e * I ∧ e * I ≠ 2 * e * I := by
  intro Iavg
  have hshot := shot_eq μ N e I T he hT hmean hpoisson
  have hvar : variance Iavg μ = e * I / T := hshot.1
  refine ⟨?_, ?_⟩
  · rw [hvar]
    field_simp [hT]
  · intro hEq
    apply hprod
    linarith

end PhysJS.ShotNoise
