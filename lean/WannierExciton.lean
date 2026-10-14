/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-188`. Bridge. Wannier exciton binding energy and radius.

The catalog equation is

```
E_X = (μ / m_e) R_y / ε_r²        a_X = a_B ε_r m_e / μ
```

`R_y = m_e k₀² / (2 ℏ²)` and `a_B = ℏ² / (m_e k₀)` with `k₀ = e² / (4π ε₀)`
(`e` is the elementary charge). `exciton_eq` derives the scaling. The pair
is a hydrogen atom with reduced mass `μ` and the Coulomb strength screened to
`k = e² / (4π ε_r ε₀)`. The 1s trial wave function `exp(−r / a)` has energy

```
E(a) = ℏ² / (2 μ a²) − k / a
```

(kinetic term plus Coulomb term; this form is the premise, and it is exact
for the 1s state). Completing the square, `E(a) = (ℏ² / 2μ)(1/a − μ k/ℏ²)² −
μ k² / (2 ℏ²)`, so the minimum is at `a = ℏ² / (μ k)` with binding energy
`μ k² / (2 ℏ²)`. The minimizer is unique. Substituting `k = k₀ / ε_r` and
comparing with hydrogen gives the two scaling laws, and `E_X = k / (2 a_X)`.

`exponent_needed` shows `1 / ε_r` is not `1 / ε_r²`. Premises: parabolic
isotropic bands, static dielectric constant, `a_X` much larger than the
lattice constant. Not a model of the GaAs numbers; `μ / m_e` and `ε_r` are
inputs.
-/

namespace PhysJS.WannierExciton

/-- 1s trial energy of a hydrogenic pair with reduced mass `μ` and Coulomb strength `k`. -/
noncomputable def trialEnergy (ħ μ k a : ℝ) : ℝ := ħ ^ 2 / (2 * μ * a ^ 2) - k / a

/-- Completed square. -/
lemma trialEnergy_square (ħ μ k a : ℝ) (hħ : 0 < ħ) (hμ : 0 < μ) (ha : 0 < a) :
    trialEnergy ħ μ k a =
      ħ ^ 2 / (2 * μ) * (1 / a - μ * k / ħ ^ 2) ^ 2 - μ * k ^ 2 / (2 * ħ ^ 2) := by
  unfold trialEnergy
  field_simp
  ring

/-- Hydrogenic minimum: the minimizer is `ℏ² / (μ k)` and the minimum is `−μ k² / (2 ℏ²)`.

`hmin` says `a_X` minimizes the trial energy over `a > 0`, `hEX` that the
exciton energy is that minimum. -/
theorem exciton_minimum (ħ μ k aX EX : ℝ) (hħ : 0 < ħ) (hμ : 0 < μ) (hk : 0 < k)
    (haX : 0 < aX)
    (hmin : ∀ a, 0 < a → trialEnergy ħ μ k aX ≤ trialEnergy ħ μ k a)
    (hEX : EX = trialEnergy ħ μ k aX) :
    aX = ħ ^ 2 / (μ * k) ∧ EX = -(μ * k ^ 2 / (2 * ħ ^ 2)) := by
  have hastar : 0 < ħ ^ 2 / (μ * k) := by positivity
  have h1 := hmin _ hastar
  rw [trialEnergy_square ħ μ k aX hħ hμ haX,
    trialEnergy_square ħ μ k _ hħ hμ hastar] at h1
  have hzero : 1 / (ħ ^ 2 / (μ * k)) - μ * k / ħ ^ 2 = 0 := by
    field_simp; ring
  rw [hzero] at h1
  have hc : 0 < ħ ^ 2 / (2 * μ) := by positivity
  have hsq : (1 / aX - μ * k / ħ ^ 2) ^ 2 = 0 := by
    have h2 : ħ ^ 2 / (2 * μ) * (1 / aX - μ * k / ħ ^ 2) ^ 2 ≤ 0 := by linarith
    have h3 : 0 ≤ ħ ^ 2 / (2 * μ) * (1 / aX - μ * k / ħ ^ 2) ^ 2 := by positivity
    have h4 : ħ ^ 2 / (2 * μ) * (1 / aX - μ * k / ħ ^ 2) ^ 2 = 0 := le_antisymm h2 h3
    rcases mul_eq_zero.mp h4 with h | h
    · exact absurd h hc.ne'
    · exact h
  have hinv : 1 / aX = μ * k / ħ ^ 2 := by
    have := pow_eq_zero_iff (two_ne_zero) |>.mp hsq
    linarith
  have haval : aX = ħ ^ 2 / (μ * k) := by
    field_simp at hinv ⊢
    linarith
  refine ⟨haval, ?_⟩
  rw [hEX, trialEnergy_square ħ μ k aX hħ hμ haX, hinv]
  simp

/-- Wannier exciton scaling relative to hydrogen.

`hRy` is `R_y = m k₀² / (2 ℏ²)`, `haB` is `a_B = ℏ² / (m k₀)`, and `hk` is the
screened strength `k = k₀ / ε_r`. `EbX` is the binding energy `−E_X`.

The 1s trial
energy is a premise; no band-structure or lattice-constant check. -/
theorem exciton_eq (ħ μ m k0 k εr aX EX Ry aB : ℝ)
    (hħ : 0 < ħ) (hμ : 0 < μ) (hm : 0 < m) (hk0 : 0 < k0) (hεr : 0 < εr)
    (hk : k = k0 / εr)
    (haX : 0 < aX)
    (hmin : ∀ a, 0 < a → trialEnergy ħ μ k aX ≤ trialEnergy ħ μ k a)
    (hEX : EX = trialEnergy ħ μ k aX)
    (hRy : Ry = m * k0 ^ 2 / (2 * ħ ^ 2))
    (haB : aB = ħ ^ 2 / (m * k0)) :
    -EX = (μ / m) * Ry / εr ^ 2 ∧ aX = aB * εr * m / μ ∧ -EX = k / (2 * aX) := by
  have hkpos : 0 < k := by rw [hk]; positivity
  obtain ⟨ha, hE⟩ := exciton_minimum ħ μ k aX EX hħ hμ hkpos haX hmin hEX
  refine ⟨?_, ?_, ?_⟩
  · rw [hE, hk, hRy]; field_simp
  · rw [ha, hk, haB]; field_simp
  · rw [hE, ha]; field_simp

/-- `1 / ε_r` is not `1 / ε_r²`. -/
theorem exponent_needed (Ry r : ℝ) (hRy : 0 < Ry) (hr : 1 < r) :
    Ry / r ≠ Ry / r ^ 2 := by
  intro h
  have hr0 : 0 < r := by linarith
  rw [div_eq_div_iff hr0.ne' (by positivity)] at h
  have : Ry * r * (r - 1) = 0 := by linear_combination h
  rcases mul_eq_zero.mp this with h' | h'
  · have : 0 < Ry * r := by positivity
    linarith
  · linarith

end PhysJS.WannierExciton
