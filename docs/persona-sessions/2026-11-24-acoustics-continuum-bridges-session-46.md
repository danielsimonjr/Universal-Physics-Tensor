# Acoustics and continuum mechanics dogfood, session 46, 2026-11-24

Persona: Acoustics and continuum mechanics (rotation position 7 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Engineering physicist (next rotation).

## What was run

- Acoustic Doppler at f=440 Hz, c=343 m/s and source speeds ±20 m/s returned 467.244582043344 and 415.757575757576 s⁻¹, matching f c/(c−v).
- `upt path model-chain model-wave-1d` reported a nonzero dispersion bound, 0.04114892279159401.
- `upt path model-telegraph model-fick --at tau=1 D=1e-6 q=100 t=10` showed point δ ≈ 0.0102051443 and the tested window 5 < t < 979.89795 s.
- The thin-wall Joukowsky control returned 1191.366794 m/s and 1191366.794 Pa for Δv=1 m/s and density 1000 kg/m³.

## Candidate bridges (unproven)

### Standard

Normal-incidence reflection at two lossless acoustic impedances.

### Cross-domain

Derive an acoustic load from an electrical drive through a calibrated piezoelectric transducer model.

## Bugs found and negative results

No reproducible defect in these probes.
