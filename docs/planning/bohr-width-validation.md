# Bohr-width validation

## Question

For one specified proton-transfer system, does substituting the Bohr radius for an independently derived barrier width preserve the prediction of the rectangular WKB model? The comparison has three possible dispositions. Evidence may support equivalence within a stated tolerance, rule it out for the specified system, or leave it unresolved.

## Evidence contract

- Identify the molecular system, isotopologue, potential surface, reaction coordinate, energy zero, and state. An admissible source must describe the candidate width and barrier height on the same model and at the same energy.
- For a one-dimensional, constant-mass profile at energy $E$, bound the contiguous forbidden interval by its turning points. Let $\Delta=\max[V(q)-E]$ on that interval. Define the equivalent rectangular width $L_{\mathrm{eff}}=\int\sqrt{(V(q)-E)/\Delta}\,dq$ over the interval. This matches the WKB action at the stated energy. A distance between equilibrium positions, a donor–acceptor separation, and a barrier-curvature frequency have different meanings.
- Preserve covariances with paired joint parameter draws or named sensitivity points. Use the same barrier gap, effective mass and prefactor in both arms of a comparison. The substituted arm changes only $L$. Record missing data as missing. A deterministic sweep is sensitivity analysis and has no sampling confidence level.
- Run the existing catalog evaluator with its opacity guard. For each point record the exponent, acceptance or refusal, and available bare rates. Report ratios only when the evaluator accepts both arms. A refusal is a result about model applicability at that point.
- Compare against an independent rate only when it describes the same physical process, regime, and units. Spectroscopic tunneling splittings characterize eigenvalue differences. Interpretation as a kinetic rate requires an independently justified dynamical model.
- State a tolerance before assigning an agreement or rejection based on independent observations. Without a comparable independent observable and admissible width, retain an unresolved evidence disposition.

## Build and verification plan

1. Select a primary source and record each available quantity, its definition, and its uncertainties. Freeze the width extraction rule before examining agreement.
2. Build a JSON review tool that calls the existing WKB evaluator with paired scenarios. Include positive controls, a threshold-straddling case, and a record with missing width.
3. Evaluate the selected source at its documented evidence level, and keep the synthetic controls separate. Independently review the calculations, scope, and disposition before sharing results.

## Input and reproducibility

- With a tabulated constant-mass physical coordinate, run `node tools/wkb-rectangle.mjs profile.json`. The profile supplies `stateEnergyJ` and ordered `points` with `positionM` and `potentialJ`. The reducer uses linear interpolation at turning points and integrates the square root exactly on each linear segment. Supply only one bracketed forbidden interval.
- With a published action $I$ and matched along-path peak gap $\Delta$, the rectangular equivalent can instead be calculated as $L_{\mathrm{eff}}=I/\sqrt{2m_{\mathrm{ref}}\Delta}$. Declare the reference mass. For a mass-weighted coordinate, the published action already incorporates the path mass. The conversion chooses a reference length and does not estimate the physical displacement of the proton.
- Run `bun run build` then `node tools/bohr-width-review.mjs docs/research/bohr-width-validation/malonaldehyde-input.json`. Width and gap from the reducer or a documented action reduction go into the same paired comparison. Use transmission mode when only a dimensionless exponential factor is supported. Treat quoted-value rounding, numerical integration, surface error, effective-coordinate choice, and physical parameter uncertainty separately.
