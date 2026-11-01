/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Nusselt
import lean.SteadyProfile
import Mathlib.Order.Filter.AtTopBot.Ring
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-159`. Bridge. The Sherwood number, the wall gradient, and `Sh = 1` for diffusion.

The catalog product is `Sh D = k_m L`. The thermal Nusselt theorems transport along
`(T, h, k, T_w, T∞) ↦ (c, k_m, D, c_w, c∞)`. At the wall `x = 0`,

```
Sh = k_m L / D = L (−c'(0)) / (c_w − c∞)
```

A layer in pure steady diffusion (`c'' = 0`, `c(L) = c∞`) has `Sh = 1`. It is not a
correlation for `Sh`.
-/

namespace PhysJS.Sherwood

open Filter Topology
open PhysJS.SteadyProfile PhysJS.Nusselt

/-- `Sh = k_m L / D` is the wall gradient, and a diffusing layer has `Sh = 1`.

`hSh` defines `Sh` from the wall gradient; `hfilm` is `k_m (c_w − c∞) = −D c'(0)`. -/
theorem sherwood_eq (c : ℝ → ℝ) (Sh km D L cw cinf : ℝ)
    (hD : D ≠ 0) (hL : L ≠ 0) (hΔ : cw - cinf ≠ 0)
    (hwall : c 0 = cw)
    (hfilm : km * (cw - cinf) = -D * deriv c 0)
    (hSh : Sh = L * (-deriv c 0) / (cw - cinf)) :
    Sh = L * (-deriv c 0) / (cw - cinf) ∧ Sh = km * L / D ∧ Sh * D = km * L ∧
      (Differentiable ℝ c → Differentiable ℝ (deriv c) → (∀ x, deriv (deriv c) x = 0) →
        c L = cinf → Sh = 1) :=
  nusselt_eq c Sh km D L cw cinf hD hL hΔ hwall hfilm hSh

/-- Pure steady diffusion to `c(L) = c∞` has wall-gradient `Sh = 1`. -/
theorem sherwood_conduction_one (c : ℝ → ℝ) (Sh L cw cinf : ℝ)
    (hL : L ≠ 0) (hΔ : cw - cinf ≠ 0)
    (hwall : c 0 = cw)
    (hSh : Sh = L * (-deriv c 0) / (cw - cinf))
    (h1 : Differentiable ℝ c) (h2 : Differentiable ℝ (deriv c))
    (h0 : ∀ x, deriv (deriv c) x = 0)
    (hfar : c L = cinf) :
    Sh = 1 :=
  nusselt_conduction_one c Sh L cw cinf hL hΔ hwall hSh h1 h2 h0 hfar

/-- If the far face is not held at `c∞`, the same linear layer does not have `Sh = 1`. -/
theorem sherwood_far_not_one (c : ℝ → ℝ) (Sh L cw cinf cfar : ℝ)
    (hL : L ≠ 0) (hΔ : cw - cinf ≠ 0) (hfar' : cfar ≠ cinf)
    (hwall : c 0 = cw)
    (hSh : Sh = L * (-deriv c 0) / (cw - cinf))
    (h1 : Differentiable ℝ c) (h2 : Differentiable ℝ (deriv c))
    (h0 : ∀ x, deriv (deriv c) x = 0)
    (hfar : c L = cfar) :
    Sh ≠ 1 :=
  nusselt_far_not_one c Sh L cw cinf cfar hL hΔ hfar' hwall hSh h1 h2 h0 hfar

/-- Doubling `k_m` doubles `Sh = k_m L / D` at fixed `D` and `L`. -/
theorem sherwood_double_km (Sh Sh' km D L : ℝ) (hD : D ≠ 0)
    (hSh : Sh = km * L / D) (hSh' : Sh' = (2 * km) * L / D) :
    Sh' = 2 * Sh :=
  nusselt_double_h Sh Sh' km D L hD hSh hSh'

/-- At fixed `k_m` and `L`, `Sh = k_m L / D` tends to `0` as `D → ∞`. -/
theorem sherwood_D_tendsto_zero (km L : ℝ) :
    Tendsto (fun D : ℝ => km * L / D) atTop (𝓝 0) := by
  have hinv := tendsto_inv_atTop_zero (𝕜 := ℝ)
  have hid : Tendsto (fun D : ℝ => D) atTop atTop := tendsto_id
  have hD : Tendsto (fun D : ℝ => D⁻¹) atTop (𝓝 0) := hinv.comp hid
  simpa [div_eq_mul_inv] using Filter.Tendsto.const_mul (km * L) hD

/-- Linear profile `c(x) = c_w + (c∞ − c_w) (x / L)` has wall-gradient `Sh = 1`. -/
theorem sherwood_conduction_profile (cw cinf L : ℝ) (hL : L ≠ 0) (hΔ : cw - cinf ≠ 0) :
    L * (-((cinf - cw) / L)) / (cw - cinf) = 1 :=
  nusselt_conduction_profile cw cinf L hL hΔ

/-- Catalog inputs `k_m = 0.01`, `L = 0.2`, `D = 2e-5` give `Sh = 100`. -/
theorem sherwood_catalog :
    (1 / 100 : ℝ) * (2 / 10) / (2 / 100000) = 100 := by
  norm_num

end PhysJS.Sherwood
