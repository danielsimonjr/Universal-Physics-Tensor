/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Dimensional
import Mathlib.Algebra.BigOperators.Fin
import Mathlib.Tactic.FinCases
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum

/-!
`CE-pendulum-period`. Derivation step. The exponent tuple `(1/2, -1/2)` on
`(length, gravity)` is the unique rational tuple whose dimension is the
period's. Base dimensions are `(L, T)`, index `0` and `1`: the `L` and `T`
components of the `dimensional.governing` and `dimensional.target` entries that
`src/canonical/entries/dimensional-classics.ts` records for `CE-pendulum-period`.
The prefactor `C` is not fixed and `2π` is not derived. This is not the pendulum
equation of motion.

`CE-kepler-third`. Derivation step. The exponent tuple `(3/2, -1/2, -1/2)` on
`(semi-major-axis, G, mass)` is the unique rational tuple whose dimension is that of the orbital
period.
Base dimensions are `(L, M, T)`. The prefactor `2π` is not derived. This is not Kepler's third law
as a statement about orbits.

`CE-schwarzschild-radius`. Derivation step. The exponent tuple `(1, 1, -2)` on
`(mass, G, c)` is the unique rational tuple whose dimension is that of the Schwarzschild radius.
Base dimensions are `(L, M, T)`. The prefactor `2` is not derived. This is not the Schwarzschild
metric.

`CE-string-wave-speed`. Derivation step. The exponent tuple `(1/2, -1/2)` on
`(tension, linear-density)` is the unique rational tuple whose dimension is that of the wave speed
on a string.
Base dimensions are `(L, M, T)`. The prefactor `1` is not derived. This is not the wave equation.
Three rows over two inputs is an overdetermined but consistent system.

`CE-planck-length`. Derivation step. The exponent tuple `(1/2, 1/2, -3/2)` on
`(hbar, G, c)` is the unique rational tuple whose dimension is that of the Planck length.
Base dimensions are `(L, M, T)`. The prefactor `1` is not derived. This is not a statement about
quantum gravity.

`CE-planck-mass`. Derivation step. The exponent tuple `(1/2, 1/2, -1/2)` on
`(hbar, c, G)` is the unique rational tuple whose dimension is that of the Planck mass.
Base dimensions are `(L, M, T)`. The prefactor `1` is not derived. This is not a statement about
quantum gravity.

`CE-planck-time`. Derivation step. The exponent tuple `(1/2, 1/2, -5/2)` on
`(hbar, G, c)` is the unique rational tuple whose dimension is that of the Planck time.
Base dimensions are `(L, M, T)`. The prefactor `1` is not derived. This is not a statement about
quantum gravity.

`CE-compton-wavelength`. Derivation step. The exponent tuple `(1, -1, -1)` on
`(hbar, mass, c)` is the unique rational tuple whose dimension is that of the reduced Compton
wavelength.
Base dimensions are `(L, M, T)`. The prefactor `1` is not derived. This is not a statement about
scattering.

`CE-thermal-de-broglie`. Derivation step. The exponent tuple `(1, -1/2, -1/2, -1/2)` on
`(hbar, mass, k_B, temperature)` is the unique rational tuple whose dimension is that of the
thermal de Broglie wavelength.
Base dimensions are `(L, M, T, Θ)`. The prefactor is not derived. This is not a statement about a
gas. The key `be-12` holds a different entry, so this one uses the canonical key.

`hawking_exponent_not_unique` is the negative control. Over `(ℏ, c, G, M, k_B)`
with base dimensions `(L, M, T, Θ)`, the exponent tuple for a temperature is not
unique. The Hawking form and `M c² / k_B` both solve the dimension equation. The
free dimensionless group is `ℏ c / (G M²)`. This theorem has no manifest key.
-/

namespace PhysJS.BuckinghamClassics

/-- `e` solves the dimension equation: the output dimension is the
`e`-combination of the input dimensions. This is the `hout` hypothesis of
`Dimensional.monomial_form`. -/
def Solves {n k : ℕ} (inputDim : Fin k → Dimensional.Dim n) (outputDim : Dimensional.Dim n)
    (e : Fin k → ℚ) : Prop :=
  ∀ i, outputDim i = ∑ j : Fin k, e j * inputDim j i

/-- `[length] = L`. -/
def lengthDim : Dimensional.Dim 2
  | 0 => 1
  | 1 => 0

/-- `[gravity] = L T⁻²`. -/
def gravityDim : Dimensional.Dim 2
  | 0 => 1
  | 1 => -2

