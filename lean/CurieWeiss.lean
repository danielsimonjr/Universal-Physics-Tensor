/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-93`. Bridge. Curie–Weiss law.

The catalog equation is

```
χ = C / (T − θ)
C = μ₀ n g² μ_B² S(S+1) / (3 k_B)
```

`curie_weiss` derives it. Linear response at zero field is the hypothesis
`χ k_B T = μ₀ n (g μ_B)² ⟨S_z²⟩`. The spin premise is `⟨S_z²⟩ = S(S+1)/3`,
which is the high-temperature moment of the Brillouin function, not derived
from the `su(2)` algebra here. `spin_half_moment` checks that equal weights
on `m = ±1/2` do give `1/4 = S(S+1)/3`. Mean field replaces `B` by
`B + λ M`, and `θ = C λ / μ₀` is that shift. A classical moment replaces
`g² μ_B² S(S+1)` by `μ²` and keeps the `3`. `θ = 0` is the Curie law.
-/

namespace PhysJS.CurieWeiss

/-- Curie constant from the zero-field second moment. -/
theorem curie_law (χ C μ0 n g μB S kB T moment2 : ℝ) (hk : kB ≠ 0) (hT : T ≠ 0)
    (hresponse : χ * kB * T = μ0 * n * (g * μB) ^ 2 * moment2)
    (hmoment : moment2 = S * (S + 1) / 3)
    (hC : C = μ0 * n * (g * μB) ^ 2 * S * (S + 1) / (3 * kB)) :
    χ = C / T := by
  rw [hmoment] at hresponse
  rw [hC]
  field_simp [hk, hT] at hresponse ⊢
  linarith

/-- Equal mixture of `m = ±1/2`. This is `S(S+1)/3` at `S = 1/2`. -/
theorem spin_half_moment :
    (1 / 2 : ℝ) * ((1 / 2) ^ 2) + (1 / 2) * ((-(1 / 2 : ℝ)) ^ 2) =
      (1 / 2) * (1 / 2 + 1) / 3 := by
  norm_num

/-- Classical moment: `μ² / 3` in place of `(g μ_B)² S(S+1) / 3`. -/
theorem classical_curie (χ C μ0 n μmom kB T moment2 : ℝ) (hk : kB ≠ 0) (hT : T ≠ 0)
    (hresponse : χ * kB * T = μ0 * n * moment2)
    (hmoment : moment2 = μmom ^ 2 / 3)
    (hC : C = μ0 * n * μmom ^ 2 / (3 * kB)) :
    χ = C / T := by
  rw [hmoment] at hresponse
  rw [hC]
  field_simp [hk, hT] at hresponse ⊢
  linarith

/-- Curie–Weiss. `hcurie` is `M = (C/(μ₀ T)) B_eff`. `hfield` is the
mean-field shift. `hθ` names `θ = C λ / μ₀`.

Not a measured
susceptibility curve. -/
theorem curie_weiss (χ M B Beff C μ0 T θ lam : ℝ)
    (hT : T ≠ 0) (hB : B ≠ 0) (hden : T - θ ≠ 0) (hμ : μ0 ≠ 0)
    (hcurie : M = (C / (μ0 * T)) * Beff)
    (hfield : Beff = B + lam * M)
    (hθ : θ = C * lam / μ0)
    (hχ : χ = μ0 * M / B) :
    χ = C / (T - θ) := by
  have hμT : μ0 * T ≠ 0 := mul_ne_zero hμ hT
  have hclear : M * μ0 * T = C * (B + lam * M) := by
    conv_lhs => rw [hcurie, hfield]
    calc
      (C / (μ0 * T) * (B + lam * M)) * μ0 * T
          = (C / (μ0 * T) * (μ0 * T)) * (B + lam * M) := by ring
      _ = C * (B + lam * M) := by rw [div_mul_cancel₀ _ hμT]
  have hshift : M * μ0 * (T - θ) = C * B := by
    have hsub : M * μ0 * T - M * C * lam = C * B := by
      linear_combination hclear
    have hcancel : μ0 * (C * lam / μ0) = C * lam := by
      rw [mul_comm]
      exact div_mul_cancel₀ _ hμ
    rw [hθ]
    calc
      M * μ0 * (T - C * lam / μ0) = M * μ0 * T - M * μ0 * (C * lam / μ0) := by ring
      _ = M * μ0 * T - M * (C * lam) := by
            have hpull : M * μ0 * (C * lam / μ0) = M * (C * lam) := by
              calc
                M * μ0 * (C * lam / μ0) = M * (μ0 * (C * lam / μ0)) := by ring
                _ = M * (C * lam) := by rw [hcancel]
            rw [hpull]
      _ = M * μ0 * T - M * C * lam := by ring
      _ = C * B := hsub
  have hM : M * (T - θ) / T = C * B / (μ0 * T) := by
    field_simp [hT, hμ] at hshift ⊢
    linarith
  have hsol : M = C * B / (μ0 * (T - θ)) := by
    field_simp [hT, hden, hμ] at hM ⊢
    linarith
  rw [hχ, hsol]
  field_simp [hB, hμ, hden]

/-- `θ = 0` is `C/T`, and it is not `C/(T − θ)` when `θ ≠ 0`. -/
theorem curie_not_weiss (C T θ : ℝ) (hT : T ≠ 0) (hden : T - θ ≠ 0) (hC : C ≠ 0)
    (hθ : θ ≠ 0) :
    C / T ≠ C / (T - θ) := by
  intro hEq
  have : T = T - θ := by
    field_simp [hT, hden, hC] at hEq
    linarith
  exact hθ (by linear_combination this)

end PhysJS.CurieWeiss
