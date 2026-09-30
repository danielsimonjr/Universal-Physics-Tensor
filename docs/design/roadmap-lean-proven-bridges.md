# Lean-proved bridges

This note schedules work the corpus already specifies. Each fact below lives in
the document it names. Approval, and what has landed, are recorded outside
this file. This note changes no code, no canonical entry, and no cell of the
composition table.

## Decisions this note joins

- The first Lean targets are rank 1 of
  [`docs/research/phase-4-formalref-scoping.md`](../research/phase-4-formalref-scoping.md)
  §4.3, taken by route A in §4.5.
- PhysJS owns the Lean 4 project and its CI. The project requires Mathlib and
  the Physlib package (the library Daniel calls PhysLean), both as direct
  requires. That standing fact is `MEMORY.md`. The scoping report's correction
  records the same assignment.
- A reviewed `formalRef` is the record in
  [`docs/planning/Atlas-Phase-4-Design.md`](../planning/Atlas-Phase-4-Design.md)
  §3. UPT does not run Lean. The axiom gate, and the way a Lean exit code
  lies, are `TOOLS.md` and `formal/physlib/README.md`. The steps that put a
  PhysJS lemma under that gate are scoping §4.4.
- The category layer already specified is `ROADMAP.md` §2,
  [`docs/planning/Atlas-Phase-1-Design.md`](../planning/Atlas-Phase-1-Design.md)
  §2, `src/atlas/composition-table.ts`, and the witnessed `NormTransport` in
  [`docs/design/tier-10-cross-family-path.md`](tier-10-cross-family-path.md).
  [`docs/specification/Part-V.md`](../specification/Part-V.md) §17 is
  speculative and is not an engineering specification.

## Existing material reused

| Document | What this schedule takes from it |
|---|---|
| `docs/research/phase-4-formalref-scoping.md` | Milestone 1 targets, what each lemma certifies, the do-not-count row, the partial counterparts, the fidelity routes, the gate-extension cost |
| `docs/planning/Atlas-Phase-4-Design.md` | `formalRef` shape, derived evidence tags, the witness artifact, the bridges and their witnesses |
| `docs/planning/Atlas-Phase-1-Design.md`, `src/atlas/composition-table.ts`, `docs/planning/ADR-transported-norm-composition.md` | Relation types and the composition table |
| `docs/design/tier-10-cross-family-path.md` | Cross-family path and `NormTransport` |
| `docs/design/tier-8-probe-searchable-gaps.md` | Probe |
| `docs/design/tier-11-hybrid-retrieval.md` | Retrieval design |
| `docs/planning/Scientific-Bridge-Discovery-v1.md` | Product A frozen, Product B, §23 Family B rediscovery |
| `docs/research/Dimensional-Derivation-Benchmark.md`, `src/canonical/entries/dimensional-classics.ts` | The Buckingham monomials in that benchmark, later than the first five |
| `docs/research/Bridge-Equation-Dimensional-Audit.md` | Catalog derived, decoy, and unclosable rows. These rows are not atlas `formalRef`s |
| `docs/research/Bridge-Priority-Scorecard.md` | Confrontation triage. This ranking is not the Lean order |
| `docs/research/v0.11.0-novel-candidates.md` (supersedes `v0.10.0-novel-candidates.md`), `docs/research/proposed-equations-adjudication.md`, `docs/research/Linkage-Candidate-Proposals.md` | Identification proposals. These are not Lean targets |
| `ROADMAP.md` | Phase exits, evidence rules, and the §8 pointers |
| `MEMORY.md` | Where the Lean project lives, and what it requires |
| `TOOLS.md`, `formal/physlib/README.md` | The axiom gate, and the pinned Physlib checkout it measures |
| `todo.md` | be-16, be-23, be-38, and the criterion-3 residual follow-up |
| `src/atlas/`, `src/bridges/`, `src/canonical/` | The records. This note does not re-list them |

## The first five

Source for every row: scoping §4.3 rank 1. The lemma shape and the covers
line stay in that cell.

| Bridge | Record |
|---|---|
| `ab-kg-schrodinger` | `src/atlas/waves/bridges-closure.ts` |
| `ab-klein-gordon-wave` | `src/atlas/waves/bridges.ts` |
| `ab-stiff-string` | `src/atlas/waves/bridges-closure.ts` |
| `ab-telegraph-diffusion` | `src/atlas/diffusion/bridges-closure.ts` |
| `ab-telegraph-wave` | `src/atlas/diffusion/bridges-closure.ts` |

