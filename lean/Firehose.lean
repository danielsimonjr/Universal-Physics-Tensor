/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-124`. Bridge. The firehose threshold.

Proved under this dispersion hypothesis, the CGL firehose root

```
ω² = (k_∥² / ρ) (B² / μ0 + p_⊥ − p_∥)
```

with `ρ > 0` and `k_∥ ≠ 0`. The root is negative exactly when
`p_∥ − p_⊥ > B² / μ0`. Plasma beta is the `be-76` definition
`β = 2 μ0 p / B²`, taken here as a definition and not re-proved from
the solenoid. With that definition the threshold is `β_∥ − β_⊥ > 2`.
`PhysJS.PlasmaBeta.beta_eq` does not prove this inequality. The CGL
closure is not derived in this file.
-/

namespace PhysJS.Firehose

/-- Firehose instability in pressure and in the `be-76` beta.

`hdisp` is the firehose root. `hβPar` and `hβPerp` use
`β = 2 μ0 p / B²`. -/
theorem firehose_threshold (ω kPara ρ μ0 B pPerp pPar βPar βPerp : ℝ)
    (hρ : 0 < ρ) (hk : kPara ≠ 0) (hμ : 0 < μ0) (hB : B ≠ 0)
    (hdisp : ω ^ 2 = kPara ^ 2 / ρ * (B ^ 2 / μ0 + pPerp - pPar))
    (hβPar : βPar = 2 * μ0 * pPar / B ^ 2)
    (hβPerp : βPerp = 2 * μ0 * pPerp / B ^ 2) :
    (ω ^ 2 < 0 ↔ B ^ 2 / μ0 < pPar - pPerp) ∧ (ω ^ 2 < 0 ↔ 2 < βPar - βPerp) := by
  have hfac : 0 < kPara ^ 2 / ρ := by positivity
  have h1 : ω ^ 2 < 0 ↔ B ^ 2 / μ0 + pPerp - pPar < 0 := by
    rw [hdisp]
    constructor
    · intro hneg
      by_contra hnot
      push_neg at hnot
      have : 0 ≤ kPara ^ 2 / ρ * (B ^ 2 / μ0 + pPerp - pPar) := mul_nonneg hfac.le hnot
      linarith
    · intro hparen
      exact mul_neg_of_pos_of_neg hfac hparen
  have h2 : B ^ 2 / μ0 + pPerp - pPar < 0 ↔ B ^ 2 / μ0 < pPar - pPerp := by
    constructor <;> intro h <;> linarith
  have hdiff : βPar - βPerp - 2 =
      (2 * μ0 / B ^ 2) * (pPar - pPerp - B ^ 2 / μ0) := by
    rw [hβPar, hβPerp]
    field_simp [hμ.ne', hB]
  have hpos : 0 < 2 * μ0 / B ^ 2 := by positivity
  have h3 : 2 < βPar - βPerp ↔ B ^ 2 / μ0 < pPar - pPerp := by
    rw [← sub_pos, hdiff, mul_pos_iff_of_pos_left hpos, sub_pos]
  exact ⟨h1.trans h2, h1.trans (h2.trans h3.symm)⟩

end PhysJS.Firehose
