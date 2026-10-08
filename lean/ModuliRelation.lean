/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-240`. Bridge. Young's modulus and Poisson ratio from bulk and shear moduli.

The catalog equations are

```
E = 9 K G / (3 K + G)        ν = (3 K − 2 G) / (2 (3 K + G))
```

The premise is isotropic Hooke's law `σ_ij = λ tr(ε) δ_ij + 2G ε_ij` with
`K = λ + 2G/3`. In a uniaxial-stress test `σ_xx = σ`, `σ_yy = σ_zz = 0`, the
definitions are `E = σ / ε_xx` and `ν = −ε_yy / ε_xx` (with `ε_yy = ε_zz` by
isotropy). `young_eq` and `poisson_eq` solve the three Hooke equations for
`E` and `ν`. `stability` shows `E > 0` and `−1 < ν < 1/2` for `K, G > 0`.

It does not derive Hooke's law, and it assumes a linear, isotropic solid
with `K, G > 0`; negative moduli are outside the stability range.
-/

namespace PhysJS.ModuliRelation

/-- Uniaxial-stress test in isotropic Hooke's law. With `σ_yy = σ_zz = 0` and
`ε_yy = ε_zz = ε₂`, the first two Hooke equations give `E` and `ν`.

`hσ` is `σ_xx = λ(ε₁ + 2ε₂) + 2G ε₁`, `hlat` is `0 = λ(ε₁ + 2ε₂) + 2G ε₂`,
`hK` is `K = λ + 2G/3`, `hE` and `hν` are the definitions.

Not a derivation
of Hooke's law. -/
theorem young_eq (σ ε₁ ε₂ lam G K E ν : ℝ)
    (hK0 : 0 < K) (hG0 : 0 < G) (hε : ε₁ ≠ 0)
    (hσ : σ = lam * (ε₁ + 2 * ε₂) + 2 * G * ε₁)
    (hlat : 0 = lam * (ε₁ + 2 * ε₂) + 2 * G * ε₂)
    (hK : K = lam + 2 * G / 3)
    (hE : E = σ / ε₁) (hν : ν = -ε₂ / ε₁) :
    E = 9 * K * G / (3 * K + G) ∧ ν = (3 * K - 2 * G) / (2 * (3 * K + G)) := by
  have hlam : lam = K - 2 * G / 3 := by linarith
  have h3 : 0 < 3 * K + G := by linarith
  have hlg : lam + G = (3 * K + G) / 3 := by rw [hlam]; ring
  -- lateral strain from `hlat`
  have hε2 : ε₂ * (2 * (lam + G)) = -lam * ε₁ := by linarith
  have hε2'' : ε₂ = -(3 * lam * ε₁) / (2 * (3 * K + G)) := by
    rw [eq_div_iff (by positivity)]
    have h6 : 2 * (3 * K + G) = 6 * (lam + G) := by linarith
    rw [h6]
    linarith
  have hν' : ν = (3 * K - 2 * G) / (2 * (3 * K + G)) := by
    rw [hν, hε2'', hlam]
    field_simp
  refine ⟨?_, hν'⟩
  rw [hE, hσ, hε2'', hlam]
  field_simp
  ring

/-- Stability range: `E > 0`, `−1 < ν < 1/2` for `K, G > 0`. -/
theorem stability (K G : ℝ) (hK : 0 < K) (hG : 0 < G) :
    0 < 9 * K * G / (3 * K + G) ∧
      -1 < (3 * K - 2 * G) / (2 * (3 * K + G)) ∧
      (3 * K - 2 * G) / (2 * (3 * K + G)) < 1 / 2 := by
  have h3 : 0 < 3 * K + G := by linarith
  refine ⟨by positivity, ?_, ?_⟩
  · rw [lt_div_iff₀ (by positivity)]; linarith
  · rw [div_lt_div_iff₀ (by positivity) (by norm_num)]; linarith

/-- Units alone do not entail the function: a different degree-one pressure
combination, `K + G`, disagrees with `E` at `K = G = 1` (`E = 9/4`). -/
theorem combination_not_fixed :
    ∃ K G : ℝ, 9 * K * G / (3 * K + G) ≠ K + G :=
  ⟨1, 1, by norm_num⟩

/-- Incompressible limit `K → ∞`: `ν → 1/2` and `E → 3G` are the large-`K`
behaviour, in the bounded form `E < 3G`. -/
theorem young_lt_three_shear (K G : ℝ) (hK : 0 < K) (hG : 0 < G) :
    9 * K * G / (3 * K + G) < 3 * G := by
  have h3 : 0 < 3 * K + G := by linarith
  rw [div_lt_iff₀ h3]; nlinarith

end PhysJS.ModuliRelation
