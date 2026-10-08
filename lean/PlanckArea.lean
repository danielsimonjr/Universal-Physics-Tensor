/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-14`. Derivation step.
`be-43`. Bridge.

One lemma, `PhysJS.PlanckArea.area_law`: the Planck-area form of the area
law. For `be-43` that equality is the catalogued wormhole-area equation.

The encoded SI scalar, with the area an input, is

```
S = k_B c³ A / (4 G ℏ)
```

With `ℓ_P² = ℏ G / c³`,

```
k_B c³ A / (4 G ℏ) = k_B A / (4 ℓ_P²)
```

BE-43 encodes `S = k_B A_wormhole / (4 ℓ_P²)`. On the same area that is
this equality. The area is not computed. `ℓ_P² = ℏ G / c²` agrees with
`ℏ G / c³` only at `c = 1`, so the control assumes `c ≠ 1`. The factor
`2` in place of `4` is a different entropy. This is not the minimal-surface
theorem, and it is not ER=EPR.
-/

namespace PhysJS.PlanckArea

/-- Planck area `ℓ_P² = ℏ G / c³`. -/
noncomputable def planckArea (ℏ G c : ℝ) : ℝ :=
  ℏ * G / c ^ 3

/-- The same monomial with `c²` in place of `c³`. -/
noncomputable def planckAreaWrong (ℏ G c : ℝ) : ℝ :=
  ℏ * G / c ^ 2

/-- SI area law `k_B c³ A / (4 G ℏ)`. The area is an input. -/
noncomputable def entropySI (kB c G ℏ A : ℝ) : ℝ :=
  kB * c ^ 3 * A / (4 * G * ℏ)

/-- Planck-area law `k_B A / (4 ℓ_P²)`, the BE-43 form on the same area. -/
noncomputable def entropyPlanck (kB ℓ2 A : ℝ) : ℝ :=
  kB * A / (4 * ℓ2)

/-- The SI form equals the Planck-area form. BE-43 is this equality on a
wormhole area.

Not a
minimal surface, and not ER=EPR. -/
theorem area_law (kB c G ℏ A : ℝ) (hc : c ≠ 0) (hG : G ≠ 0) (hℏ : ℏ ≠ 0) :
    planckArea ℏ G c = ℏ * G / c ^ 3 ∧
      entropySI kB c G ℏ A = kB * c ^ 3 * A / (4 * G * ℏ) ∧
      entropyPlanck kB (planckArea ℏ G c) A =
        kB * A / (4 * planckArea ℏ G c) ∧
      entropySI kB c G ℏ A = entropyPlanck kB (planckArea ℏ G c) A := by
  unfold planckArea entropySI entropyPlanck
  refine ⟨rfl, rfl, rfl, ?_⟩
  field_simp [hc, hG, hℏ]

/-- `ℓ_P² = ℏ G / c²` is not the Planck area when `c ≠ 1`, and the factor
`2` is not the factor `4`. -/
theorem wrong_dictionary (kB c G ℏ A : ℝ) (hc : c ≠ 0) (hc1 : c ≠ 1) (hG : G ≠ 0)
    (hℏ : ℏ ≠ 0) (hk : kB ≠ 0) (hA : A ≠ 0) :
    entropyPlanck kB (planckAreaWrong ℏ G c) A ≠ entropySI kB c G ℏ A ∧
      kB * c ^ 3 * A / (2 * G * ℏ) ≠ entropySI kB c G ℏ A := by
  constructor
  · intro h
    unfold entropyPlanck planckAreaWrong entropySI at h
    field_simp [hc, hG, hℏ, hk, hA] at h
    exact hc1 h.symm
  · intro h
    unfold entropySI at h
    field_simp [hc, hG, hℏ, hk, hA] at h
    linarith

end PhysJS.PlanckArea
