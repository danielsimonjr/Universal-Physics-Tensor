# Plasma and space physicist dogfood, session 42, 2026-11-24

Persona: Plasma and space physicist (rotation position 3 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Thermal and chemical engineer.

## What was run

- `upt evaluate be-115 lambda_1_m=3 lambda_2_m=4` returned 2.4 m, matching inverse-square screening addition.
- `upt evaluate be-103 T_e_K=1e5 m_i_kg=1.67262192595e-27` returned 28730.47119 m/s, matching the cold-ion Bohm threshold.
- `upt evaluate be-119 Omega_rad_s=2.7e-6 r_m=1AU theta_rad=pi/2 v_r_m_per_s=400km/s` returned −1.009785627225, matching −Ωr/v_r at the equator.
- `be-120` reported the radius ratio plus its sixth power as separate quantities.

## Candidate bridges (unproven)

### Standard

Screening length for a third independently responding species under linearized electrostatic response.

### Cross-domain

Convert a magnetized plasma density perturbation to a radio phase delay in the cold, weakly dispersive limit.

## Bugs found and negative results

No reproducible defect in these probes.
