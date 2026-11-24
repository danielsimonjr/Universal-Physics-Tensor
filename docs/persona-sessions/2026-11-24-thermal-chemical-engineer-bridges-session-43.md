# Thermal and chemical engineer dogfood, session 43, 2026-11-24

Persona: Thermal and chemical engineer (rotation position 4 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Relativity and astrophysics.

## What was run

- `upt evaluate be-153 x=0 Psat_Pa=101325` returned 0 Pa, and x=1.1 was refused.
- `upt evaluate be-160 k_W_per_m_K=1 T_L_K=300 T_0_K=400 L_m=0.1` returned +1000 W/m², matching the signed Fourier gradient.
- `upt evaluate be-159 km_m_per_s=1e-3 L_m=0.1 D_m2_per_s=1e-5` returned Sherwood number 10.

## Candidate bridges (unproven)

### Standard

Series resistance for a steady two-layer conducting slab.

### Cross-domain

Map reaction enthalpy and conversion rate to heat load in an isothermal reactor, with a stated sign convention.

## Bugs found and negative results

No reproducible defect in these probes.