/-- `[period] = T`. -/
def periodDim : Dimensional.Dim 2
  | 0 => 0
  | 1 => 1

/-- Inputs `(length, gravity)`. -/
def pendulumInputs : Fin 2 → Dimensional.Dim 2
  | 0 => lengthDim
  | 1 => gravityDim

/-- The tuple `(1/2, -1/2)`: `tests/dimensional/derivation-benchmark.test.ts` pins it. -/
def pendulumExponent : Fin 2 → ℚ
  | 0 => 1 / 2
  | 1 => -1 / 2

/-- The dimension equation `[period] = e₀ [length] + e₁ [gravity]` has exactly
one rational solution, `(1/2, -1/2)`. This covers the exponent tuple of
`CE-pendulum-period`: the form, not the prefactor `2π`. -/
theorem pendulum_exponent_unique (e : Fin 2 → ℚ) :
    Solves pendulumInputs periodDim e ↔ e = pendulumExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    simp [pendulumInputs, lengthDim, gravityDim, periodDim, Fin.sum_univ_two] at h0 h1
    have e1 : e 1 = -1 / 2 := by linarith
    have e0 : e 0 = 1 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [pendulumExponent] using e0
    · simpa [pendulumExponent] using e1
  · rintro rfl i
    fin_cases i <;>
      norm_num [pendulumInputs, lengthDim, gravityDim, periodDim, pendulumExponent,
        Fin.sum_univ_two]

/-- `[ℏ] = L² M T⁻¹` over `(L, M, T, Θ)`. -/
def hbarDim : Dimensional.Dim 4
  | 0 => 2
  | 1 => 1
  | 2 => -1
  | 3 => 0

/-- `[c] = L T⁻¹`. -/
def cDim : Dimensional.Dim 4
  | 0 => 1
  | 1 => 0
  | 2 => -1
  | 3 => 0

/-- `[G] = L³ M⁻¹ T⁻²`. -/
def gDim : Dimensional.Dim 4
  | 0 => 3
  | 1 => -1
  | 2 => -2
  | 3 => 0

/-- `[M] = M`. -/
def massDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => 1
  | 2 => 0
  | 3 => 0

/-- `[k_B] = L² M T⁻² Θ⁻¹`. -/
def kBDim : Dimensional.Dim 4
  | 0 => 2
  | 1 => 1
  | 2 => -2
  | 3 => -1

/-- `[temperature] = Θ`. -/
def temperatureDim : Dimensional.Dim 4
  | 0 => 0
  | 1 => 0
  | 2 => 0
  | 3 => 1

/-- Hawking-set inputs `(ℏ, c, G, M, k_B)`. -/
def hawkingInputs : Fin 5 → Dimensional.Dim 4
  | 0 => hbarDim
  | 1 => cDim
  | 2 => gDim
  | 3 => massDim
  | 4 => kBDim

/-- Exponents of the Hawking form `ℏ c³ / (G M k_B)`. -/
def hawkingForm : Fin 5 → ℚ
  | 0 => 1
  | 1 => 3
  | 2 => -1
  | 3 => -1
  | 4 => -1

/-- Exponents of the rest-mass form `M c² / k_B`. -/
def restMassForm : Fin 5 → ℚ
  | 0 => 0
  | 1 => 2
  | 2 => 0
  | 3 => 1
  | 4 => -1

/-- Negative control. Two different rational tuples solve the dimension equation
for a temperature over `(ℏ, c, G, M, k_B)`. The exponent tuple is not unique. -/
theorem hawking_exponent_not_unique :
    hawkingForm ≠ restMassForm ∧ Solves hawkingInputs temperatureDim hawkingForm ∧
      Solves hawkingInputs temperatureDim restMassForm := by
  refine ⟨?_, ?_, ?_⟩
  · intro h
    have := congrFun h 0
    simp [hawkingForm, restMassForm] at this
  · intro i
    fin_cases i <;>
      norm_num [Solves, hawkingInputs, hbarDim, cDim, gDim, massDim, kBDim, temperatureDim,
        hawkingForm, Fin.sum_univ_five]
  · intro i
    fin_cases i <;>
      norm_num [Solves, hawkingInputs, hbarDim, cDim, gDim, massDim, kBDim, temperatureDim,
        restMassForm, Fin.sum_univ_five]

/-- `[length] = L` over `(L, M, T, Θ)`. -/
def lengthDim4 : Dimensional.Dim 4
  | 0 => 1
  | 1 => 0
  | 2 => 0
  | 3 => 0

