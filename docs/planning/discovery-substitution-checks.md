# Downstream checks for discovery candidates

A candidate proposes that one graph quantity can supply an input where an equation expects another. The check starts with one explicit scenario for a consuming equation. It keeps the other inputs fixed and evaluates the baseline and the substitution with the same domain-checked evaluator. A shared dimension is a prerequisite for the experiment. Its result is evidence about that scenario.

## Design

- Keep distinct graph identities for the full and reduced Compton wavelengths and derive representative magnitudes from the matching definitions.
- Check each direction of a candidate against immediate consuming equations. Each record names the equation, replaced input, provenance, inputs and units, and available predictions. A domain refusal records the failed condition. A missing coherent baseline or sample produces an abstention.
- Use scoped scenarios for FRET and WKB as controls. Preserve discovery ranking and evidence grades. A domain refusal in one scenario does not exclude equality in every physical system.
- Show the records in `upt ground` and expose the wider report through `upt discover --substitutions`. The standard discovery report remains unchanged in shape when the flag is absent.
- Prove the FRET half-efficiency criterion and the WKB guard and rate properties in Lean. Attach formal references at the scope of those encoded properties.

## Implementation and validation

1. Correct both Compton magnitudes and verify their ratio is \(2\pi\).
2. Run the same domain guard for direct catalog evaluation and candidate substitutions. Exercise the accepted Bohr width, refused full and reduced Compton widths, and refused Landauer height at the representative temperature. Check an abstention when inputs are missing and look for equivalent behavior with swapped endpoint order.
3. Build and check the Lean modules and formal manifest. Validate JSON and text at the CLI and compare the three discovery scopes.
4. Reassess the Bohr-width substitution within an independently sourced system when a joint parameter estimate and uncertainty are available. Report illustrative sensitivity separately from empirical evidence. Compare the substituted and baseline rates only on points in the encoded domain.
