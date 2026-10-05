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
`be-131`. Bridge. Joukowsky pressure, and the thin-wall pipe speed.

The catalog equations are

```
Δp = ρ c Δv
c = √(K / ρ) / √(1 + (K / E) (D / e_wall))
```

`joukowsky_eq` derives them. A front moving at speed `c` integrates the
one-dimensional momentum equation to `-c Δv + Δp / ρ = 0`. Mass on the
same front is `-c Δρ + ρ Δv = 0`, so `c² = Δp / Δρ` when the density
jumps. The thin-wall closure adds fluid compressibility `dρ/ρ = dp/K`
to the hoop area change. Hoop stress `p D / (2 e_wall)` and
`dA/A = 2 dD/D` cancel the `2`, leaving `dA/A = dp D / (E e_wall)`.
The wave speed is `c² = dp / (ρ d(ρA)/(ρA))`. The rigid pipe drops the
wall term and is not this speed. `ρ (Δv)²` is not the Joukowsky pressure.
-/

namespace PhysJS.Joukowsky

/-- Momentum jump across a front of speed `c`: `Δp = ρ c Δv`. -/
theorem pressure_jump (ρ c Δv Δp : ℝ) (hρ : ρ ≠ 0)
    (hmom : -c * Δv + Δp / ρ = 0) :
    Δp = ρ * c * Δv := by
  have h := hmom
  field_simp [hρ] at h
  linarith

/-- Mass and momentum: `c² = Δp / Δρ` when the density jumps. -/
theorem acoustic_speed (ρ c Δv Δp Δρ : ℝ) (hρ : ρ ≠ 0) (hΔρ : Δρ ≠ 0)
    (hmom : -c * Δv + Δp / ρ = 0)
    (hmass : -c * Δρ + ρ * Δv = 0) :
    c ^ 2 = Δp / Δρ := by
  have hp := pressure_jump ρ c Δv Δp hρ hmom
  have hv : ρ * Δv = c * Δρ := by
    have h := hmass
    field_simp [hρ] at h
    linarith
  rw [hp, eq_div_iff hΔρ]
  calc
    c ^ 2 * Δρ = c * (c * Δρ) := by ring
    _ = c * (ρ * Δv) := by rw [← hv]
    _ = ρ * c * Δv := by ring

/-- Thin-wall speed. `hfluid` is `dρ/ρ = dp/K`. `hhoop` is the cancelled
hoop strain `dA/A = dp D / (E e_wall)`. `heff` is
`c² = dp / (ρ (dρ/ρ + dA/A))`, the combined line compressibility. -/
theorem thin_wall_speed (c K ρ E D wall dp dρ dA A : ℝ)
    (hc : 0 ≤ c) (hρ : 0 < ρ) (hK : 0 < K) (hE : 0 < E) (hwall : 0 < wall) (hdp : dp ≠ 0)
    (_hA : A ≠ 0)
    (hden : 0 < 1 + (K / E) * (D / wall))
    (hfluid : dρ / ρ = dp / K)
    (hhoop : dA / A = dp * D / (E * wall))
    (heff : c ^ 2 = dp / (ρ * (dρ / ρ + dA / A))) :
    c = Real.sqrt (K / ρ) / Real.sqrt (1 + (K / E) * (D / wall)) := by
  have hsum : dρ / ρ + dA / A = dp * (1 / K + D / (E * wall)) := by
    rw [hfluid, hhoop]
    field_simp [hρ.ne', hK.ne', hE.ne', hwall.ne']
  have hc2 : c ^ 2 = (K / ρ) / (1 + (K / E) * (D / wall)) := by
    rw [heff, hsum]
    field_simp [hρ.ne', hK.ne', hE.ne', hwall.ne', hdp]
  have hnn1 : 0 ≤ K / ρ := div_nonneg hK.le hρ.le
  have _hden_le : 0 ≤ 1 + (K / E) * (D / wall) := hden.le
  have hsqrt : Real.sqrt (c ^ 2) =
      Real.sqrt (K / ρ) / Real.sqrt (1 + (K / E) * (D / wall)) := by
    rw [hc2, Real.sqrt_div hnn1 (1 + (K / E) * (D / wall))]
  rw [Real.sqrt_sq hc] at hsqrt
  exact hsqrt

/-- Joukowsky pressure and the thin-wall speed.

