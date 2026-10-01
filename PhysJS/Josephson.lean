/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-59`. Derivation step. The Josephson frequency, not the tunneling Hamiltonian.

The encoded scalar is

```
f = (2e / h) V,    K_J = 2e / h,    f = K_J V
```

The factor `2` is the Cooper-pair charge, taken as a premise. Replacing it by
`e`, a single electron, is a different frequency. This does not derive the
tunneling Hamiltonian.
-/

namespace PhysJS.Josephson

/-- Josephson constant `K_J = 2e / h`. -/
noncomputable def josephsonConstant (e h : ℝ) : ℝ :=
  2 * e / h

/-- Encoded frequency `f = (2e / h) V`. -/
noncomputable def frequency (e h V : ℝ) : ℝ :=
  (2 * e / h) * V

/-- The same formula with the single-electron charge `e` in place of `2e`. -/
noncomputable def singleElectron (e h V : ℝ) : ℝ :=
  (e / h) * V

/-- `f = (2e/h) V`, `K_J = 2e/h`, and `f = K_J V`. Clearing `h` recovers `2e`.

The factor `2` is the pair charge.

Covers the derivation step of `be-59`. Not the tunneling Hamiltonian. -/
theorem frequency_eq (e h V : ℝ) (hh : h ≠ 0) :
    frequency e h V = (2 * e / h) * V ∧
      josephsonConstant e h = 2 * e / h ∧
      frequency e h V = josephsonConstant e h * V ∧
      h * josephsonConstant e h = 2 * e := by
  unfold frequency josephsonConstant
  refine ⟨rfl, rfl, ?_, ?_⟩
  · ring
  · field_simp [hh]

/-- `e` in place of `2e` is not the Josephson frequency, and not `K_J`. -/
theorem wrong_dictionary_single_electron (e h V : ℝ) (he : e ≠ 0) (hh : h ≠ 0) (hV : V ≠ 0) :
    e / h ≠ josephsonConstant e h ∧ singleElectron e h V ≠ frequency e h V := by
  unfold josephsonConstant singleElectron frequency
  have hconst : e / h ≠ 2 * e / h := by
    intro hEq
    have : e = 2 * e := by
      field_simp [hh] at hEq
      linarith
    have : e = 0 := by linarith
    exact he this
  refine ⟨hconst, ?_⟩
  intro hEq
  exact hconst (mul_right_cancel₀ hV hEq)

end PhysJS.Josephson
