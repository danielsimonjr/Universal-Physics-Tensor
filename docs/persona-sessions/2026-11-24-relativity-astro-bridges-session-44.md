# Relativity and astrophysics dogfood, session 44, 2026-11-24

Persona: Relativity and astrophysics (rotation position 5 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Optics and photonics.

## What was run

- `upt metric kerr a=0 r=1e8 theta=pi/2` and `upt metric schwarzschild r=1e8` agreed on the horizon scale and Kretschmann invariant ≈ 1.04722364439402e−40 m⁻⁴.
- Kerr’s spherical-coordinate pole was refused explicitly.
- `upt explain bh-entropy --source=canonical mass=1Msun` returned about 1.44901063373696e54 J/K and the area route. At −1 solar mass the same route returned success without a value or refusal. Explaining A directly rejected the mass.

## Candidate bridges (unproven)

### Standard

Schwarzschild proper radial distance between two static exterior radii from the radial metric factor.

### Cross-domain

Map gravitational redshift to the shift of a narrow atomic transition measured by static observers.

## Bugs found and negative results

[#852](https://github.com/danielsimonjr/Universal-Physics-Tensor/issues/852) records the lost upstream validity refusal.
