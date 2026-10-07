/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-187`. Bridge. Schottky–Mott barrier height.

The catalog equation is

```
φ_Bn = Φ_M − χ_s        φ_Bp = E_g − φ_Bn
```

`Φ_M` is the metal work function, `χ_s` the semiconductor electron affinity,
`E_g` the gap. `schottky_mott_eq` derives the n-type rule from an energy
ledger on a common vacuum level: the metal Fermi level lies at
`E_vac − Φ_M`, the semiconductor conduction-band edge at the interface lies at
`E_vac + δ − χ_s`, and the barrier is the conduction edge minus the metal
Fermi level. `δ` is the vacuum-level step across an interface dipole; the
ideal Schottky–Mott rule is `δ = 0` (no interface states, no image-force
lowering), which is the premise `hideal`.

`dipole_shifts_barrier` is the negative control: the barrier is
`Φ_M − χ_s + δ`, so Fermi-level pinning (an interface dipole that depends on
`Φ_M`) is exactly a nonzero `δ`. `p_type_eq` is the complementary barrier
from `E_v = E_c − E_g`. Not a model of interface states or of the pinning
slope.
-/

namespace PhysJS.SchottkyMott

/-- Ideal n-type barrier on a common vacuum level.

`hFM` is the metal Fermi level `E_FM = E_vac − Φ_M`. `hEc` is the
semiconductor conduction edge at the interface `E_c = E_vac + δ − χ_s`.
`hφ` is the barrier `φ_Bn = E_c − E_FM`. `hideal` is `δ = 0`.

Kind `bridge` on `PhysJS.SchottkyMott.schottky_mott_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not a
derivation of the absence of interface states. -/
theorem schottky_mott_eq (φBn ΦM χs Evac EFM Ec δ : ℝ)
    (hFM : EFM = Evac - ΦM)
    (hEc : Ec = Evac + δ - χs)
    (hφ : φBn = Ec - EFM)
    (hideal : δ = 0) :
    φBn = ΦM - χs := by
  rw [hφ, hEc, hFM, hideal]; ring

/-- With an interface dipole the barrier is shifted by `δ`. -/
theorem dipole_shifts_barrier (φBn ΦM χs Evac EFM Ec δ : ℝ)
    (hFM : EFM = Evac - ΦM)
    (hEc : Ec = Evac + δ - χs)
    (hφ : φBn = Ec - EFM) :
    φBn = ΦM - χs + δ := by
  rw [hφ, hEc, hFM]; ring

/-- A nonzero dipole breaks the ideal rule. -/
theorem pinned_not_ideal (φBn ΦM χs Evac EFM Ec δ : ℝ)
    (hFM : EFM = Evac - ΦM)
    (hEc : Ec = Evac + δ - χs)
    (hφ : φBn = Ec - EFM) (hδ : δ ≠ 0) :
    φBn ≠ ΦM - χs := by
  intro h
  apply hδ
  have := dipole_shifts_barrier φBn ΦM χs Evac EFM Ec δ hFM hEc hφ
  linarith

/-- The p-type barrier: valence edge `E_v = E_c − E_g`, barrier `E_FM − E_v`. -/
theorem p_type_eq (φBp φBn Eg Ec Ev EFM : ℝ)
    (hEv : Ev = Ec - Eg) (hn : φBn = Ec - EFM) (hp : φBp = EFM - Ev) :
    φBp + φBn = Eg := by
  rw [hp, hn, hEv]; ring

end PhysJS.SchottkyMott
