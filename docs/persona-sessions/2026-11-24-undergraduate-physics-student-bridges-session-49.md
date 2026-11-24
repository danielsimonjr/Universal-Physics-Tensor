# Undergraduate physics student dogfood, session 49, 2026-11-24

Persona: Undergraduate physics student (outside the rotation)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Engineering physicist (next rotation).

## What was run

- `upt eval "2*pi*sqrt(L/g)" L=1m g=9.80665m/s^2` and `upt explain period length=1m gravity=9.80665m/s^2` matched 2.00640929258904 s.
- `upt map --equation-only --equation "F=m*a"` recognized the canonical Newton law and reported ratio 1.
- `upt eval "sqrt(-1)"` explained that the real-valued evaluator produced a complex number. `upt help units` listed the supported grammar.

## Candidate bridges (unproven)

### Standard

Inclined-plane acceleration with kinetic friction and a specified direction of sliding.

### Cross-domain

An RC step response as an electrical analogue of a lumped thermal relaxation.

## Bugs found and negative results

No new defect. The free-fall keyword still gives no result, as noted in session 20.
