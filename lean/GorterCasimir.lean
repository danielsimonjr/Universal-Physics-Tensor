/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.LondonPenetration
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-146`. Bridge. Gorter–Casimir two-fluid fraction.

The catalog equations are

```
n_s / n = 1 − (T / T_c)⁴
λ(T) = λ(0) / √(1 − (T / T_c)⁴)
```

The exponent `4` is a hypothesis, not a derived integer. `gorter_casimir`
assumes `p = 4` and `n_s / n = 1 − (T / T_c)^p`, and it does not produce
`p` from BCS. Weak-coupling BCS is a different function of `Δ(T)`. The
penetration depth is `PhysJS.LondonPenetration.penetrationDepth`, so
`λ² = m / (μ0 n_s e²)` and `λ(0)² = m / (μ0 n e²)`. The ratio of those
square roots is `√(n / n_s)`. `e` is the elementary charge. `m > 0`,
`μ0 > 0`, `n > 0`, `n_s > 0`, and `e ≠ 0`. Positivity of `n_s / n` forces
the radicand to be positive. An exponent other than `4` is a different
fraction.
-/

namespace PhysJS.GorterCasimir

open Real

/-- Gorter–Casimir fraction and the London depth that follows.

`hexp` states the exponent `4`. `hfrac` is the two-fluid assumption at that
exponent. `hlam` and `hlam0` are the London depths at `n_s` and at `n`.

The
exponent is not derived. Not a BCS gap function, and not a second proof of
`be-75`. -/
theorem gorter_casimir
    (ns n lam lam0 m μ0 e T Tc p : ℝ)
    (hexp : p = 4) (hm : 0 < m) (hμ : 0 < μ0) (he : e ≠ 0) (hn : 0 < n) (hns : 0 < ns)
    (hfrac : ns / n = 1 - (T / Tc) ^ p)
    (hlam : lam = LondonPenetration.penetrationDepth m μ0 ns e)
    (hlam0 : lam0 = LondonPenetration.penetrationDepth m μ0 n e) :
    ns / n = 1 - (T / Tc) ^ (4 : ℝ) ∧
      lam = lam0 / Real.sqrt (1 - (T / Tc) ^ (4 : ℝ)) := by
  have hpow : ns / n = 1 - (T / Tc) ^ (4 : ℝ) := by
    rw [hfrac, hexp]
  have hposfrac : 0 < 1 - (T / Tc) ^ (4 : ℝ) := by
    have hdiv : 0 < ns / n := div_pos hns hn
    rwa [hpow] at hdiv
  have hlam2 : lam ^ 2 = m / (μ0 * ns * e ^ 2) := by
    rw [hlam]
    unfold LondonPenetration.penetrationDepth
    exact Real.sq_sqrt (by positivity)
  have hlam02 : lam0 ^ 2 = m / (μ0 * n * e ^ 2) := by
    rw [hlam0]
    unfold LondonPenetration.penetrationDepth
    exact Real.sq_sqrt (by positivity)
  have hlampos : 0 < lam := by
    rw [hlam]
    unfold LondonPenetration.penetrationDepth
    exact Real.sqrt_pos.mpr (by positivity)
  have hlam0pos : 0 < lam0 := by
    rw [hlam0]
    unfold LondonPenetration.penetrationDepth
    exact Real.sqrt_pos.mpr (by positivity)
  have hratio : (lam / lam0) ^ 2 = n / ns := by
    have hsq : lam ^ 2 / lam0 ^ 2 = n / ns := by
      rw [hlam2, hlam02]
      field_simp [hm.ne', hμ.ne', hns.ne', hn.ne', he]
    calc
      (lam / lam0) ^ 2 = lam ^ 2 / lam0 ^ 2 := by
        field_simp [hlam0pos.ne']
      _ = n / ns := hsq
  have hroot : lam / lam0 = Real.sqrt (n / ns) := by
    have hnonneg : 0 ≤ lam / lam0 := div_nonneg hlampos.le hlam0pos.le
    have hsqroot : Real.sqrt ((lam / lam0) ^ 2) = lam / lam0 := Real.sqrt_sq hnonneg
    rw [← hsqroot, hratio]
  have hinv : n / ns = 1 / (ns / n) := by
    field_simp [hns.ne', hn.ne']
  have hsqrt : Real.sqrt (n / ns) = 1 / Real.sqrt (ns / n) := by
    rw [hinv, Real.sqrt_div (by norm_num : (0 : ℝ) ≤ 1) (ns / n), Real.sqrt_one]
  refine ⟨hpow, ?_⟩
  rw [hpow] at hsqrt
  have hlamRatio : lam = lam0 * (1 / Real.sqrt (1 - (T / Tc) ^ (4 : ℝ))) := by
    have hmul : lam = lam0 * (lam / lam0) := by
      field_simp [hlam0pos.ne']
    rw [hmul, hroot, hsqrt]
  rw [hlamRatio]
  field_simp [Real.sqrt_ne_zero'.mpr hposfrac]

/-- The exponent `2` is not the exponent `4` on a reduced temperature that is
neither `0` nor `1`. -/
theorem exponent_not_two (r : ℝ) (hr0 : r ≠ 0) (hr1 : r ≠ 1) (hr : 0 ≤ r) :
    1 - r ^ (2 : ℕ) ≠ 1 - r ^ (4 : ℕ) := by
  intro hEq
  have hpow : r ^ 2 = r ^ 4 := by linarith
  have hfac : r ^ 2 * (r ^ 2 - 1) = 0 := by
    have : r ^ 4 - r ^ 2 = 0 := by linarith
    convert this using 1
    ring
  rcases mul_eq_zero.mp hfac with h2 | hdiff
  · exact hr0 (sq_eq_zero_iff.mp h2)
  · have hr2 : r ^ 2 = 1 := by linarith
    have hsplit : (r - 1) * (r + 1) = 0 := by
      have : r ^ 2 - 1 = 0 := by linarith
      convert this using 1
      ring
    rcases mul_eq_zero.mp hsplit with h1 | hneg
    · exact hr1 (by linarith)
    · linarith [hr]

end PhysJS.GorterCasimir
