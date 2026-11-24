# Condensed-matter physicist dogfood, session 41, 2026-11-24

Persona: Condensed-matter physicist (rotation position 2 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Plasma and space physicist.

## What was run

- `upt evaluate be-91 N=1 T_K=300 thetaE_K=300` returned 3.813381231508183e−23 J/K, matching 3k_B e/(e−1)².
- `be-91` returned Infinity at θ_E/T ≈ 3.33e−18, zero at 700 and NaN at 1000. Decimal references give about 4.141947e−23 J/K, 2.0011e−321 J/K and a value that rounds to zero, respectively.
- `upt evaluate be-142 lambda_m=11nm xi_m=10nm` displayed its leading-logarithmic validity warning near κ=1.1.

## Candidate bridges (unproven)

### Standard

Classical high-temperature heat-capacity limit of independent lattice oscillators.

### Cross-domain

Electrical readout of a temperature fluctuation through the calibrated temperature derivative of a superconducting kinetic inductance.

## Bugs found and negative results

[#853](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/853) records the Einstein-solid numerical limits.
