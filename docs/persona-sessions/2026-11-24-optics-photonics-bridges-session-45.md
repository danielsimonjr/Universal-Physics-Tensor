# Optics and photonics dogfood, session 45, 2026-11-24

Persona: Optics and photonics (rotation position 6 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Acoustics and continuum mechanics.

## What was run

- `upt explain image-distance --source=canonical object-distance=5cm paraxial-focal-length=10cm` returned −0.1 m, a virtual image. The equal-distance singularity was refused.
- `upt explain first-diffraction-minimum-sine --source=canonical slit-width=2um optical-wavelength=600nm` returned 0.3. A 400 nm slit was refused at the same wavelength.
- `upt evaluate be-66 I_W_per_m2=1361 R=1 theta_rad=0` returned 9.0796146712937e−6 Pa, matching 2I/c.

## Candidate bridges (unproven)

### Standard

Gaussian beam radius after propagation from the waist under paraxial optics.

### Cross-domain

Map absorption of a modulated optical beam to an acoustic pressure source under thermal confinement.

## Bugs found and negative results

No reproducible defect in these probes.
