/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-248`. Bridge. Brillouin frequency shift.

The catalog equation is

```
ν_B = 2 n v / λ₀        (backscatter)
```

with `n` the refractive index, `v` the acoustic velocity and `λ₀` the
vacuum wavelength of the light.

The premises are momentum conservation for scattering of a photon from a
thermal acoustic phonon, `q = k_i − k_s` (phase matching), light of
wavenumber `k = 2π n / λ₀` in the medium, an acoustic phonon of angular
frequency `Ω = v q`, and `Ω ≪ ω_light` so that `|k_s| = |k_i| = k`. For a
scattering angle `θ` between `k_i` and `k_s`, `|q|² = 2k²(1 − cos θ)`.

`phonon_wavenumber` proves `q = 2 k sin(θ/2)`. `brillouin_eq` gives
`ν_B = Ω/(2π) = 2 n v sin(θ/2) / λ₀`, which is the catalog value at
backscatter `θ = π`. `silica_value` evaluates the report's silica example
at `n = 1.45`, `v = 5960 m/s`, `λ₀ = 1.55 µm`: `11.15 GHz`.

It assumes an isotropic transparent medium and a Stokes-anti-Stokes
symmetric shift; it does not derive the acoustic dispersion `Ω = v q` or the
scattering cross-section.
-/

namespace PhysJS.BrillouinShift

open Real

/-- Phase matching with equal photon wavenumbers gives `q = 2 k sin(θ/2)`.

`hq2` is `|q|² = |k_i|² + |k_s|² − 2 k_i·k_s` with `|k_i| = |k_s| = k` and
`k_i·k_s = k² cos θ`. -/
theorem phonon_wavenumber (q k θ : ℝ) (hk : 0 < k) (hq : 0 ≤ q) (hθ : 0 ≤ θ) (hθ' : θ ≤ π)
    (hq2 : q ^ 2 = k ^ 2 + k ^ 2 - 2 * (k ^ 2 * Real.cos θ)) :
    q = 2 * k * Real.sin (θ / 2) := by
  have hcos : Real.cos θ = 1 - 2 * Real.sin (θ / 2) ^ 2 := by
    have := Real.cos_two_mul (θ / 2)
    have h2 := Real.sin_sq_add_cos_sq (θ / 2)
    rw [show 2 * (θ / 2) = θ by ring] at this
    linarith
  have hsin : 0 ≤ Real.sin (θ / 2) :=
    Real.sin_nonneg_of_nonneg_of_le_pi (by linarith) (by linarith)
  have h : q ^ 2 = (2 * k * Real.sin (θ / 2)) ^ 2 := by
    rw [hq2, hcos]; ring
  exact (pow_left_inj₀ hq (by positivity) two_ne_zero).mp h

/-- Brillouin shift for scattering angle `θ`; backscatter `θ = π` is the
catalog `2 n v / λ₀`.

`hk` is `k = 2π n / λ₀`, `hΩ` is `Ω = v q`, `hν` is `ν = Ω / (2π)`.

Kind `bridge` on `PhysJS.BrillouinShift.brillouin_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a derivation
of the acoustic dispersion or of the scattering strength. -/
theorem brillouin_eq (ν Ω q k θ n v lam₀ : ℝ)
    (hn : 0 < n) (hv : 0 < v) (hlam : 0 < lam₀) (hθ : 0 ≤ θ) (hθ' : θ ≤ π)
    (hk : k = 2 * π * n / lam₀) (hΩ : Ω = v * q) (hν : ν = Ω / (2 * π))
    (hq : 0 ≤ q) (hq2 : q ^ 2 = k ^ 2 + k ^ 2 - 2 * (k ^ 2 * Real.cos θ)) :
    ν = 2 * n * v * Real.sin (θ / 2) / lam₀ := by
  have hk0 : 0 < k := by rw [hk]; positivity
  have hqv := phonon_wavenumber q k θ hk0 hq hθ hθ' hq2
  rw [hν, hΩ, hqv, hk]
  field_simp

/-- Backscatter: `ν_B = 2 n v / λ₀`. -/
theorem backscatter_eq (ν Ω q k n v lam₀ : ℝ)
    (hn : 0 < n) (hv : 0 < v) (hlam : 0 < lam₀)
    (hk : k = 2 * π * n / lam₀) (hΩ : Ω = v * q) (hν : ν = Ω / (2 * π))
    (hq : 0 ≤ q) (hq2 : q ^ 2 = k ^ 2 + k ^ 2 - 2 * (k ^ 2 * Real.cos π)) :
    ν = 2 * n * v / lam₀ := by
  have := brillouin_eq ν Ω q k π n v lam₀ hn hv hlam Real.pi_pos.le le_rfl hk hΩ hν hq hq2
  rw [this, Real.sin_pi_div_two]; ring

/-- Silica at 1.55 µm: `11.15 GHz` to four digits. -/
theorem silica_value :
    (11.15e9 : ℝ) < 2 * 1.45 * 5960 / 1.55e-6 ∧
      2 * 1.45 * 5960 / (1.55e-6 : ℝ) < (11.16e9 : ℝ) := by
  constructor
  · rw [lt_div_iff₀ (by norm_num)]; norm_num
  · rw [div_lt_iff₀ (by norm_num)]; norm_num

/-- Units alone do not entail the exponent of `n`: `n` is dimensionless, and
the exponent-two form disagrees at `n = 1.45`. -/
theorem index_exponent_not_fixed :
    2 * (1.45 : ℝ) * 5960 / 1.55e-6 ≠ 2 * 1.45 ^ 2 * 5960 / 1.55e-6 := by
  norm_num

end PhysJS.BrillouinShift
