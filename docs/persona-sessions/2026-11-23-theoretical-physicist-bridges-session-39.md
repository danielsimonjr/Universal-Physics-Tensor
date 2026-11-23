# Theoretical physicist dogfood, session 39, 2026-11-23

Persona: Theoretical physicist (outside the rotation)
Area: asymptotic spectra, quantum bounds, and signed paraxial optics
Package under test: universal-physics-tensor@18.0.0 (installed from npm), Node v24.22.3
Next persona: Condensed-matter physicist (rotation position 2 of 7)

This model-led session followed the theoretical physicist reports in sessions 33–38. It used the installed CLI and library in two independent empty directories. Both installs reported 18.0.0. Each filed finding reproduced on both installs. The Planck reference used 60-digit decimal arithmetic and the exact SI values of h, k_B and c.

## What was run

| Probe | Installed package | Independent check |
|---|---|---|
| `upt evaluate be-164 nu_Hz=1e-6Hz T_K=300K` | Exit 1, Infinity. Canonical explain gives 3.86351220288422e−57. | 3.863512202884218e−57 J·s/m³. |
| `upt evaluate be-164 nu_Hz=1.5627464342495683e21Hz T_K=1e8K` | Zero. Canonical explain gives 4.4856e−320. | The Wien tail is representable, about 4.485779303005121e−320 J·s/m³. |
| `upt evaluate be-164 nu_Hz=1e12Hz T_K=300K` | 3.5627160143866626e−21 J·s/m³. Input description says T ≥ 0, while the same command at 0 K refuses it. | Ordinary-frequency value agrees. The displayed and enforced temperature ranges differ. |
| `upt explain position-momentum-uncertainty-product --source=canonical` and its JSON form | Summary says the product is determined. Its derivation marks the value as a lower bound. | ħ/2 is a lower bound on ΔxΔp. |
| `upt explain orthogonalization-time-lower-bound --source=canonical mean-energy-above-ground=1J` | 1.6565175375e−34 s. Zero and negative energy inputs are refused. | πħ/(2E) gives the same positive-energy bound. |
| `upt explain bekenstein-entropy-upper-bound --source=canonical system-energy=1J enclosing-radius=1m` | 2743.88741031526 J/K in base SI units. Negative energy is refused. | 2πk_BRE/(ħc) gives the same upper bound. |
| `upt explain image-distance --source=canonical object-distance=5cm paraxial-focal-length=10cm` | Exit 0 with no derivation path. The focal-length route works for known object and image distances. | The image is virtual at −10 cm. |
| `upt explain tov-pressure-gradient --source=canonical enclosed-mass=1Msun areal-radius=10km fluid-pressure=1e33Pa mass-energy-density=1e17kg/m^3` | −2.2409254572735e29 Pa/m in base SI units. At 2 km the compactness guard refuses the inputs. | The sign is negative outside the Schwarzschild radius, about 2.95 km for the supplied mass. |
| `upt explain unruh-temperature --source=canonical proper-acceleration=1e20m/s^2` | 0.405501352522981 K. Negative acceleration magnitude is refused. | ħa/(2πck_B) agrees. |
| `upt explain first-diffraction-minimum-sine --source=canonical slit-width=2um optical-wavelength=600nm` | 0.3. A 400 nm slit is refused at the same wavelength. | sin θ = λ/a agrees and has no real first minimum when λ > a. |
| Installed library `parseUnit` | `J*s/m^3` and `kg/(m*s)` return the same dimensions. | Both are M L⁻¹ T⁻¹. |

## Candidate bridges (unproven)

### Standard

**Gaussian imaging with known focal length.** Recover the signed image distance as dᵢ = f dₒ/(dₒ − f) from the paraxial thin-lens or spherical-mirror relation. The derivation needs the real-is-positive convention and nonzero distances. The focal-plane singularity represents collimated output in this approximation. Dimensional analysis alone cannot supply the difference in the denominator.

### Cross-domain

**Uniform proper acceleration to a detector transition-rate ratio.** For a stationary two-level detector with positive angular-frequency gap Ω and uniform proper acceleration a in the Minkowski vacuum, use thermal detailed balance at the Unruh temperature to propose Γ↑/Γ↓ = exp(−2πcΩ/a). The thermal stationary-response hypothesis and the 2π factor need a separate proof. No PhysJS proof status is asserted in this report.

## Bugs found (for the joint review)

| Issue | Finding |
|---|---|
| [#846](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/846) | Catalog Planck evaluation loses the low-frequency and representable high-frequency limits. |
| [#847](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/847) | Explain summaries describe bounds as exact determinations despite bound metadata in the derivation. |
| [#848](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/848) | The catalog Planck input report includes 0 K in the displayed range, while evaluation rejects it. |
| [#845](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/845) | The focal-length route works, and the forward image-distance route is missing. Filed as an enhancement. |

## Negative results

- At about x = hν/(k_BT) = 750 and T = 300 K, both Planck paths give zero. The physical value at that point is below binary64 range. The 10⁸ K control at the same x is the case that distinguishes premature truncation from representational underflow.
- `upt search blackbody radiance` found no entry. The registered observable is spectral energy density per unit volume, with different dimensions from spectral radiance.
- The TOV registry entry exposes its equation-of-state and stability qualification in `upt canonical --vars --json`. This session exercised the local pressure gradient.