`hmom` is the integrated momentum jump. `hfluid`, `hhoop`, and `heff`
are the thin-wall closure. Mass is `acoustic_speed` and is not required
for `Δp = ρ c Δv`.

Kind `bridge` on `PhysJS.Joukowsky.joukowsky_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not
`ρ (Δv)²`, and not the rigid-wall speed. -/
theorem joukowsky_eq
    (c K ρ E D wall dp dρ dA A Δv Δp : ℝ)
    (hc : 0 ≤ c) (hρ : 0 < ρ) (hK : 0 < K) (hE : 0 < E) (hwall : 0 < wall) (hdp : dp ≠ 0)
    (hA : A ≠ 0)
    (hden : 0 < 1 + (K / E) * (D / wall))
    (hmom : -c * Δv + Δp / ρ = 0)
    (hfluid : dρ / ρ = dp / K)
    (hhoop : dA / A = dp * D / (E * wall))
    (heff : c ^ 2 = dp / (ρ * (dρ / ρ + dA / A))) :
    Δp = ρ * c * Δv ∧
      c = Real.sqrt (K / ρ) / Real.sqrt (1 + (K / E) * (D / wall)) := by
  refine ⟨pressure_jump ρ c Δv Δp hρ.ne' hmom,
    thin_wall_speed c K ρ E D wall dp dρ dA A hc hρ hK hE hwall hdp hA hden hfluid hhoop heff⟩

/-- `ρ (Δv)²` is the other pressure units allow. It is not `ρ c Δv` when
`c ≠ Δv`. -/
theorem dynamic_not_joukowsky (ρ c Δv : ℝ) (hρ : ρ ≠ 0) (hΔ : Δv ≠ 0) (hc : c ≠ Δv) :
    ρ * c * Δv ≠ ρ * Δv ^ 2 := by
  intro hEq
  have hcomm : ρ * c * Δv = ρ * (c * Δv) := by ring
  rw [hcomm] at hEq
  have : c * Δv = Δv ^ 2 := mul_left_cancel₀ hρ hEq
  have : c * Δv - Δv * Δv = 0 := by
    have : c * Δv = Δv * Δv := by simpa [pow_two] using this
    linarith
  have : Δv * (c - Δv) = 0 := by
    have hfac : c * Δv - Δv * Δv = Δv * (c - Δv) := by ring
    linarith
  rcases mul_eq_zero.mp this with h | h
  · exact hΔ h
  · exact hc (by linarith)

/-- Dropping the wall term is the rigid-pipe speed, not the thin-wall speed,
when `(K/E)(D/e_wall) ≠ 0`. -/
theorem rigid_not_thin (K ρ E D wall : ℝ)
    (hρ : 0 < ρ) (hK : 0 < K)
    (hden : 0 < 1 + (K / E) * (D / wall))
    (hwall : (K / E) * (D / wall) ≠ 0) :
    Real.sqrt (K / ρ) ≠
      Real.sqrt (K / ρ) / Real.sqrt (1 + (K / E) * (D / wall)) := by
  intro hEq
  have hnum : Real.sqrt (K / ρ) ≠ 0 := (Real.sqrt_pos.mpr (div_pos hK hρ)).ne'
  have hden0 : Real.sqrt (1 + (K / E) * (D / wall)) ≠ 0 := (Real.sqrt_pos.mpr hden).ne'
  rw [eq_div_iff hden0] at hEq
  have hfac : Real.sqrt (K / ρ) * (Real.sqrt (1 + (K / E) * (D / wall)) - 1) = 0 := by
    have hsub : Real.sqrt (K / ρ) * Real.sqrt (1 + (K / E) * (D / wall)) -
        Real.sqrt (K / ρ) = 0 := by linarith
    have hrewrite : Real.sqrt (K / ρ) * Real.sqrt (1 + (K / E) * (D / wall)) -
        Real.sqrt (K / ρ) =
        Real.sqrt (K / ρ) * (Real.sqrt (1 + (K / E) * (D / wall)) - 1) := by ring
    linarith
  have hone : Real.sqrt (1 + (K / E) * (D / wall)) = 1 := by
    have : Real.sqrt (1 + (K / E) * (D / wall)) - 1 = 0 :=
      (mul_eq_zero.mp hfac).resolve_left hnum
    linarith
  have hsq := congrArg (fun y : ℝ => y ^ 2) hone
  rw [Real.sq_sqrt hden.le, one_pow] at hsq
  exact hwall (by linarith)

end PhysJS.Joukowsky