/-- `[ℏ] = L² M T⁻¹` over `(L, M, T)`. -/
def hbarDim3 : Dimensional.Dim 3
  | 0 => 2
  | 1 => 1
  | 2 => -1

/-- `[c] = L T⁻¹` over `(L, M, T)`. -/
def cDim3 : Dimensional.Dim 3
  | 0 => 1
  | 1 => 0
  | 2 => -1

/-- `[G] = L³ M⁻¹ T⁻²` over `(L, M, T)`. -/
def gDim3 : Dimensional.Dim 3
  | 0 => 3
  | 1 => -1
  | 2 => -2

/-- `[mass] = M` over `(L, M, T)`. -/
def massDim3 : Dimensional.Dim 3
  | 0 => 0
  | 1 => 1
  | 2 => 0

/-- `[length] = L` over `(L, M, T)`. -/
def lengthDim3 : Dimensional.Dim 3
  | 0 => 1
  | 1 => 0
  | 2 => 0

/-- `[time] = T` over `(L, M, T)`. -/
def timeDim3 : Dimensional.Dim 3
  | 0 => 0
  | 1 => 0
  | 2 => 1

/-- `[tension] = L M T⁻²` over `(L, M, T)`. -/
def tensionDim3 : Dimensional.Dim 3
  | 0 => 1
  | 1 => 1
  | 2 => -2

/-- `[linear density] = L⁻¹ M` over `(L, M, T)`. -/
def linearDensityDim3 : Dimensional.Dim 3
  | 0 => -1
  | 1 => 1
  | 2 => 0

/-- `[speed] = L T⁻¹` over `(L, M, T)`. -/
def speedDim3 : Dimensional.Dim 3
  | 0 => 1
  | 1 => 0
  | 2 => -1

/-- Inputs `(semi-major-axis, G, mass)`. -/
def keplerInputs : Fin 3 → Dimensional.Dim 3
  | 0 => lengthDim3
  | 1 => gDim3
  | 2 => massDim3

/-- The tuple `(3/2, -1/2, -1/2)`. -/
def keplerExponent : Fin 3 → ℚ
  | 0 => 3 / 2
  | 1 => -1 / 2
  | 2 => -1 / 2

/-- The dimension equation has exactly one rational solution, `(3/2, -1/2, -1/2)`. This covers the
exponent tuple of `CE-kepler-third`: the form, not the prefactor. -/
theorem kepler_exponent_unique (e : Fin 3 → ℚ) :
    Solves keplerInputs timeDim3 e ↔ e = keplerExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [keplerInputs, lengthDim3, gDim3, massDim3, timeDim3, Fin.sum_univ_three] at h0 h1 h2
    have e0 : e 0 = 3 / 2 := by linarith
    have e1 : e 1 = -1 / 2 := by linarith
    have e2 : e 2 = -1 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [keplerExponent] using e0
    · simpa [keplerExponent] using e1
    · simpa [keplerExponent] using e2
  · rintro rfl i
    fin_cases i <;>
      norm_num [keplerInputs, lengthDim3, gDim3, massDim3, timeDim3, keplerExponent,
        Fin.sum_univ_three]

/-- Inputs `(mass, G, c)`. -/
def schwarzschildInputs : Fin 3 → Dimensional.Dim 3
  | 0 => massDim3
  | 1 => gDim3
  | 2 => cDim3

/-- The tuple `(1, 1, -2)`. -/
def schwarzschildExponent : Fin 3 → ℚ
  | 0 => 1
  | 1 => 1
  | 2 => -2

/-- The dimension equation has exactly one rational solution, `(1, 1, -2)`. This covers the
exponent tuple of `CE-schwarzschild-radius`: the form, not the prefactor. -/
theorem schwarzschild_exponent_unique (e : Fin 3 → ℚ) :
    Solves schwarzschildInputs lengthDim3 e ↔ e = schwarzschildExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [schwarzschildInputs, massDim3, gDim3, cDim3, lengthDim3, Fin.sum_univ_three] at h0 h1 h2
    have e0 : e 0 = 1 := by linarith
    have e1 : e 1 = 1 := by linarith
    have e2 : e 2 = -2 := by linarith
    funext j
    fin_cases j
    · simpa [schwarzschildExponent] using e0
    · simpa [schwarzschildExponent] using e1
    · simpa [schwarzschildExponent] using e2
  · rintro rfl i
    fin_cases i <;>
      norm_num [schwarzschildInputs, massDim3, gDim3, cDim3, lengthDim3, schwarzschildExponent,
        Fin.sum_univ_three]

