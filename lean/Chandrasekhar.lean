/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-63`. Bridge. The polytropic prefactor. `ω₃⁰` stays symbolic.

From

```
n = ρ / (μ_e m_u)
p_F = ℏ (3 π² n)^{1/3}
P = (1/4) n p_F c
M = 4π (K / (π G))^{3/2} ω₃⁰
```

with `P = K_ρ ρ^{4/3}`, `K_ρ = K_n / (μ_e m_u)^{4/3}`, and
`K_n = (ℏ c / 4) (3 π²)^{1/3}`, conclude

```
M = (ω₃⁰ √(3π) / 2) (ℏ c / G)^{3/2} (μ_e m_u)^{−2}
```

The central density in the `n = 3` Lane–Emden scale cancels. The decimal
`2.01824` is not part of the theorem. `√π / 2` in place of `√(3π) / 2`
fails, as does dropping `ω₃⁰`. This is not stellar rotation or magnetic
support.
-/

namespace PhysJS.Chandrasekhar

open Real

/-- Fermi momentum `p_F = ℏ (3 π² n)^{1/3}`. -/
noncomputable def fermiMomentum (hbar n : ℝ) : ℝ :=
  hbar * (3 * π ^ 2 * n) ^ (1 / 3 : ℝ)

/-- Ultra-relativistic degeneracy pressure `P = (1/4) n p_F c`. -/
noncomputable def pressure (n pF c : ℝ) : ℝ :=
  ((1 : ℝ) / 4) * n * pF * c

/-- `K_n = (ℏ c / 4) (3 π²)^{1/3}`. -/
noncomputable def kN (hbar c : ℝ) : ℝ :=
  (hbar * c / 4) * (3 * π ^ 2) ^ (1 / 3 : ℝ)

/-- `K_ρ = K_n / (μ_e m_u)^{4/3}`. -/
noncomputable def kRho (hbar c μ mU : ℝ) : ℝ :=
  kN hbar c / (μ * mU) ^ (4 / 3 : ℝ)

/-- Polytropic mass after the central density has cancelled,
`M = 4π (K / (π G))^{3/2} ω₃⁰`. -/
noncomputable def massFromK (K G omega : ℝ) : ℝ :=
  4 * π * (K / (π * G)) ^ (3 / 2 : ℝ) * omega

/-- Lane–Emden scale for `n = 3`. Then `n + 1 = 4` and
`(1 - n) / (2n) = (1 - 3) / 6`, so
`a = (4 K / (4π G))^{1/2} ρ_c^{(1-3)/6}`. -/
noncomputable def scaleRadius (K G ρc : ℝ) : ℝ :=
  ((4 : ℝ) * K / (4 * π * G)) ^ (1 / 2 : ℝ) * ρc ^ (((1 : ℝ) - 3) / (2 * 3))

/-- Mass before the central density cancels, `M = 4π a³ ρ_c ω₃⁰`. -/
noncomputable def massWithCenter (K G ρc omega : ℝ) : ℝ :=
  4 * π * scaleRadius K G ρc ^ 3 * ρc * omega

/-- Chandrasekhar mass. `ω₃⁰` is a parameter, not the decimal `2.01824`. -/
noncomputable def chandrasekhar (omega hbar c G μ mU : ℝ) : ℝ :=
  (omega * sqrt (3 * π) / 2) * (hbar * c / G) ^ (3 / 2 : ℝ) * (μ * mU) ^ (-2 : ℝ)

lemma pressure_kN (hbar c n : ℝ) (_hh : 0 < hbar) (_hc : 0 < c) (hn : 0 < n) :
    pressure n (fermiMomentum hbar n) c = kN hbar c * n ^ (4 / 3 : ℝ) := by
  unfold pressure fermiMomentum kN
  have hsplit : (3 * π ^ 2 * n) ^ (1 / 3 : ℝ) =
      (3 * π ^ 2) ^ (1 / 3 : ℝ) * n ^ (1 / 3 : ℝ) := by
    rw [show 3 * π ^ 2 * n = (3 * π ^ 2) * n by ring]
    exact mul_rpow (by positivity) hn.le
  have hpow : n * n ^ (1 / 3 : ℝ) = n ^ (4 / 3 : ℝ) := by
    rw [← rpow_one_add' hn.le (by norm_num : (1 : ℝ) + 1 / 3 ≠ 0)]
    congr 1
    norm_num
  rw [hsplit]
  calc
    ((1 : ℝ) / 4) * n * (hbar * ((3 * π ^ 2) ^ (1 / 3 : ℝ) * n ^ (1 / 3 : ℝ))) * c
        = (hbar * c / 4) * (3 * π ^ 2) ^ (1 / 3 : ℝ) * (n * n ^ (1 / 3 : ℝ)) := by ring
    _ = (hbar * c / 4) * (3 * π ^ 2) ^ (1 / 3 : ℝ) * n ^ (4 / 3 : ℝ) := by rw [hpow]

lemma pressure_kRho (hbar c μ mU ρ n : ℝ) (hh : 0 < hbar) (hc : 0 < c) (hμ : 0 < μ)
    (hm : 0 < mU) (hρ : 0 < ρ) (hn : 0 < n) (hdens : n = ρ / (μ * mU)) :
    pressure n (fermiMomentum hbar n) c = kRho hbar c μ mU * ρ ^ (4 / 3 : ℝ) := by
  rw [pressure_kN hbar c n hh hc hn, hdens]
  unfold kRho
  rw [div_rpow hρ.le (mul_pos hμ hm).le]
  field_simp

/-- For `n = 3` the central density cancels, leaving `4π (K / (π G))^{3/2} ω₃⁰`. -/
lemma central_density_cancels (K G ρc omega : ℝ) (hK : 0 < K) (hG : 0 < G) (hρ : 0 < ρc) :
    massWithCenter K G ρc omega = massFromK K G omega := by
  unfold massWithCenter massFromK scaleRadius
  have hπ : 0 < π := pi_pos
  have hbase : (4 : ℝ) * K / (4 * π * G) = K / (π * G) := by
    field_simp [hπ.ne', hG.ne']
  have hexp : ((1 : ℝ) - 3) / (2 * 3) = -1 / 3 := by norm_num
  rw [hbase, hexp]
  have hKG : 0 < K / (π * G) := div_pos hK (mul_pos hπ hG)
  have hA : ((K / (π * G)) ^ (1 / 2 : ℝ)) ^ 3 = (K / (π * G)) ^ (3 / 2 : ℝ) := by
    rw [← rpow_natCast, ← rpow_mul hKG.le]
    have : (1 / 2 : ℝ) * (3 : ℕ) = 3 / 2 := by norm_num
    rw [this]
  have hρc : (ρc ^ (-1 / 3 : ℝ)) ^ 3 = ρc ^ (-1 : ℝ) := by
    rw [← rpow_natCast, ← rpow_mul hρ.le]
    have : (-1 / 3 : ℝ) * (3 : ℕ) = -1 := by norm_num
    rw [this]
  have hscale : ((K / (π * G)) ^ (1 / 2 : ℝ) * ρc ^ (-1 / 3 : ℝ)) ^ 3 =
      (K / (π * G)) ^ (3 / 2 : ℝ) * ρc ^ (-1 : ℝ) := by
    rw [mul_pow, hA, hρc]
  rw [hscale, rpow_neg hρ.le, rpow_one]
  field_simp [hρ.ne']

lemma four_rpow : (4 : ℝ) ^ (3 / 2 : ℝ) = 8 := by
  have : (3 : ℝ) / 2 = (1 / 2) * 3 := by norm_num
  rw [this, rpow_mul (by norm_num : (0 : ℝ) ≤ 4), show (4 : ℝ) ^ (1 / 2 : ℝ) = 2 by
    rw [← sqrt_eq_rpow, show (4 : ℝ) = 2 ^ 2 by norm_num, sqrt_sq (by norm_num)]]
  norm_num

lemma sqrt_three_pi_sq : sqrt (3 * π ^ 2) = sqrt 3 * π := by
  rw [sqrt_mul (by norm_num : (0 : ℝ) ≤ 3) (π ^ 2), sqrt_sq (le_of_lt pi_pos)]

lemma mass_from_k (hbar c G μ mU omega : ℝ) (hh : 0 < hbar) (hc : 0 < c) (hG : 0 < G)
    (hμ : 0 < μ) (hm : 0 < mU) (homega : 0 < omega) :
    massFromK (kRho hbar c μ mU) G omega = chandrasekhar omega hbar c G μ mU := by
  have hμs : 0 < μ * mU := mul_pos hμ hm
  have hπ : 0 < π := pi_pos
  have hkn : 0 < kN hbar c := by
    unfold kN
    exact mul_pos (div_pos (mul_pos hh hc) (by norm_num))
      (rpow_pos_of_pos (mul_pos (by norm_num) (sq_pos_of_pos hπ)) _)
  unfold massFromK kRho chandrasekhar
  set kn := kN hbar c
  set mu := μ * mU
  have hmu : 0 < mu := hμs
  have hdiv : (kn / mu ^ (4 / 3 : ℝ) / (π * G)) ^ (3 / 2 : ℝ) =
      kn ^ (3 / 2 : ℝ) / (mu ^ (2 : ℝ) * (π * G) ^ (3 / 2 : ℝ)) := by
    have hden : 0 < mu ^ (4 / 3 : ℝ) * (π * G) :=
      mul_pos (rpow_pos_of_pos hmu _) (mul_pos hπ hG)
    rw [div_div, div_rpow hkn.le hden.le]
    have hmuPow : (mu ^ (4 / 3 : ℝ)) ^ (3 / 2 : ℝ) = mu ^ (2 : ℝ) := by
      rw [← rpow_mul hmu.le]
      congr 1
      norm_num
    rw [mul_rpow (rpow_nonneg hmu.le _) (mul_pos hπ hG).le, hmuPow]
  have hknPow : kn ^ (3 / 2 : ℝ) =
      (hbar * c) ^ (3 / 2 : ℝ) / 8 * sqrt (3 * π ^ 2) := by
    unfold kn kN
    rw [mul_rpow (div_nonneg (mul_pos hh hc).le (by norm_num)) (by positivity),
      div_rpow (mul_pos hh hc).le (by norm_num) (3 / 2), four_rpow]
    have : ((3 * π ^ 2) ^ (1 / 3 : ℝ)) ^ (3 / 2 : ℝ) = (3 * π ^ 2) ^ (1 / 2 : ℝ) := by
      rw [← rpow_mul (by positivity : (0 : ℝ) ≤ 3 * π ^ 2)]
      congr 1
      norm_num
    rw [this, ← sqrt_eq_rpow]
  rw [hdiv, hknPow, sqrt_three_pi_sq]
  have hGpow : (π * G) ^ (3 / 2 : ℝ) = π ^ (3 / 2 : ℝ) * G ^ (3 / 2 : ℝ) :=
    mul_rpow hπ.le hG.le
  have ha : (hbar * c / G) ^ (3 / 2 : ℝ) = (hbar * c) ^ (3 / 2 : ℝ) / G ^ (3 / 2 : ℝ) :=
    div_rpow (mul_pos hh hc).le hG.le _
  have hneg : mu ^ (-2 : ℝ) = (mu ^ (2 : ℝ))⁻¹ := rpow_neg hmu.le _
  rw [hGpow, ha, hneg]
  -- `4π · (√3 π) / 8 / π^{3/2} = √(3π) / 2`, from `π · π / π^{3/2} = √π` and `4 / 8 = 1 / 2`.
  have hπ2 : π * π = π ^ (2 : ℝ) := by
    rw [← pow_two]
    exact (rpow_natCast π 2).symm
  have hπsub : π ^ (2 : ℝ) / π ^ (3 / 2 : ℝ) = sqrt π := by
    rw [← rpow_sub hπ]
    have : (2 : ℝ) - 3 / 2 = 1 / 2 := by norm_num
    rw [this, ← sqrt_eq_rpow]
  have hsqrt3π : sqrt 3 * sqrt π = sqrt (3 * π) :=
    (sqrt_mul (by norm_num : (0 : ℝ) ≤ 3) π).symm
  have hhalf : (4 : ℝ) / 8 = 1 / 2 := by norm_num
  have hnum : (4 : ℝ) * π * (sqrt 3 * π) = 4 * sqrt 3 * (π * π) := by ring
  have hcoeff : (4 : ℝ) * π * (sqrt 3 * π) / 8 / π ^ (3 / 2 : ℝ) = sqrt (3 * π) / 2 := by
    rw [hnum, hπ2]
    have hstep : (4 * sqrt 3) * π ^ (2 : ℝ) / 8 / π ^ (3 / 2 : ℝ) =
        (4 / 8) * sqrt 3 * (π ^ (2 : ℝ) / π ^ (3 / 2 : ℝ)) := by
      field_simp
    rw [hstep, hhalf, hπsub, ← hsqrt3π]
    ring
  have hpull : 4 * π *
        ((hbar * c) ^ (3 / 2 : ℝ) / 8 * (sqrt 3 * π) /
          (mu ^ (2 : ℝ) * (π ^ (3 / 2 : ℝ) * G ^ (3 / 2 : ℝ)))) * omega =
      omega * (hbar * c) ^ (3 / 2 : ℝ) / G ^ (3 / 2 : ℝ) / mu ^ (2 : ℝ) *
        ((4 : ℝ) * π * (sqrt 3 * π) / 8 / π ^ (3 / 2 : ℝ)) := by
    field_simp
  rw [hpull, hcoeff, ← div_eq_mul_inv]
  field_simp

/-- The degeneracy pressure is `K_ρ ρ^{4/3}`, the `n = 3` central density cancels,
and the mass is the Chandrasekhar prefactor. `ω₃⁰` stays symbolic.

Not rotation or magnetic support. -/
theorem prefactor (hbar c G μ mU ρ n ρc omega : ℝ) (hh : 0 < hbar) (hc : 0 < c) (hG : 0 < G)
    (hμ : 0 < μ) (hm : 0 < mU) (hρ : 0 < ρ) (hn : 0 < n) (hρc : 0 < ρc) (homega : 0 < omega)
    (hdens : n = ρ / (μ * mU)) :
    pressure n (fermiMomentum hbar n) c = kRho hbar c μ mU * ρ ^ (4 / 3 : ℝ) ∧
      massWithCenter (kRho hbar c μ mU) G ρc omega = chandrasekhar omega hbar c G μ mU := by
  refine ⟨pressure_kRho hbar c μ mU ρ n hh hc hμ hm hρ hn hdens, ?_⟩
  have hK : 0 < kRho hbar c μ mU := by
    unfold kRho kN
    positivity
  rw [central_density_cancels (kRho hbar c μ mU) G ρc omega hK hG hρc]
  exact mass_from_k hbar c G μ mU omega hh hc hG hμ hm homega

/-- With `ℏ = c = G = μ_e = m_u = 1`, the pressure route and `K_n` agree. -/
theorem unit_routes (n : ℝ) (hn : 0 < n) :
    pressure n (fermiMomentum 1 n) 1 = kN 1 1 * n ^ (4 / 3 : ℝ) ∧ kRho 1 1 1 1 = kN 1 1 := by
  refine ⟨pressure_kN 1 1 n (by norm_num) (by norm_num) hn, ?_⟩
  unfold kRho
  rw [one_mul, one_rpow, div_one]

/-- `√π / 2` is not `√(3π) / 2`. -/
theorem wrong_sqrt (omega : ℝ) (homega : omega ≠ 0) :
    omega * sqrt π / 2 ≠ omega * sqrt (3 * π) / 2 := by
  intro h
  have h2 : (2 : ℝ) ≠ 0 := by norm_num
  field_simp [homega, h2] at h
  have hsq := congrArg (fun x : ℝ => x ^ 2) h
  rw [sq_sqrt (le_of_lt pi_pos), sq_sqrt (mul_nonneg (by norm_num) (le_of_lt pi_pos))] at hsq
  linarith [pi_pos]

/-- Dropping `ω₃⁰` is not the prefactor when `ω₃⁰ ≠ 1`. -/
theorem dropped_omega (omega : ℝ) (homega : omega ≠ 1) :
    sqrt (3 * π) / 2 ≠ omega * sqrt (3 * π) / 2 := by
  intro h
  have h2 : (2 : ℝ) ≠ 0 := by norm_num
  have hs : sqrt (3 * π) ≠ 0 := by
    rw [sqrt_ne_zero']
    positivity
  field_simp [h2, hs] at h
  exact homega h.symm

end PhysJS.Chandrasekhar
