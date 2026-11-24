# Theoretical physicist dogfood, session 48, 2026-11-24

Persona: Theoretical physicist (outside the rotation)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Engineering physicist (next rotation).

## What was run

- Both original Planck controls from session 39 matched in the published package, including the representable Wien tail. At 0 K the relation correctly reported the strict domain.
- At 1e−100 Hz and 300 K the catalog and canonical Planck routes both returned zero. A decimal Rayleigh–Jeans reference gives 3.863512202884218e−245 J·s/m³.
- Heisenberg’s explanation exposed a lower bound in summary and JSON. The fine-structure constant was 0.00729735256433301, and the Unruh-temperature control agreed with ħa/(2πck_B).

## Candidate bridges (unproven)

### Standard

Rayleigh–Jeans limit of the Planck spectral energy density at fixed positive temperature.

### Cross-domain

Convert isotropic equilibrium spectral energy density to radiance with the angular factor c/(4π).

## Bugs found and negative results

[#851](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/851) records a separate Planck underflow after #846.
