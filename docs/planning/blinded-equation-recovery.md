# Blinded equation recovery

Measure whether UPT's observation-driven search recovers predictive equations that a dimensional baseline misses. A run measures recovery on declared domains. Finite observations cannot establish algebraic identity or physical mechanism.

## Protocol

1. A curator working independently of the engine freezes families before scoring. Group equivalent forms, aliases, inverse forms, approximations that leak the target, and duplicated sources with the same family. Use opaque case and variable IDs. Record exact provenance and generator formulas in a separate curator ledger. Keep that ledger outside the engine and public regression packet until the blind round has closed.
2. Each case supplies SI-compatible units, independent exploratory and challenge observations with declared uncertainties, and a sealed positive or negative designation. Positive cases have a curator-known equation and challenge inputs that discriminate plausible alternatives. Negative cases have no stable equation in the declared search setting, for example a shuffled response or a change in the generating regime. A curator must verify both the designation and discriminating power independently.
3. Use the observation-only probe study entry point. Construct a new study from allowlisted observations and units. Exclude catalog and canonical equations, declared correction families, candidate formulas and family descriptions. The study fits and selects using exploratory rows before it scores its frozen selection on the challenge rows. The separate dimensional baseline uses the first maximal independent subset of inputs to propose one monomial. It can fit one overall scale on the same exploratory rows.
4. Record outcomes independently for each method. A candidate that passes the exploratory criterion and the challenge is a recovery on a positive case and a false positive on a negative case. A candidate that fails the challenge is refuted. A method with no eligible exploratory output abstains. Retain per-case results and report family-weighted rates so a large family cannot dominate the score. An uncaught runner error fails the run. A completed search with no eligible fit abstains.
5. Publish the frozen input hashes and exact commit. Repeat against the same packet in CI to detect regressions. Once results are used for tuning, the packet is a regression set. A new blind round requires fresh untouched families. File reproducible engine or harness defects with the smallest safe reproducer and keep sealed answers out of GitHub issues.

## Delivery

Build the projection, baseline, scorer and controls first. Verify that answer-bearing fields are rejected and that changing challenge responses cannot change selection. Exercise the runner on existing synthetic controls and label those results as development evidence. Ingest separately curated families for the first blind round after those controls pass.

## Run the harness

Build with `bun run build` and run `node tools/equation-recovery/run.mjs PACKET.json KEY.json`. The packet is a JSON array. Each case has `id`, `target`, `governing`, `exploratory`, `challenge`, and `synthetic`. Quantity objects have `name` and `unit`. Each observation has `inputs`, `observed`, and a positive `sigma`, all numerical in the declared units. Use opaque IDs such as `c1` for cases, `q1` for variables and `f1` for families. The scoring key maps case IDs to objects with `family` and boolean `positive`. The runner reads that key only after it has fitted and evaluated every case.

Use `node tools/equation-recovery/control.mjs` for the public development controls. The regular repository CI runs these on PRs, default-branch pushes and the daily schedule. The curator runs the blind packet from a checkout pinned to a commit and records that commit with the output. Publish aggregate results during the blind round. Keep per-case diagnoses and the curation ledger restricted until the evaluation is closed.
