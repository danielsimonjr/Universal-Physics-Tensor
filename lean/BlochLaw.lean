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
`be-134`. Bridge. Bloch `T^{3/2}` law.

`be-134.heisenberg_fraction`. Derivation step. `heisenberg_fraction`.

The catalog equation is

```
ΔM = μ_B ζ(3/2) (k_B T / (4 π D))^{3/2}
```

for quadratic magnons `ℏ ω = D k²`, with the zone-boundary cutoff sent to
infinity. `magnon_density` does not evaluate the Bose integral. The
hypothesis `I = ζ(3/2) √π / 4` is that integral,
`∫₀^∞ x² / (exp(x²) − 1) dx`, the same kind of hypothesis `be-90` takes for
`π⁴/15`. The factor `1/(2 π²) (k_B T / D)^{3/2}` is the quadratic
phase-space measure after `x = k √(D / k_B T)`. Their product is
`ζ(3/2) (k_B T / (4 π D))^{3/2}`.

`hmoment` assigns one Bohr magneton to each magnon. The report's `g = 2`
does not multiply this prefactor. Holstein–Primakoff with Landé factor `g`
removes `g μ_B` per magnon, and `lande_not_bohr` is that assignment at
`g = 2`. `heisenberg_fraction` substitutes `D = 2 J S a²` into
`ΔM / M(0)` with `M(0) = μ_B S / a³` and produces the extra `1/S`. `J > 0`,
`S > 0`, and `a > 0` keep the real power on a positive base. A lattice
potential and magnon interactions are not this row.
-/

namespace PhysJS.BlochLaw

open Real

/-- `(4 π)^{3/2} = 8 π^{3/2}`. -/
theorem four_pi_three_halves :
    (4 * Real.pi) ^ ((3 : ℝ) / 2) = 8 * Real.pi ^ ((3 : ℝ) / 2) := by
  have h4 : (0 : ℝ) ≤ 4 := by norm_num
  have hsplit : (4 * Real.pi) ^ ((3 : ℝ) / 2) =
      (4 : ℝ) ^ ((3 : ℝ) / 2) * Real.pi ^ ((3 : ℝ) / 2) :=
    Real.mul_rpow h4 Real.pi_nonneg
  have hpow : (4 : ℝ) ^ ((3 : ℝ) / 2) = 8 := by
    have hcoef : (3 : ℝ) / 2 = (1 / 2) * 3 := by norm_num
    rw [hcoef, Real.rpow_mul h4]
    have hsqrt : (4 : ℝ) ^ ((1 : ℝ) / 2) = 2 := by
      rw [← Real.sqrt_eq_rpow]
      rw [show (4 : ℝ) = 2 ^ 2 by norm_num]
      exact Real.sqrt_sq (by norm_num)
    rw [hsqrt]
    norm_num
  rw [hsplit, hpow]

