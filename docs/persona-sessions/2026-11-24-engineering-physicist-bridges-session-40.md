# Engineering physicist dogfood, session 40, 2026-11-24

Persona: Engineering physicist (rotation position 1 of 7)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Condensed-matter physicist.

## What was run

- `upt evaluate be-129 h_W_per_m2_K=25 k_W_per_m_K=200 t_m=0.002 L_fin_m=0.05` returned η = 0.9073923048115554. With mL ≈ 0.5590, the hand value is tanh(mL)/(mL).
- `upt evaluate be-128 D=0` returned a gain of 1. D=1 was refused at the ideal boost singularity.
- `upt eval x x=1nV/sqrt(Hz)` accepted the noise-density unit.

## Candidate bridges (unproven)

### Standard

Corrected fin length L+A/P in the uniform-fin approximation.

### Cross-domain

Convert an input-voltage noise density to an equivalent force density using a calibrated sensor transfer coefficient.

## Bugs found and negative results

None. The fin model explicitly refuses zero convection, while a positive 1e−300 W/(m² K) approaches unit efficiency.