/-- Inputs `(tension, linear-density)`. -/
def stringWaveInputs : Fin 2 → Dimensional.Dim 3
  | 0 => tensionDim3
  | 1 => linearDensityDim3

/-- The tuple `(1/2, -1/2)`. -/
def stringWaveExponent : Fin 2 → ℚ
  | 0 => 1 / 2
  | 1 => -1 / 2

/-- The dimension equation has exactly one rational solution, `(1/2, -1/2)`. This covers the
exponent tuple of `CE-string-wave-speed`: the form, not the prefactor. -/
theorem string_wave_exponent_unique (e : Fin 2 → ℚ) :
    Solves stringWaveInputs speedDim3 e ↔ e = stringWaveExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [stringWaveInputs, tensionDim3, linearDensityDim3, speedDim3, Fin.sum_univ_two] at h0 h1 h2
    have e0 : e 0 = 1 / 2 := by linarith
    have e1 : e 1 = -1 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [stringWaveExponent] using e0
    · simpa [stringWaveExponent] using e1
  · rintro rfl i
    fin_cases i <;>
      norm_num [stringWaveInputs, tensionDim3, linearDensityDim3, speedDim3, stringWaveExponent,
        Fin.sum_univ_two]

/-- Inputs `(hbar, G, c)`. -/
def plLengthInputs : Fin 3 → Dimensional.Dim 3
  | 0 => hbarDim3
  | 1 => gDim3
  | 2 => cDim3

/-- The tuple `(1/2, 1/2, -3/2)`. -/
def plLengthExponent : Fin 3 → ℚ
  | 0 => 1 / 2
  | 1 => 1 / 2
  | 2 => -3 / 2

/-- The dimension equation has exactly one rational solution, `(1/2, 1/2, -3/2)`. This covers the
exponent tuple of `CE-planck-length`: the form, not the prefactor. -/
theorem planck_length_exponent_unique (e : Fin 3 → ℚ) :
    Solves plLengthInputs lengthDim3 e ↔ e = plLengthExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [plLengthInputs, hbarDim3, gDim3, cDim3, lengthDim3, Fin.sum_univ_three] at h0 h1 h2
    have e0 : e 0 = 1 / 2 := by linarith
    have e1 : e 1 = 1 / 2 := by linarith
    have e2 : e 2 = -3 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [plLengthExponent] using e0
    · simpa [plLengthExponent] using e1
    · simpa [plLengthExponent] using e2
  · rintro rfl i
    fin_cases i <;>
      norm_num [plLengthInputs, hbarDim3, gDim3, cDim3, lengthDim3, plLengthExponent,
        Fin.sum_univ_three]

/-- Inputs `(hbar, c, G)`. -/
def plMassInputs : Fin 3 → Dimensional.Dim 3
  | 0 => hbarDim3
  | 1 => cDim3
  | 2 => gDim3

/-- The tuple `(1/2, 1/2, -1/2)`. -/
def plMassExponent : Fin 3 → ℚ
  | 0 => 1 / 2
  | 1 => 1 / 2
  | 2 => -1 / 2

/-- The dimension equation has exactly one rational solution, `(1/2, 1/2, -1/2)`. This covers the
exponent tuple of `CE-planck-mass`: the form, not the prefactor. -/
theorem planck_mass_exponent_unique (e : Fin 3 → ℚ) :
    Solves plMassInputs massDim3 e ↔ e = plMassExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [plMassInputs, hbarDim3, cDim3, gDim3, massDim3, Fin.sum_univ_three] at h0 h1 h2
    have e0 : e 0 = 1 / 2 := by linarith
    have e1 : e 1 = 1 / 2 := by linarith
    have e2 : e 2 = -1 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [plMassExponent] using e0
    · simpa [plMassExponent] using e1
    · simpa [plMassExponent] using e2
  · rintro rfl i
    fin_cases i <;>
      norm_num [plMassInputs, hbarDim3, cDim3, gDim3, massDim3, plMassExponent, Fin.sum_univ_three]

/-- Inputs `(hbar, G, c)`. -/
def plTimeInputs : Fin 3 → Dimensional.Dim 3
  | 0 => hbarDim3
  | 1 => gDim3
  | 2 => cDim3

