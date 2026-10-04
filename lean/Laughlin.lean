/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.QuantumHall
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.NormNum

/-!
`be-60`. Bridge. The catalog filling fraction, and the `ν = 1/3` case.

UPT stores a `formalRef` of kind `bridge` on `PhysJS.Laughlin.filling_fraction`.
The covers line still begins with `derivation-step`.

The encoded scalar at filling `ν = 1/3` is

```
σ_xy = ν e² / h,    R_xy = 3 h / e² = 3 R_K
```

`R_K` and the integer reciprocal are `PhysJS.QuantumHall`. At `ν = 1` the
formula is that lemma at plateau `C = 1`. The inverted fraction `R_K / 3` is
the integer plateau `C = 3`, not this resistance. This does not prove the
Laughlin wavefunction, and it does not prove the anyon charge `e/3`.
-/

namespace PhysJS.Laughlin

open QuantumHall

/-- Laughlin filling `ν = 1/3`. -/
noncomputable def filling : ℝ := 1 / 3

/-- Encoded conductance `σ_xy = ν e² / h`. -/
noncomputable def sigma (e h : ℝ) : ℝ :=
  filling * e ^ 2 / h

/-- Encoded resistance `R_xy = R_K / ν`. -/
noncomputable def resistance (e h : ℝ) : ℝ :=
  vonKlitzing e h / filling

/-- Conductance at a general filling `ν`. -/
noncomputable def sigmaAt (ν e h : ℝ) : ℝ :=
  ν * e ^ 2 / h

/-- Resistance `R_xy = R_K / ν` at a general filling. -/
noncomputable def resistanceAt (ν e h : ℝ) : ℝ :=
  vonKlitzing e h / ν

/-- The catalog equation at `ν = p / q`, for nonzero integers `p` and `q`:

```
σ_xy = ν e² / h,    R_xy = R_K / ν = (q / p) h / e²
```

Oddness of `q` is the Laughlin selection rule and is not this identity.
`fraction` remains the case `ν = 1/3`. Not the Laughlin wavefunction,
and not the anyon charge `e/3`. -/
theorem filling_fraction (p q : ℤ) (e h : ℝ) (hp : p ≠ 0) (hq : q ≠ 0) :
    sigmaAt ((p : ℝ) / q) e h = ((p : ℝ) / q) * e ^ 2 / h ∧
      resistanceAt ((p : ℝ) / q) e h = vonKlitzing e h / ((p : ℝ) / q) ∧
      resistanceAt ((p : ℝ) / q) e h = ((q : ℝ) / (p : ℝ)) * (h / e ^ 2) := by
  have hp0 : (p : ℝ) ≠ 0 := mt Int.cast_eq_zero.mp hp
  have hq0 : (q : ℝ) ≠ 0 := mt Int.cast_eq_zero.mp hq
  unfold sigmaAt resistanceAt vonKlitzing
  refine ⟨rfl, rfl, ?_⟩
  -- The charge and Planck's constant may be zero: both sides are then zero.
  have hinv : ((p : ℝ) / q)⁻¹ = (q : ℝ) / p := by field_simp [hp0, hq0]
  rw [div_eq_mul_inv (h / e ^ 2) ((p : ℝ) / q), hinv]
  exact mul_comm _ _

/-- At `ν = 1/3`, `R_xy = 3 R_K = 3 h / e²`, and the product is `1`.
At `ν = 1` the conductance and resistance are the integer plateau `C = 1`.

`fraction` is separate from the formalRef. `be-60` is kind `bridge` on
`filling_fraction`. The covers line still begins with `derivation-step`.
Not the Laughlin wavefunction. -/
theorem fraction (e h : ℝ) (he : e ≠ 0) (hh : h ≠ 0) :
    sigma e h = (1 / 3) * e ^ 2 / h ∧
      resistance e h = 3 * vonKlitzing e h ∧
      resistance e h = 3 * h / e ^ 2 ∧
      sigma e h * resistance e h = 1 ∧
      QuantumHall.sigma 1 e h = e ^ 2 / h ∧
      hallResistance 1 e h = vonKlitzing e h := by
  obtain ⟨hσ, _, hRK, hprod, hdiv⟩ :=
    reciprocal (1 : ℤ) e h one_ne_zero he hh
  have hσ1 : QuantumHall.sigma 1 e h = e ^ 2 / h := by simpa using hσ
  have hR1 : hallResistance 1 e h = vonKlitzing e h := by simpa using hdiv
  unfold sigma resistance filling
  have hfill : (1 / 3 : ℝ) ≠ 0 := by norm_num
  have hprod' : (e ^ 2 / h) * vonKlitzing e h = 1 := by
    rw [← hσ1, ← hR1]
    exact hprod
  refine ⟨rfl, ?_, ?_, ?_, hσ1, hR1⟩
  · field_simp [hfill]
  · rw [hRK]
    field_simp [he, hfill]
  · field_simp [hh] at hprod'
    field_simp [hfill]
    exact hprod'

/-- `R_K / 3` is the integer plateau `C = 3`, not the Laughlin resistance. -/
theorem wrong_dictionary_inverted (e h : ℝ) (he : e ≠ 0) (hh : h ≠ 0) :
    hallResistance 3 e h = vonKlitzing e h / 3 ∧
      hallResistance 3 e h ≠ resistance e h := by
  obtain ⟨_, _, hRK, _, hdiv⟩ :=
    reciprocal (3 : ℤ) e h (by decide : (3 : ℤ) ≠ 0) he hh
  refine ⟨hdiv, ?_⟩
  intro hEq
  have hres : resistance e h = 3 * vonKlitzing e h := by
    unfold resistance filling
    field_simp
  rw [hdiv, hres] at hEq
  have hv : vonKlitzing e h ≠ 0 := by
    rw [hRK]
    exact div_ne_zero hh (pow_ne_zero 2 he)
  field_simp [hv] at hEq
  norm_num at hEq

end PhysJS.Laughlin
