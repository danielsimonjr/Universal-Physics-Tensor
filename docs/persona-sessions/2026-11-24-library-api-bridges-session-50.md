# Library API dogfood, session 50, 2026-11-24

Persona: Library API (outside the rotation)

Package under test: universal-physics-tensor@18.1.0 (installed from npm), Node v24.22.3. Model-led session. Filed findings reproduced on two clean installs.

Next persona: Engineering physicist (next rotation).

## What was run

- Public ESM imports succeeded for evaluateRelation, retrodictNode, UniversalTensor and the MathTSEngine subpath.
- `parseUnit("nV/sqrt(Hz)")` returned scale 1e−9. `evaluateRelation("be-58", {T_K:300, R_ohm:1000})` returned 1.6567788e−17.
- Unknown scale and force values in queryLaws threw RangeError with the allowed values. The be-164 API returned the same low-frequency result as the CLI for the 1e−6 Hz control.

## Candidate bridges (unproven)

### Standard

An executable typed check of the signed thin-lens forward relation alongside its focal-length form.

### Cross-domain

Propagate calibration sensitivities through an optical-to-electrical detector chain with common input units.

## Bugs found and negative results

No separate API defect in these probes. The API checks served as controls for the CLI sweep.
