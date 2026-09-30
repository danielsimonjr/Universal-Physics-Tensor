# docs/research/

Physicist-facing research artifacts — notes written for external review
rather than internal planning. Unlike `docs/planning/` (per-release
working documents), these are self-contained, citation-anchored, and
honest about scope. The collection spans the composition/linkage analyses,
the bridges-vs-canonical map, the canonical-only baseline, and the
adjudication/calibration notes that close out the discovery pipeline
(proposed equations + orphan connectors → 0 promoted; precision calibration).

**Current reading** (re-counted from the source; the notes below keep the counts they were written with):

- `BRIDGE_EQUATIONS`: 55 entries, ids 11–65, 19 established, 33 speculative, 3 highly-speculative.
- `CONFRONTATIONS`: 19 entries (ids 11, 21, 23, 35, 36, 37, 48, 51, 52, 55, 56, 58, 59, 60, 61, 62, 63, 64, 65).
- Reviewed `formalRef`s: six, all `system: 'lean4-physjs'`, via public PhysJS. `NOTES.md` is the rolling record. `phase-4-formalref-scoping.md` is the 2026-09-24 scoping report; its "count is 1" is that day's measurement.

## Notes

- **`cli-physicist-persona-0.47.1-post-fix.md` — retest after the W1–Q2 batch (2026-09-26).**
  Model persona again on built `upt` at 0.47.1 (`a9eff31`). Prior fixes hold. New
  open findings: W4 (Kepler/Schwarzschild monomial constants→1), W5 (Planck
  all-constant RHS refused), W6 (`a`→perihelion), W7 (Landauer `ln(2)` vs `ln2`),
  L5–L8, Q3–Q4, I5–I8.
- **`cli-physicist-persona-0.47.1.md` — CLI dogfood pass as an applied physicist (2026-09-26).**
  Model persona on the built `upt` CLI at 0.47.1; not a human reviewer. W1–W3,
  L1–L4, Q1–Q2 and I1–I4 fixed in the follow-up patch batch (dispositions in the
  note).
