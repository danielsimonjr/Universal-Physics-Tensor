/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-141`. Bridge. Josephson inductance at zero phase.

The catalog equation is

```
L_J = Φ₀ / (2 π I_c) = ℏ / (2 e I_c)
```

at `φ = 0`. `e` is the elementary charge. `inductance_eq` derives it from
the Josephson equations `be-59` already uses: `I = I_c sin φ` and
`V = (ℏ / 2 e) dφ/dt`. The chain rule gives `dI/dt = I_c cos φ · dφ/dt`.
The inductor definition is `V = L dI/dt`. At `φ = 0`, `cos φ = 1`. A finite
phase keeps `cos φ`. `Φ₀ = h / (2 e)` and `h = 2 π ℏ` are the Cooper-pair
flux, taken as that definition. `e ≠ 0`, `I_c ≠ 0`, and `dφ/dt ≠ 0`. The
tunneling Hamiltonian is not this row.
-/

namespace PhysJS.JosephsonInductance

open Real

/-- Derivative of `I_c sin φ`. -/
theorem hasDerivAt_current (Ic : ℝ) (φ : ℝ → ℝ) (t dφ : ℝ) (hφ : HasDerivAt φ dφ t) :
    HasDerivAt (fun s => Ic * Real.sin (φ s)) (Ic * Real.cos (φ t) * dφ) t := by
  convert hφ.sin.const_mul Ic using 1
  ring

/-- Josephson inductance at `φ = 0`.

`hV` is `V = (ℏ / 2 e) dφ/dt`. `hL` is `V = L dI/dt` with `dI/dt` the
derivative of `I_c sin φ`. `hzero` is the phase at which the cosine is `1`.

Kind `bridge` on `PhysJS.JosephsonInductance.inductance_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not a finite-phase inductance, and not the frequency of `be-59`. -/
theorem inductance_eq
    (Ic e hbar h Φ0 L V dφ t : ℝ) (φ : ℝ → ℝ)
    (he : e ≠ 0) (hIc : Ic ≠ 0) (hdφ : dφ ≠ 0)
    (hφ : HasDerivAt φ dφ t) (hzero : φ t = 0)
    (hV : V = (hbar / (2 * e)) * dφ)
    (hL : V = L * (Ic * Real.cos (φ t) * dφ))
    (hflux : Φ0 = h / (2 * e))
    (hh : h = 2 * Real.pi * hbar) :
    L = hbar / (2 * e * Ic) ∧ L = Φ0 / (2 * Real.pi * Ic) := by
  have hcos : Real.cos (φ t) = 1 := by rw [hzero, Real.cos_zero]
  have _hderiv := hasDerivAt_current Ic φ t dφ hφ
  have hLval : L = hbar / (2 * e * Ic) := by
    rw [hV, hcos] at hL
    have hclear : (hbar / (2 * e)) * dφ = L * Ic * dφ := by
      simpa [mul_assoc] using hL
    field_simp [he, hIc, hdφ] at hclear ⊢
    linarith
  refine ⟨hLval, ?_⟩
  rw [hLval, hflux, hh]
  field_simp [he, hIc, Real.pi_ne_zero]

/-- A phase with `cos φ ≠ 1` is not the zero-phase inductance. -/
theorem finite_phase_not_zero (hbar e Ic cφ : ℝ)
    (he : e ≠ 0) (hIc : Ic ≠ 0) (hh : hbar ≠ 0) (hc : cφ ≠ 0) (hc1 : cφ ≠ 1) :
    hbar / (2 * e * Ic * cφ) ≠ hbar / (2 * e * Ic) := by
  intro hEq
  have hden1 : (2 : ℝ) * e * Ic * cφ ≠ 0 := by
    exact mul_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num) he) hIc) hc
  have hden2 : (2 : ℝ) * e * Ic ≠ 0 :=
    mul_ne_zero (mul_ne_zero (by norm_num) he) hIc
  field_simp [hh, hden1, hden2] at hEq
  exact hc1 hEq.symm

end PhysJS.JosephsonInductance