/-- `√π / 4` times `1/(2 π²)` is `(4 π)^{-3/2}`. -/
theorem bose_prefactor :
    (1 / (2 * Real.pi ^ 2)) * (Real.sqrt Real.pi / 4) =
      1 / (4 * Real.pi) ^ ((3 : ℝ) / 2) := by
  have hπ : 0 < Real.pi := Real.pi_pos
  have hs : Real.sqrt Real.pi ≠ 0 := (Real.sqrt_pos.mpr hπ).ne'
  have hsq : Real.sqrt Real.pi * Real.sqrt Real.pi = Real.pi := by
    rw [← pow_two, Real.sq_sqrt hπ.le]
  have hpow : Real.pi ^ ((3 : ℝ) / 2) = Real.pi * Real.sqrt Real.pi := by
    rw [show (3 : ℝ) / 2 = 1 + (1 : ℝ) / 2 by norm_num, Real.rpow_add hπ, Real.rpow_one,
      ← Real.sqrt_eq_rpow]
  rw [four_pi_three_halves, hpow]
  field_simp [hπ.ne', hs]
  rw [pow_two, hsq]
  ring

/-- Magnon density. `hI` is the unevaluated Bose integral
`∫₀^∞ x²/(exp(x²)−1) dx = ζ(3/2) √π / 4`. `hn` is the quadratic measure
`1/(2 π²) (k_B T / D)^{3/2}` times that integral. -/
theorem magnon_density (nMag kT D zeta I : ℝ) (hD : 0 < D) (hkT : 0 ≤ kT)
    (hI : I = zeta * Real.sqrt Real.pi / 4)
    (hn : nMag = (1 / (2 * Real.pi ^ 2)) * (kT / D) ^ ((3 : ℝ) / 2) * I) :
    nMag = zeta * (kT / (4 * Real.pi * D)) ^ ((3 : ℝ) / 2) := by
  have hπ : 0 < Real.pi := Real.pi_pos
  have hsplit : kT / (4 * Real.pi * D) = (kT / D) * (1 / (4 * Real.pi)) := by
    field_simp [hD.ne', hπ.ne']
  have hbase : 0 ≤ kT / D := div_nonneg hkT hD.le
  have hunit : 0 ≤ 1 / (4 * Real.pi) :=
    div_nonneg (by norm_num) (mul_nonneg (by norm_num) Real.pi_nonneg)
  have hpow : (kT / (4 * Real.pi * D)) ^ ((3 : ℝ) / 2) =
      (kT / D) ^ ((3 : ℝ) / 2) * (1 / (4 * Real.pi)) ^ ((3 : ℝ) / 2) := by
    rw [hsplit, Real.mul_rpow hbase hunit]
  have hfour : (0 : ℝ) ≤ 4 * Real.pi := mul_nonneg (by norm_num) hπ.le
  have hinv : (1 / (4 * Real.pi)) ^ ((3 : ℝ) / 2) =
      1 / (4 * Real.pi) ^ ((3 : ℝ) / 2) := by
    rw [Real.div_rpow (by norm_num : (0 : ℝ) ≤ 1) hfour ((3 : ℝ) / 2), Real.one_rpow]
  rw [hn, hI]
  calc
    (1 / (2 * Real.pi ^ 2)) * (kT / D) ^ ((3 : ℝ) / 2) * (zeta * Real.sqrt Real.pi / 4)
        = zeta * ((kT / D) ^ ((3 : ℝ) / 2) *
            ((1 / (2 * Real.pi ^ 2)) * (Real.sqrt Real.pi / 4))) := by ring
    _ = zeta * ((kT / D) ^ ((3 : ℝ) / 2) * (1 / (4 * Real.pi) ^ ((3 : ℝ) / 2))) := by
      rw [bose_prefactor]
    _ = zeta * ((kT / D) ^ ((3 : ℝ) / 2) * (1 / (4 * Real.pi)) ^ ((3 : ℝ) / 2)) := by
      rw [← hinv]
    _ = zeta * (kT / (4 * Real.pi * D)) ^ ((3 : ℝ) / 2) := by
      rw [hpow]

/-- Bloch deficit per volume.

`hI` is `ζ(3/2) √π / 4`, not an evaluation of the Bose integral. `hn` is
the phase-space measure times that integral. `hmoment` is one Bohr magneton
per magnon. `D > 0` and `k_B T ≥ 0` keep the real power on a nonnegative
base.

Not an evaluation of
`ζ(3/2)`. Not the Landé assignment `g μ_B` at `g = 2`. -/
theorem bloch_law (dM nMag muB kT D zeta I : ℝ) (hD : 0 < D) (hkT : 0 ≤ kT)
    (hI : I = zeta * Real.sqrt Real.pi / 4)
    (hn : nMag = (1 / (2 * Real.pi ^ 2)) * (kT / D) ^ ((3 : ℝ) / 2) * I)
    (hmoment : dM = muB * nMag) :
    dM = muB * zeta * (kT / (4 * Real.pi * D)) ^ ((3 : ℝ) / 2) := by
  rw [hmoment, magnon_density nMag kT D zeta I hD hkT hI hn]
  ring

/-- `g μ_B` at `g = 2` is not one Bohr magneton per magnon. -/
theorem lande_not_bohr (muB n g : ℝ) (hμ : muB ≠ 0) (hn : n ≠ 0) (hg : g = 2) :
    g * muB * n ≠ muB * n := by
  intro hEq
  rw [hg] at hEq
  have hzero : muB * n = 0 := by linarith
  exact mul_ne_zero hμ hn hzero

/-- Nearest-neighbor Heisenberg form. `D = 2 J S a²` and
`M(0) = μ_B S / a³` put an extra `1/S` on the same integral. -/
theorem heisenberg_fraction
    (dM M0 muB zeta kT D J S a : ℝ)
    (hJ : 0 < J) (hS : 0 < S) (ha : 0 < a) (hkT : 0 ≤ kT) (hμ : muB ≠ 0)
    (hbloch : dM = muB * zeta * (kT / (4 * Real.pi * D)) ^ ((3 : ℝ) / 2))
    (hD : D = 2 * J * S * a ^ 2)
    (hM : M0 = muB * S / a ^ 3) :
    dM / M0 = (1 / S) * zeta * (kT / (8 * Real.pi * J * S)) ^ ((3 : ℝ) / 2) := by
  have hπ : 0 < Real.pi := Real.pi_pos
  have hDpos : 0 < D := by
    rw [hD]
    positivity
  have hcube : (a ^ 2) ^ ((3 : ℝ) / 2) = a ^ 3 := by
    have hcoef : (2 : ℝ) * ((3 : ℝ) / 2) = 3 := by norm_num
    have hnat : a ^ 2 = a ^ (2 : ℝ) := (Real.rpow_natCast a 2).symm
    calc
      (a ^ 2) ^ ((3 : ℝ) / 2) = (a ^ (2 : ℝ)) ^ ((3 : ℝ) / 2) := by rw [hnat]
      _ = a ^ ((2 : ℝ) * ((3 : ℝ) / 2)) := (Real.rpow_mul ha.le (2 : ℝ) ((3 : ℝ) / 2)).symm
      _ = a ^ (3 : ℝ) := by rw [hcoef]
      _ = a ^ 3 := Real.rpow_natCast a 3
  have hscale : (kT / (4 * Real.pi * D)) ^ ((3 : ℝ) / 2) =
      (kT / (8 * Real.pi * J * S)) ^ ((3 : ℝ) / 2) / a ^ 3 := by
    have hsub : kT / (4 * Real.pi * D) = kT / (8 * Real.pi * J * S * a ^ 2) := by
      rw [hD]
      field_simp [hπ.ne', hJ.ne', hS.ne', ha.ne']
      ring
    have hsplit : kT / (8 * Real.pi * J * S * a ^ 2) =
        (kT / (8 * Real.pi * J * S)) / a ^ 2 := by
      field_simp [hπ.ne', hJ.ne', hS.ne', ha.ne']
    have hx : 0 ≤ kT / (8 * Real.pi * J * S) := by positivity
    have hy : 0 ≤ a ^ 2 := by positivity
    have hdiv : ((kT / (8 * Real.pi * J * S)) / a ^ 2) ^ ((3 : ℝ) / 2) =
        (kT / (8 * Real.pi * J * S)) ^ ((3 : ℝ) / 2) / (a ^ 2) ^ ((3 : ℝ) / 2) :=
      Real.div_rpow hx hy ((3 : ℝ) / 2)
    rw [hsub, hsplit, hdiv, hcube]
  have hM0 : M0 ≠ 0 := by
    rw [hM]
    positivity
  rw [hbloch, hM, hscale]
  field_simp [hμ, hS.ne', ha.ne', hM0]

end PhysJS.BlochLaw
