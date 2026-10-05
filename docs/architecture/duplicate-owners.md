<!-- repo-map:no-verification -->
<!-- GENERATED FILE -- do not edit by hand. Edit the generator at
     tools/create-dependency-graph/create-dependency-graph.ts, then run
     `npm run docs:deps`. Hand edits are caught by the docs-fresh job. -->

# Duplicate owners

The live list of a second owner for a concept the integration design assigned once.
`docs/architecture/INTEGRATION_MAP.md` points here and does not copy these rows.

## Hits

`alignTemperatureBinding` and `TEMPERATURE_BINDING_NAMES` occur only in `src/numerical/binding-value.ts`. `readNamedBinding` is the only caller. No second owner.
`assertSameCarrierSign` is called only from `applyCarrierSignPolicy`. The BE-70 domain does not call `sameCarrierSign`. No second owner.
