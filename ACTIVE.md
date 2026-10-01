# Active engineering backlog

This file is the authorization gate and the live task list. A plan under `docs/planning/` is a record of what was designed. `tools/plan-doc-audit` walks this file only. The package version lives in `package.json`. Publishing to npm is the owner's job.

Sprints 0 through 6 are closed. There is no open sprint heading.

The owner removed every human-reviewer gate on 2026-10-01. The gates removed are independent physicist review, per-bridge curation-cost measurement, the kappa raters, the independent and frozen item authors, and the rule that no agent may author a frozen item, as a blocker. The Sprint 5 benchmark study and the Sprint 6 study (S6.1/S6.2, scoring the frozen set) were dropped by the owner on 2026-10-01. The harness code is unchanged.

`Scientific-Bridge-Discovery-v1.md` is not authorized by being named here. A phase of it is authorized only when it is an open task below.

## Closed sprints

- [x] **Sprint 0 — Oscillator pilot.** Code complete (2026-09-20). Closed 2026-10-01 when the owner removed the two gates that were not code.
- [x] **Sprint 1 — Relation contracts as an additive overlay.** Closed 2026-09-21.
- [x] **Sprint 2 — Regimes and error-carrying paths.** Closed 2026-09-22.
- [x] **Sprint 3 — Hyperedges, models, and the poster index.** Closed 2026-09-22.
- [x] **Sprint 4 — Verification workflow and checked bridges.** Closed. Twenty bridges, six relation types, ten reviewed formal references.
- [x] **Sprint 5 — The invalid-bridge benchmark.** Code complete. Closed 2026-10-01 when the owner dropped the human study named above. The harness stays.
- [x] **Sprint 6 — Study, scoped release, discovery hypothesis.** Closed 2026-10-01 except the public-API remainder below. The scoring study named above was dropped. The harness stays. `upt atlas`, the governance note, and the versioned export are already in the tree.

## Open tasks, easiest first

- [x] Bare `e` in a formula is the elementary charge, `E` is energy, and Euler's number is `exp(1)` or `euler`. `--allow-euler` is not a flag.
- [x] Publish `universal-physics-tensor` from a `v*` tag via GitHub Actions, with a tag/`package.json` version guard, instead of a hand `npm publish`.
- [ ] Correct the formal-reference system union in the Phase 4 deliverable of ROADMAP.md. It still names lean4-physlib or other, and it has no covers field. The atlas type and the Phase 4 design note already include lean4-physjs and covers.
- [ ] Add atlas, formal-reference, Lean, and PhysJS rows to the Development Status table in the root README. That table currently records the catalog, confrontations, composition, canonical equations, architecture, and quality gates.
- [x] Rename bridge 38's catalog name and the Part II heading to the Milgrom interpolation, as the catalog formal-reference design note specifies. The id and the module file stay. Bridge 36 is not renamed. The deep-MOND prose correction has already landed.
- [x] When the counted milestone 2b proofs land in PhysJS, pin the vendored manifest and add one catalog formal reference per id. The design note is docs/planning/Catalog-FormalRef-Design-Note.md. Only a reduction, a limit, or a derivation-step may be that reference. One id is one reference. Milestone 2b is running in PhysJS now. Ranks 1a and 2 have already landed as the four milestone-2 references.
- [x] When the milestone 2b stretch proofs land in PhysJS, pin the vendored manifest and add one catalog formal reference each for be-65, be-51, and be-61. The design note is docs/planning/Catalog-FormalRef-Design-Note.md. Only a reduction, a limit, or a derivation-step may be that reference. Cross-checks be-42, be-24, and be-19, and properties be-16, be-29, and be-11, stay out of the vendored manifest.
- [x] Add the six PhysJS cross-check and property catalog formal references under the owner ruling. The design note is docs/planning/Catalog-FormalRef-Design-Note.md. The covers word is the kind. They do not light formally-proved. Nested theorems stay nested.
- [ ] Add the milestone 3 Buckingham monomial references after that catalog key is in use. The covers line is the exponent tuple, form rather than prefactor, with a decoy row as the negative control. Design: docs/design/roadmap-lean-proven-bridges.md.
- [ ] Wire typed structural search to the residual-form canonical corpus, so a user claim written as a residual can match. Blocked while the Amendment 8 pins are live. Dropping the study does not lift those pins.
- [ ] Promote the Tier 2 set that the Sprint 6.7 API review deferred. Tier 1 is already the public atlas namespace. Do not promote a symbol whose value is the dropped benchmark claim, and do not promote the harness. The review is docs/planning/Atlas-API-Review.md. Whether a further public-surface change stays an ADR is undecided there; escalate that call to the owner before editing the barrel. Publishing the package is the owner's job.
- [ ] Record catalog judgments without inventing a verdict, and without treating them as gates: bridges 44, 46, and 50; the novel-candidate verdicts; the quantity-identification review; the bridge 23 check against Hartnoll 2015; the bridge 29 membership reconsider; the bridge 22 and 31 rename review. The bridge 42 membership reversal has already landed.
- [ ] Research, and not a small task: ensemble averages and interpolation-function stubs still have no closed form for automatic differentiation. There is no clean lever. Do not invent one.

Tiers 8, 10, and 11 are already in the tree: the expression-gap listing, cross-family path milestones 1 through 4, and hybrid retrieval. Their npm releases are not. That release choice is an owner decision below.

## Owner decisions

These are not authorized engineering until the owner rules. Publishing to npm is the owner's job.

- [ ] Owner decision: tier numbering, including that no Tier 9 is on record, and whether 0.48.0, 0.49.0, and 0.50.0 ship as separate releases or as one release of the current unreleased tree. The code for tiers 8, 10, and 11 is already in the tree.
- [ ] Owner decision: which reading of composition phases B through D is true. ROADMAP.md says they are open. The specification index says they were met on 2026-06-11. Part IX says Phase B will ship, and it also marks a Phase B reproduction criterion met on that date. Do not implement either reading.
- [ ] Owner decision: multi-statement formal-reference promotion. A second Lean statement stays a nested manifest object and is not a second reference. Promoting it, whether as an array or by pointing the reference at the nested plane-wave theorem, is not authorized by the design note.
- [x] Owner decision: property-level references. Daniel, 2026-10-01: a property may be a catalog formal reference, and a cross-check may be one too. The covers word is the kind, so a reader can tell either from a reduction, a limit, or a derivation-step. Neither kind lights formally-proved. A cross-check of two ids stays one entry; the covers line names the partner, and the partner does not get a second reference. That is the ruling scoping section 4.2 already asks for.
- [ ] Owner decision: whether any row of the unproven-bridge Lean feasibility triage is authorized. The triage is docs/planning/Unproven-Bridges-Lean-Feasibility.md. It does not move milestone 3.
- [ ] Owner decision, not a code task: which new physics-regime built-ins to add. The registry mechanism is shipped. The closed taxonomy was left as a physicist decision.
- [ ] Owner only: a Zenodo DOI for the composition research note. Do not send it out for physicist review. That send was a human-reviewer gate and is removed. A deposit is outward-facing and is the owner's.

Not a task: the Einstein-Cartan Newtonian limit and the Higgs-to-vacuum-energy residue. The repository has no derivation for either. Implementing either would fabricate physics. They are not gates.