- **`pi-instrument-results.md` — the flagship PI-facing output (2026-07-04).**
  UPT read as an honest FALSIFICATION INSTRUMENT: a trustworthy *no*, an
  extraordinary *yes*. Consolidates the three first-class outputs — the
  **null-result catalog** (132 → 7 promising · 0 contradictory · 90 falsified;
  0/8 ever genuine, each promising verdict now carrying its grounding ledger of
  passed-vs-gap falsifiers), the **evidence spine** (9 real-data confrontations in that note; the registry now has 19;
  three GR tests within 1σ — Mercury 0.26σ, Shapiro 0.91σ, lensing
  0.67σ — plus the QGP nearly saturating the KSS bound, the 3D-Ising bootstrap ν
  at 0.015σ, and parameter-free collisional decoherence within ~15%), and the
  **frontier** (11 truly-unconnected isolated bridges) — plus the honest ceilings
  (mechanism and data are not testable on dimensional candidates; the loop closes
  via the firewall, not a candidate-confrontation machine). Also states the
  spine's honest **rigor hierarchy**: precision GR at ~10⁻⁵ across two
  independent PPN parameters (γ via Shapiro + lensing, β via Mercury) vs. weaker
  one-sided bounds (BE-36's GW170817 confrontation tests only the bound's +side;
  BE-48's GRW rate sits ~8 orders below its bound) — nine rows, not nine equal
  confirmations. Every figure regenerates from a `upt` command. The
  scientist-facing summary of what the instrument does.
- **`v0.33.0-discovery-hardening-results.md` — the consolidated honest results
  of the four-phase discovery-hardening program (Phases 1–4).** The negative
  core (0/8 adjudicated genuine, `contradictory=0`, 70 axis-clash
  falsifications incl. the 5 named cross-regime coincidences, 0 `entailed`
  consequences) and the positive evidence spine (5 real-data confrontations;
  the two GR tests — Mercury 0.26σ, Cassini 0.91σ — within 1σ). Every number
  has a `upt` reproducer + a pinned regression gate. The consolidated results of
  that program; the current instrument-wide picture is in `pi-instrument-results.md`
  above. (Post-v0.33.0, the evidence spine grew to **7 confrontations** in that note —
  be-51 gravitational lensing, the third classic GR test at 0.67σ, and be-21 the
  KSS η/s bound vs the quark-gluon plasma, joining Mercury/Shapiro/Planckian/GW/GRW. The registry now has 19.)
- **`canonical-expansion-candidate-audit.md` — the monomial-fit audit gating the
  v0.34.0 canonical L-layer expansion (66 → 93 monomial laws).** Classifies every
  candidate textbook law by whether it fits the L0 monomial model, mapping the
  model's exact boundary: sums/transcendentals, hidden multiple length scales
  (Poiseuille), dimensionless numbers (Reynolds, α, refractive index), and pure
  counts are EXCLUDED and logged as the L1-sum/L2 backlog. The v0.35–0.36 L1-sum
  tier then encoded 10 of those non-monomial laws (Bernoulli, decay, Lorentz γ,
  Compton, Rydberg, …; 93 → **103**), measured to be reference-only (zero
  structural bridge-matches). Geometric optics has zero monomial representatives.
- `discovery-precision-calibration.md` — the "funnel precision" frontier: the
  magnitude gate is threshold-insensitive (48→58 promising across `--max-orders` 1→12)
  and this session's adjudications yielded **8 candidates → 0 genuine**. The precision
  ceiling is *structural* (dimensional matching can't see mechanism); tightening would
  falsify the cross-domain candidates UPT exists to surface. Precision is delivered by
  the firewall + adjudication, not gating — no gate change made.
- `orphan-connector-adjudication.md` — Adam+Eve adjudication of the most-motivated
  "same-kind" connectors that could link an isolated bridge into the core: **0 of 7
  genuine** across two rounds. Round 1 (CI-1…3): coarsening≠critical-ξ,
  tunneling-mass≠quasiparticle-mass, mutation-rate≠decoherence-rate. Round 2
  (2026-07-04, CI-4…7): the holographic entropy pair (RT ≟ Bekenstein–Hawking, both
  S=A/4G — "equality without identity"), attempt≠Debye frequency, and v_GW ≟ c (a
  testable GR prediction, not a definition). Even the strongest theoretical case (the
  S=A/4G pair) is a form-coincidence, not an alias. The isolated frontier is isolated
  by *physics*, not vocabulary — nothing genuine to build.
- `proposed-equations-adjudication.md` — Status-Promotion adjudication of the 5
  machine-derived proposed equations (Part-XI) by independent Adam (gemini-2.5-pro)
  + Eve (o3) review: **0 of 5 promoted** — 4 dimensional coincidences / trivial
  restatements rejected, PE-3 (`m=hν/c²`) recognized but already entailed by the
  L-layer. The discovery pipeline's honest end state: zero false positives promoted.
- `bridges-vs-canonical-map.md` — every catalog bridge overlaid onto the
  standard-physics (canonical) graph via `upt map --source=canonical --equation`:
  where each bridge lands. **20 of 41** edges connect (mostly through `mass`/
  `temperature`); **21 isolated**,
  of which **17 are orphaned even within the
  catalog**. Includes the follow-up program: the `thermal-de-broglie-wavelength ≡
  thermal-wavelength` alias (reconnected BE-11), the `dimensionAdjacency` review
  surface (56 candidates, ~1 true alias), and why the isolated *established*
  bridges (Yang–Mills β, KSS η/s, Kibble–Zurek) are out-of-scope for a dimensional
  L-layer (→ added F=ma/E=mc²/p=mv instead). Location = shared-quantity adjacency
  (necessary, not sufficient).

- `v0.23.0-canonical-only-baseline.md` — the discovery funnel pointed at the
  canonical L-layer ALONE (no bridges): the standard-physics consistency
  baseline. 11 map components (anchored cluster of 16), funnel 33 candidates →
  2 flagged coincidences (`erasure-energy`/`free-energy-difference ≟
  photon-energy`) · 5 genuine scale clashes · **0 contradictory**. Records the
  three 2026-06-18 fixes (magnitude-gate sourcing, canonical name unification,
  declared compton↔de-Broglie link). `upt {map,discover} --source=canonical`;
  pinned by `tests/composition/canonical-graph.test.ts`.
- `v0.11.0-novel-candidates.md` — Phase-D review surface
  (41-edge graph: 7 novel candidates + 1 collision awaiting an
  AliasDisposition). Supersedes the v0.10.0 report (kept for
  provenance).
- `Dimensional-Derivation-Benchmark.md` — known physics equations
  (pendulum, Kepler, Planck scales, Compton, thermal de Broglie,
  Schwarzschild, Reynolds) re-derived by the Buckingham-π engine; every
  row is verbatim engine output, pinned by
  `tests/dimensional/derivation-benchmark.test.ts`.
- `Bridge-Equation-Dimensional-Audit.md` — the engine pointed at the
  catalog itself: of 41 bridge edges, 11 are dimensional consequences
  (with famous prefactors — ln 2, 1/4π, 1/8π, √2π — recovered by matching
  the derived form against each evaluator), 5 are decoys, 25 are
  unclosable. Pinned by `tests/dimensional/bridge-derivation-audit.test.ts`.
- `Bridge-Priority-Scorecard.md` — a structural-triage ranking of the
  speculative bridges by *decidability against established physics*
  (grounding + complexity + anchoring + data-confrontation flag, Tiers
  1/2/3). Explicitly NOT a credibility score. `npm run bridge-priority`;
  pinned by `tests/composition/bridge-priority.test.ts`.
- `Catalog-Linkage-Map.md` — how the equations connect: connected
  components of the catalog graph by shared quantity (23 components — one
  dominant anchored cluster of 16 hubbed on mass/temperature, two small
  clusters, 20 isolated). `upt map`; pinned by
  `tests/composition/linkage-map.test.ts`.
- `Linkage-Candidate-Proposals.md` — using the map to propose candidate
  cross-cluster links for physicist review: 132 same-dimension candidates
  funnel to ~3 genuinely motivated (the critical-dynamics correlation
  length). The funnel quantifies the false-positive rate of dimensional
  matching. `upt candidates`; pinned by
  `tests/composition/link-candidates.test.ts`.
- `phase-4-formalref-scoping.md` — the 2026-09-24 scoping report on which atlas
  bridges had a checked Lean counterpart. Its tables record one reviewed
  `formalRef` that day (`ab-pendulum-linear` → Physlib). The live set is six
  `lean4-physjs` references via public PhysJS (`NOTES.md`). The banner at the
  top of the report says so. The ranked lemmas and the two partial counterparts
  stay as that day's search.
- `Orphan-Connector-Analysis.md` — the 2026-06-15 isolated-bridge frontier
  (`upt connectors`), refreshed 2026-07-04. Period counts stay in the note.
- `atlas-benchmark-preregistration.md` — frozen pre-registration for the
  invalid-bridge benchmark. Thresholds and the empty item set stay as
  registered. Hybrid retrieval has since landed as Tier 11; that fact is in
  `NOTES.md`. The frozen text stays as registered.
- `atlas-link-prediction.md` — the Phase 6 leave-one-bridge-out result.
  `tests/atlas/link-prediction.test.ts` recomputes the table.
- `atlas-study-results.md` — generated study output (`bun run atlas:study`).
  Do not edit the table by hand.
- `phase-0-model-persona-review.md` — model-persona review of the oscillator
  pilot. The reviewer is a model. A human physicist review is a separate criterion.
- `phase-1-citation-check.md` — model spot-check of sampled `// source:`
  comments against the cited papers.
- `phase-1-citation-quote-check.out.md` — generated quote-match output. Do not
  edit by hand.
- `phase3-dataset-verification.md` — 2026-07-02 check that a confrontation's
  encoding and its dataset both support the pin.
- `rank7-axis-measurement.md` — 2026-07-05 measurement that the Topology and
  Quantum Statistics axes classify and do not gate. The note's "rank-7" is
  that measurement's name for the axis set.
- `v0.10.0-Composition-Research-Note.md` — methods note for the v0.10.0
  composition experiment. Its catalog count is the count at that version.
- `v0.10.0-novel-candidates.md` — the Phase D review surface that
  `v0.11.0-novel-candidates.md` supersedes. Kept for provenance.
- `BE-29-Landauer-Recovery.md` — the pre-fix scan's single *undeclared*
  structural match: BE-29 (Jarzynski) appeared to recover CE-landauer's
  `k_B T ln(·)` form. Argues it is a shared functional form (the `ln` factor —
  `ln 2` vs `ln⟨e^−βW⟩` — is physically substantive), not a partnership. Both
  fixes it recommends are now applied: a canonical Jarzynski entry
  (`CE-jarzynski`) as BE-29's true partner, and stub-identity tagging in
  `normal-form.ts` that demotes the form-coincidence to `dimensional-only`.
  `upt recover`; pinned by `tests/canonical/{linkage,normal-form}.test.ts`.
