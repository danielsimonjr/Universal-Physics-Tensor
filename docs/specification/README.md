# UPT Formal Specification — Index

Reader's map for the specification. The spec grew in two phases: a core
six-part framework document (Parts I–VI, heavily revised across the
2026-05 review waves), and per-release supplements (Parts VII+) that
formally spec layers as they ship in code. **Where spec and code
disagree, the code (`src/`) plus its test suite is authoritative**; each
part carries status notes marking superseded or speculative content.

| Part | File | Scope | Status |
|---|---|---|---|
| I | [Part-I.md](Part-I.md) | Theoretical foundation: the rank-6 catalog `Π`, framing commitment, consistency invariants, Bridge Equations 11–20 | Core; wave-revised |
| II | [Part-II.md](Part-II.md) | Bridge-equation catalog BE-21–73 (§V is 21–50; §V-B is BE-51–54; §V-C is BE-55–73) + tensor-integration mapping | Core; writes up BE-21–73. The runtime catalog is the same 63 entries (ids 11–73); see Conventions |
| III | [Part-III.md](Part-III.md) | Algorithms + information-theoretic definitions (none of the §-numbered pseudocode algorithms are implemented) | Core; spec-only |
| IV | [Part-IV.md](Part-IV.md) | Validation framework: experimental-validation roadmap (near/medium/long-term) + dimensional-validation protocol | Core; experimental targets aspirational |
| V | [Part-V.md](Part-V.md) | Advanced mathematics: category theory, tensor networks, consistency matrix, experimental design (former §§XXI–XXII applications/risk essays → [`docs/essays/`](../essays/README.md)) | Core; largest + most speculative — read its status note first |
| VI | [Part-VI.md](Part-VI.md) | Practical-implementation framing, Status-Promotion Protocol (§XXVII-B), honest framework statistics, conclusion (former §§XXVIII–XXX application/emergency/governance essays → [`docs/essays/`](../essays/README.md)) | Core |
| VII | [Part-VII-Tensor-Algebra.md](Part-VII-Tensor-Algebra.md) | v0.2.0 tensor-algebra layer: `tensor-symbol`, `tensor-product`, Einstein summation, strict-boundary semantics | Supplement; frozen at v0.2.0; machine-checked via `TENSOR-RULE` markers |
| VIII | [Part-VIII-Metric-Layer.md](Part-VIII-Metric-Layer.md) | v0.3.0 metric layer: `metric-tensor`, `kronecker-delta`, `tensor-partial-derivative`, raise/lower | Supplement; frozen at v0.3.0; machine-checked via `TENSOR-RULE` markers |
| IX | [Part-IX-Composition.md](Part-IX-Composition.md) | Bridge composition (v0.7 P6 Phase A research spec): numerical-cascade semantics, C1–C5 calibration set, open questions, §9 Phase-D candidate identifications (proposed, unadjudicated) | Research track; Phases B–D met 2026-06-11 |
| X | [Part-X-Curvature-and-Field-Equations.md](Part-X-Curvature-and-Field-Equations.md) | v0.4.0–v0.7 grammar growth: connection/curvature node family, Einstein-field-equation layer, structural field-equation nodes | Supplement; descriptive (code-first) |
| XI | [Part-XI-Proposed-Equations.md](Part-XI-Proposed-Equations.md) | v0.24.0 identity-consequence surfacer: machine-derived candidate relations (`upt discover --derive`), held OUT of the catalog pending §XXVII-B review | Supplement; **NON-NORMATIVE / unadjudicated** |
| — | [CHANGELOG.md](CHANGELOG.md) | Revision-history ledger: the relocated 2026-05 "Wave" adversarial-review provenance, grouped by part | History |
| — | [../essays/](../essays/README.md) | Speculative application/risk essays relocated from Parts V–VI (G-4, 2026-06-11) | Companion; exploratory, non-normative |

## Conventions

- **Catalog count**: 63 bridge equations, IDs 11–73 with no gaps (27 established ·
  33 speculative · 3 highly-speculative). Counted from each entry's `id` and
  `status` in `src/bridges/index.ts` (`BRIDGE_EQUATIONS`). Parts I–II write up
  BE-11–73. Part I is BE-11–20. Part II §V is BE-21–50, §V-B is BE-51–54, and
  §V-C is BE-55–73. Entries 51 and 53–73 keep `source_part: 'III'` in that array;
  BE-52 keeps `source_part: 'I'`. BE-1–10 are the implicit "diagonal"
  laws (Schrödinger, Newton, Maxwell, Einstein, Standard Model) and are not
  individually catalogued. Reviewed `formalRef`s use `lean4-physjs`
  and name public PhysJS; the atlas and catalog counts are in `NOTES.md`, not in this catalog.
  Kind `bridge` is the only kind that lights `formally-proved`. The catalog path passes that reference, except an unadjudicated row stays `proposed`. The ids and the partials are listed in `NOTES.md`.
- **Revision provenance**: the 2026-05 adversarial-review iterations
  ("Wave X Tier Y, per Reviewer Z") were relocated to
  [CHANGELOG.md](CHANGELOG.md) on 2026-06-10 so the spec reads as a clean
  current-state reference. Bridge Status lines keep plain
  `Reformulated`/`Corrected on YYYY-MM-DD` stamps; the wave detail is in
  the changelog. Per the Part-I framing commitment, superseded forms that
  remain instructive are kept with a one-sentence rationale rather than
  silently rewritten.
- **Formulas** are rendered as `i.upmath.me` SVG images with LaTeX `alt`
  text; the `alt` attribute is the editable source of truth.
- **Drift guards**: `tests/bridges/spec-vs-index.test.ts` pins Part-I/II
  catalog prose against the runtime catalog;
  `tests/dimensional/{tensor,part-viii}-spec-vs-impl.test.ts` pin the
  Part-VII/VIII `TENSOR-RULE` markers bidirectionally against the test
  suite.