/-- The tuple `(1/2, 1/2, -5/2)`. -/
def plTimeExponent : Fin 3 → ℚ
  | 0 => 1 / 2
  | 1 => 1 / 2
  | 2 => -5 / 2

/-- The dimension equation has exactly one rational solution, `(1/2, 1/2, -5/2)`. This covers the
exponent tuple of `CE-planck-time`: the form, not the prefactor. -/
theorem planck_time_exponent_unique (e : Fin 3 → ℚ) :
    Solves plTimeInputs timeDim3 e ↔ e = plTimeExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [plTimeInputs, hbarDim3, gDim3, cDim3, timeDim3, Fin.sum_univ_three] at h0 h1 h2
    have e0 : e 0 = 1 / 2 := by linarith
    have e1 : e 1 = 1 / 2 := by linarith
    have e2 : e 2 = -5 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [plTimeExponent] using e0
    · simpa [plTimeExponent] using e1
    · simpa [plTimeExponent] using e2
  · rintro rfl i
    fin_cases i <;>
      norm_num [plTimeInputs, hbarDim3, gDim3, cDim3, timeDim3, plTimeExponent, Fin.sum_univ_three]

/-- Inputs `(hbar, mass, c)`. -/
def comptonInputs : Fin 3 → Dimensional.Dim 3
  | 0 => hbarDim3
  | 1 => massDim3
  | 2 => cDim3

/-- The tuple `(1, -1, -1)`. -/
def comptonExponent : Fin 3 → ℚ
  | 0 => 1
  | 1 => -1
  | 2 => -1

/-- The dimension equation has exactly one rational solution, `(1, -1, -1)`. This covers the
exponent tuple of `CE-compton-wavelength`: the form, not the prefactor. -/
theorem compton_exponent_unique (e : Fin 3 → ℚ) :
    Solves comptonInputs lengthDim3 e ↔ e = comptonExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    simp [comptonInputs, hbarDim3, massDim3, cDim3, lengthDim3, Fin.sum_univ_three] at h0 h1 h2
    have e0 : e 0 = 1 := by linarith
    have e1 : e 1 = -1 := by linarith
    have e2 : e 2 = -1 := by linarith
    funext j
    fin_cases j
    · simpa [comptonExponent] using e0
    · simpa [comptonExponent] using e1
    · simpa [comptonExponent] using e2
  · rintro rfl i
    fin_cases i <;>
      norm_num [comptonInputs, hbarDim3, massDim3, cDim3, lengthDim3, comptonExponent,
        Fin.sum_univ_three]

/-- Inputs `(hbar, mass, k_B, temperature)`. -/
def thermalDeBroglieInputs : Fin 4 → Dimensional.Dim 4
  | 0 => hbarDim
  | 1 => massDim
  | 2 => kBDim
  | 3 => temperatureDim

/-- The tuple `(1, -1/2, -1/2, -1/2)`. -/
def thermalDeBroglieExponent : Fin 4 → ℚ
  | 0 => 1
  | 1 => -1 / 2
  | 2 => -1 / 2
  | 3 => -1 / 2

/-- The dimension equation has exactly one rational solution, `(1, -1/2, -1/2, -1/2)`. This covers
the exponent tuple of `CE-thermal-de-broglie`: the form, not the prefactor. -/
theorem thermal_de_broglie_exponent_unique (e : Fin 4 → ℚ) :
    Solves thermalDeBroglieInputs lengthDim4 e ↔ e = thermalDeBroglieExponent := by
  constructor
  · intro h
    have h0 := h 0
    have h1 := h 1
    have h2 := h 2
    have h3 := h 3
    simp [thermalDeBroglieInputs, hbarDim, massDim, kBDim, temperatureDim, lengthDim4,
      Fin.sum_univ_four] at h0 h1 h2 h3
    have e0 : e 0 = 1 := by linarith
    have e1 : e 1 = -1 / 2 := by linarith
    have e2 : e 2 = -1 / 2 := by linarith
    have e3 : e 3 = -1 / 2 := by linarith
    funext j
    fin_cases j
    · simpa [thermalDeBroglieExponent] using e0
    · simpa [thermalDeBroglieExponent] using e1
    · simpa [thermalDeBroglieExponent] using e2
    · simpa [thermalDeBroglieExponent] using e3
  · rintro rfl i
    fin_cases i <;>
      norm_num [thermalDeBroglieInputs, hbarDim, massDim, kBDim, temperatureDim, lengthDim4,
        thermalDeBroglieExponent, Fin.sum_univ_four]

end PhysJS.BuckinghamClassics
