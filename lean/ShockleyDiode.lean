/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-82`. Bridge. Shockley ideal diode.

The catalog equation is

```
I = I_s (exp(e V / (k_B T)) − 1)
```

`e` is the elementary charge. Euler's number is `Real.exp`. `shockley_eq`
derives the current from the stated junction premises. Quasi-equilibrium
across an abrupt junction multiplies the equilibrium flux by the Boltzmann
factor of the barrier, with ideality `η` in the exponent. Ideality 1 puts
the whole voltage in `e V / (k_B T)`. Detailed balance at `V = 0` sets the
reverse flux equal to that equilibrium forward flux. Low injection keeps
the reverse flux at that value when the junction is biased. The net current
is the difference. `zero_bias` is the detailed-balance point. `ideality_not_two`
is a generation-recombination exponent. This is not a diffusion-length ODE.
-/

namespace PhysJS.ShockleyDiode

/-- Ideal diode. `hboltzmann` is the quasi-equilibrium barrier factor.
`hideality` is ideality 1. `hdetail` is detailed balance: the reverse flux
equals the forward flux at `V = 0`. Low injection is that this reverse flux
is the reverse flux at the operating bias.

Kind `bridge` on `PhysJS.ShockleyDiode.shockley_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not ideality 2. -/
theorem shockley_eq (I Ifwd Irev Is e V kB T η : ℝ)
    (_hkT : kB * T ≠ 0) (_hη : η ≠ 0)
    (hboltzmann : Ifwd = Is * Real.exp (e * V / (η * kB * T)))
    (hideality : η = 1)
    (hdetail : Irev = Is * Real.exp (e * (0 : ℝ) / (η * kB * T)))
    (hnet : I = Ifwd - Irev) :
    I = Is * (Real.exp (e * V / (kB * T)) - 1) := by
  have hrev : Irev = Is := by
    rw [hdetail]
    simp [Real.exp_zero]
  rw [hnet, hboltzmann, hrev, hideality]
  ring_nf

/-- Detailed balance: zero bias carries zero net current. -/
theorem zero_bias (Is e kB T : ℝ) (_hkT : kB * T ≠ 0) :
    Is * (Real.exp (e * (0 : ℝ) / (kB * T)) - 1) = 0 := by
  simp [Real.exp_zero]

/-- Ideality 2 is not the ideal diode when the exponent is nonzero. -/
theorem ideality_not_two (Is e V kB T : ℝ) (hIs : Is ≠ 0) (hkT : kB * T ≠ 0)
    (hV : e * V ≠ 0) :
    Is * (Real.exp (e * V / ((2 : ℝ) * kB * T)) - 1) ≠
      Is * (Real.exp (e * V / (kB * T)) - 1) := by
  intro hEq
  have hexp : Real.exp (e * V / ((2 : ℝ) * kB * T)) = Real.exp (e * V / (kB * T)) := by
    have hscaled : Is * Real.exp (e * V / ((2 : ℝ) * kB * T)) =
        Is * Real.exp (e * V / (kB * T)) := by
      linarith
    exact mul_left_cancel₀ hIs hscaled
  have harg := Real.exp_injective hexp
  have hden2 : (2 : ℝ) * kB * T ≠ 0 := by
    rw [mul_assoc]
    exact mul_ne_zero (by norm_num) hkT
  rw [div_eq_div_iff hden2 hkT] at harg
  have hzero : e * V * (kB * T) = 0 := by
    have hsub : e * V * (kB * T) - e * V * (2 * kB * T) = 0 := sub_eq_zero.mpr harg
    have hfac : e * V * (kB * T) - e * V * (2 * kB * T) = -(e * V * (kB * T)) := by ring
    rw [hfac] at hsub
    linarith
  exact mul_ne_zero hV hkT hzero

end PhysJS.ShockleyDiode
