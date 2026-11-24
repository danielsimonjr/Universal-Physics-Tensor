# Applied physicist dogfood, session 47, 2026-11-24

Persona: Applied physicist (outside the rotation)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Engineering physicist (next rotation).

## What was run

- `upt evaluate be-16 temperature_K=20degC` returned 2.8054248672027593e−21 J, matching k_B(293.15 K) ln 2.
- `upt evaluate be-58 T_K=300 R_ohm=1000 --sigma T_K=3 --sigma R_ohm=10` returned 1.6567788e−17 V²/Hz and a 2.34e−19 first-order uncertainty, matching independent quadrature.
- With σ_T=400 K the report warns that the interval crosses the physical domain and the linearization is unreliable.

## Candidate bridges (unproven)

### Standard

Equivalent noise bandwidth of a one-pole low-pass filter.

### Cross-domain

Map Johnson noise to an input-referred temperature uncertainty through a calibrated thermometer response.

## Bugs found and negative results

No reproducible defect in these probes.
