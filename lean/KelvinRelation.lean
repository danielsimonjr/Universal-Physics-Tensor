/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-73`. Bridge. The Kelvin relation, the second Thomson relation.

The catalog equation is

```
Π = S T
```

`peltier_eq` derives it for one pair of linear thermoelectric fluxes

```
J_e = L11 E / T + L12 (−∇T) / T²
J_q = L21 E / T + L22 (−∇T) / T²
```

`S` is the open-circuit field per temperature gradient, `J_e = 0`.
`Π` is the isothermal heat current per charge current, `∇T = 0`.
`ThermoelectricOnsager.onsager` is `L12 = L21`. That is the Onsager
hypothesis for this pair, the structure assumption of microscopic
reversibility. It is a field of the structure, not an axiom.

`onsager_needed` keeps the same flux laws and the same two definitions
and drops `L12 = L21`. The coefficients then disagree. The first Thomson
relation `μ = T dS/dT` is not derived. A measured thermopower is not
this theorem. The linear laws are hypotheses.
-/

namespace PhysJS.KelvinRelation

/-- Charge current in the Onsager basis. `dT` is the temperature gradient. -/
noncomputable def electricCurrent (L11 L12 T E dT : ℝ) : ℝ :=
  L11 * (E / T) + L12 * (-dT / T ^ 2)

/-- Heat current in the same basis. -/
noncomputable def heatCurrent (L21 L22 T E dT : ℝ) : ℝ :=
  L21 * (E / T) + L22 * (-dT / T ^ 2)

/-- One thermoelectric pair, with Onsager reciprocity as a structure field.

`onsager` is microscopic reversibility for these fluxes. It is not an axiom.
-/
structure ThermoelectricOnsager where
  L11 : ℝ
  L12 : ℝ
  L21 : ℝ
  L22 : ℝ
  T : ℝ
  temperature_ne : T ≠ 0
  conductance_ne : L11 ≠ 0
  onsager : L12 = L21

lemma electricCurrent_isothermal (L11 L12 T E : ℝ) :
    electricCurrent L11 L12 T E 0 = L11 * (E / T) := by
  unfold electricCurrent
  ring

lemma heatCurrent_isothermal (L21 L22 T E : ℝ) :
    heatCurrent L21 L22 T E 0 = L21 * (E / T) := by
  unfold heatCurrent
  ring

/-- Open circuit: `J_e = 0` fixes `E / ∇T = L12 / (L11 T)`. -/
theorem open_circuit_seebeck (L11 L12 T E dT : ℝ) (hT : T ≠ 0) (hL : L11 ≠ 0)
    (hdT : dT ≠ 0) (hJ : electricCurrent L11 L12 T E dT = 0) :
    E / dT = L12 / (L11 * T) := by
  unfold electricCurrent at hJ
  have h : L11 * (E / T) = L12 * (dT / T ^ 2) := by
    calc
      L11 * (E / T)
          = L11 * (E / T) + L12 * (-dT / T ^ 2) - L12 * (-dT / T ^ 2) := by ring
      _ = 0 - L12 * (-dT / T ^ 2) := by rw [hJ]
      _ = L12 * (dT / T ^ 2) := by ring
  field_simp [hT, hL, hdT] at h ⊢
  linarith

/-- Uniform temperature: `J_q / J_e = L21 / L11` when the charge current
is nonzero. -/
theorem isothermal_peltier (L11 L12 L21 L22 T E : ℝ) (hT : T ≠ 0) (hL : L11 ≠ 0)
    (hJ : electricCurrent L11 L12 T E 0 ≠ 0) :
    heatCurrent L21 L22 T E 0 / electricCurrent L11 L12 T E 0 = L21 / L11 := by
  have hE := electricCurrent_isothermal L11 L12 T E
  have hQ := heatCurrent_isothermal L21 L22 T E
  rw [hE] at hJ ⊢
  rw [hQ]
  have hcur : L11 * (E / T) ≠ 0 := hJ
  have hEne : E ≠ 0 := by
    intro hE0
    apply hcur
    simp [hE0]
  field_simp [hcur, hL, hT, hEne]

/-- The second Thomson relation: `Π = S T`.

`Eopen / dTopen` is the Seebeck coefficient. The ratio of isothermal
currents is the Peltier coefficient. `R.onsager` identifies them. -/
theorem peltier_eq (R : ThermoelectricOnsager) (Eopen dTopen Eiso : ℝ)
    (hdT : dTopen ≠ 0)
    (hopen : electricCurrent R.L11 R.L12 R.T Eopen dTopen = 0)
    (hiso : electricCurrent R.L11 R.L12 R.T Eiso 0 ≠ 0) :
    heatCurrent R.L21 R.L22 R.T Eiso 0 /
        electricCurrent R.L11 R.L12 R.T Eiso 0 =
      (Eopen / dTopen) * R.T := by
  have hS := open_circuit_seebeck R.L11 R.L12 R.T Eopen dTopen R.temperature_ne
    R.conductance_ne hdT hopen
  have hPel := isothermal_peltier R.L11 R.L12 R.L21 R.L22 R.T Eiso R.temperature_ne
    R.conductance_ne hiso
  rw [hPel, hS, R.onsager]
  field_simp [R.conductance_ne, R.temperature_ne]

/-- Without `L12 = L21`, the measured coefficients disagree.

The flux laws and the two definitions stay. Only the Onsager field is
dropped. -/
theorem onsager_needed (L11 L12 L21 L22 T Eopen dTopen Eiso : ℝ)
    (hT : T ≠ 0) (hL : L11 ≠ 0) (hdT : dTopen ≠ 0) (hneq : L12 ≠ L21)
    (hopen : electricCurrent L11 L12 T Eopen dTopen = 0)
    (hiso : electricCurrent L11 L12 T Eiso 0 ≠ 0) :
    heatCurrent L21 L22 T Eiso 0 / electricCurrent L11 L12 T Eiso 0 ≠
      (Eopen / dTopen) * T := by
  have hS := open_circuit_seebeck L11 L12 T Eopen dTopen hT hL hdT hopen
  have hPel := isothermal_peltier L11 L12 L21 L22 T Eiso hT hL hiso
  rw [hPel, hS]
  intro hEq
  field_simp [hL, hT] at hEq
  exact hneq hEq.symm

end PhysJS.KelvinRelation
