<!-- repo-map:no-verification -->
<!-- GENERATED FILE -- do not edit by hand. Edit the generator at
     tools/create-dependency-graph/create-dependency-graph.ts, then run
     `npm run docs:deps`. Hand edits are caught by the docs-fresh job. -->

# Duplicate owners

The live list of a second owner for a concept the integration design assigned once.
`docs/architecture/INTEGRATION_MAP.md` points here and does not copy these rows.

## Hits

`function isTemperatureName` is defined only in `src/dimensional/formula-names.ts`. `alignTemperatureBinding` is called only from `readNamedBinding`. `TEMPERATURE_BINDING_NAMES` is not a second list.

`function resolveQuantityName` and `SYNONYM_GROUPS` are defined only in `src/dimensional/formula-names.ts`. `function editDistance` is defined only in `src/composition/aliases.ts`. `resolveToCatalogName`, `rewriteInputKey`, `formulaSpellings`, and `synonymInCatalog` are not separate resolvers.

`assertSameCarrierSign` is called only from `applyCarrierSignPolicy`. The BE-70 domain does not call `sameCarrierSign`. No second owner.

`canonicalPrefactor(…) ?? 1` does not occur. `makeEvaluate` calls `canonicalGroupPrefactor`.

`BRIDGE_EQUATIONS` is the projection of `registerBridge`. No hand-maintained catalog literal.

`function canonicalJson` and `function captureEnvironment` are defined only in `src/composition/canonical-json.ts`.

No classical RK4 weight `(h / 6) *` remains under `src/`.

`const MASS_DENSITY` is defined only in `src/dimensional/types.ts`.