The reviewed reference already on record is scoping §1
(`ab-pendulum-linear`, `src/atlas/oscillators/bridges-limits.ts`). Its covers
line stays that section's covers line.

## Milestones

### 1. Rank-1 lemmas (route A)

Scope is scoping §4.5.A under the require rule in `MEMORY.md`.

Acceptance:

- Each of the five carries a reviewed `formalRef` whose statement is the
  rank-1 lemma. The covers line is that cell: `bound.delta` at the dispersion
  relation.
- The sanity-lemma test and the gate extension are the steps in scoping §4.4.
  A PhysJS reference is re-measured. The gate does not skip it (scoping §2,
  the system-union fact).
- The pendulum reference's covers line is unchanged.
- `src/canonical` is unchanged. The composition table is unchanged.
- `formally-proved` is reached only through `deriveEvidence`, as
  Atlas-Phase-4 §3 already requires.

### 2. The rest of the candidate table, in its rank order

§4.3 ranks 1a, 2, 3, and 4, in that order. The substitution row stays on the
do-not-count recommendation in that table.

### 3. Buckingham monomials

The classics in `docs/research/Dimensional-Derivation-Benchmark.md`, and
the catalog rows in `docs/research/Bridge-Equation-Dimensional-Audit.md`. A
PhysJS theorem is keyed by the existing `CE-` or `be-` id. A `formalRef`
field on `CanonicalEquation` waits for a later note. `ab-string-wave` is the
atlas overlap with that benchmark. §4.3 did not rank it, so it is outside the
first five.

### 4. Rediscovery

The program is
[`docs/planning/Scientific-Bridge-Discovery-v1.md`](../planning/Scientific-Bridge-Discovery-v1.md)
§23 Family B. A Lean proof is attached after that program recovers a
statement. This note authors no benchmark item. The independence rule is
`AGENTS.md` and `scripts/atlas-benchmark-models.mjs`.

### 5. The category layer stays the one already specified

Composition stays the table in Atlas-Phase-1 §2. A bound crosses families on
a witnessed `NormTransport` (tier 10). Part V §17 stays outside the
engineering specification.

## Conflicts

1. **The PhysJS README list and the scoped rank order.** The README target
   list, quoted in scoping §2, names the spring–LC map, the damped ζ² map,
   the Stokes–Einstein substitution, Klein–Gordon dispersion limits, and
   d'Alembert in the missing direction. §4.3 ranks the five dispersion bounds
   first, puts `ab-spring-lc` and `ab-damped-rlc` at rank 3, puts
   `ab-wave-dalembert` at rank 4, and recommends that `ab-stokes-einstein`
   and `ab-heat-diffusion` not be counted. This schedule follows §4.3 and
   §4.5.A. Withdrawing that recommendation is a correction to the scoping
   report.
2. **A tag on the whole bridge, and a lemma about `bound.delta`.**
   `deriveEvidence` lights `formally-proved` for the bridge once a reviewed
   `formalRef` exists (Atlas-Phase-4 §3). The CLI states that the reference
   covers its statement only. Scoping §1 and §4.3 already give each reference
   its covers line. This schedule leaves those covers lines as written.
3. **A private proof and a public record.** Scoping §2 records PhysJS as
   private at the last read, and §4.4 leaves visibility open. A `formalRef`
   into a repository a reader cannot fetch is unchecked for that reader.
   This schedule leaves publication open. It also inherits the scoping
   report's limit on what that report has read.
4. **Catalog confrontations.** be-16, be-23, and be-38 are queued in
   `todo.md` on a missing source or a tautology gate. Criterion 3's
   residual-form follow-up is queued there too, behind the Amendment 8 pins.
   Its scores stay in `ROADMAP.md` §7. Lean proofs of atlas bridges leave
   those rows as they stand. The catalog bridge equations are the owner's own
   work (scoping report, owner decision). No external formal source is
   expected for them.

Stale sentences that disagreed with this schedule are corrected in the files
that held them: the scoping report, `ROADMAP.md` §8, the Phase 4 exit cell in
`docs/planning/Atlas-Phase-4-Design.md`, `MEMORY.md`, and `TOOLS.md`. The
research index lists the scoping report.

## Open questions

1. Publish PhysJS, or keep the resolution check credentialed until it is
   public?
2. Confirm that milestone 1 follows §4.3 rank 1. The other candidate is the
   README list together with the substitution row. Taking that candidate
   withdraws the do-not-count recommendation in the scoping report.
