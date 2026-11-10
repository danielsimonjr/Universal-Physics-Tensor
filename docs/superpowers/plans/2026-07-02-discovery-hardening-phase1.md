# Discovery-Hardening Phase 1 (v0.31.0): Adjudication Ledger + Calibration Benchmark — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Machine-surfaced discovery candidates keep their human verdicts: a pair-keyed adjudication registry (seeded with the 8 reviewed verdicts), verdict annotation in `upt discover`, and a CI calibration benchmark that gates every future funnel change.

**Architecture:** New leaf module `src/composition/adjudication.ts` (types + `candidateId` + seeded registry + annotation wrapper). `rankDiscoveries` stays pure and verdict-free; annotation is a separate layer applied at the CLI boundary. The benchmark is a plain vitest file (runs in existing CI; no new workflow).

**Tech Stack:** TypeScript 6 strict ESM, vitest 4. Zero new dependencies.

**Design doc:** `docs/superpowers/specs/2026-07-02-discovery-hardening-program-design.md`

## Global Constraints

- ESM: every relative import carries the `.js` extension.
- Zero hard deps; nothing here touches optional peers.
- **Epistemic firewall:** adjudication verdicts NEVER mutate `BRIDGE_EQUATIONS`, the graphs, or `PROPOSED_BRIDGES`. They only annotate discovery *output*.
- `rankDiscoveries` and `vetLinkCandidate` signatures and behavior are UNCHANGED in this phase (the benchmark pins them first; Phase 2 changes them against the pins).
- CLI commands reach the library only via `ctx.api` — extend the `src/cli-api.ts` barrel; never deep-import from `src/cli/`.
- Text-output changes require re-pinned goldens in the SAME commit. Error paths never emit JSON.
- Scoped vitest per task (`npx vitest run tests/…`); full suite + build + smoke only at the release gate (Task 5). Windows cold-start is 3–5 min — do not run the full suite per task.
- Doc tone: adjudication is a *review memory*, not a credibility engine. Keep the existing "review surface" framing in all user-facing text.

---

### Task 0: Pre-execution verification gate (no commit)

**Files (read only):**
- `src/composition/discovery.ts` (VettedCandidate at :73, DiscoveryOptions at :144)
- `src/composition/proposed-bridges.ts` (`derivedFrom.identification`, `PROPOSED_BRIDGES`)
- `src/composition/compose.ts:119-149` (`AliasDisposition` registry pattern; locate the exact exported name of the registered-identifications list referenced as `QUANTITY_IDENTIFICATIONS` in its docstring)
- `src/cli/commands/discover.ts` + `src/cli/commands/_discovery-opts.ts` (flag surface, output shape)
- `src/cli-api.ts` (barrel pattern for Task 3)
- `docs/research/proposed-equations-adjudication.md` + `docs/research/orphan-connector-adjudication.md` (the 8 verdicts and their exact quantity names)

**Actions:**
- [ ] Run `node bin/upt.mjs discover` and `node bin/upt.mjs discover --source=both` at HEAD; record the funnel counts (at 2026-07-02 HEAD, catalog source printed `132 candidates → 12 promising · 100 inert · 20 magnitude-clash · 0 contradictory` — re-verify, do not trust this plan).
- [ ] Run `node bin/upt.mjs discover --source=canonical`; record counts (expected `contradictory: 0`).
- [ ] For each of the 8 seed verdicts (table in Task 2), resolve the two quantity names against the live graph (`grep` in `src/composition/quantities/` or inspect `discover --json` output). **Known drift risk:** the adjudication docs write `erasure-energy`; the live graph may use `landauer-erasure-energy`. Record the resolved names; Task 2 uses THOSE, with the doc's original naming preserved in `grounds`.
- [ ] Enumerate the golden cases touching discover: `grep -rl "discover" tests/cli/golden/` — record the list for Task 3's re-pin.
- [ ] Read `tests/cli/golden-capture.mjs` header for the recapture procedure.

**Produces (for later tasks):** verified seed-name table; HEAD funnel counts; discover-golden list.

---

### Task 1: `candidateId` + adjudication types

**Files:**
- Create: `src/composition/adjudication.ts`
- Test: `tests/composition/adjudication-id.test.ts`

**Interfaces (Produces):** `candidateId(a, b): string`, `AdjudicationVerdict`, `CandidateAdjudication`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/composition/adjudication-id.test.ts
import { describe, it, expect } from 'vitest';
import { candidateId } from '../../src/composition/adjudication.js';

describe('candidateId', () => {
  it('is symmetric under argument order', () => {
    expect(candidateId('coarsening-length', 'quantum-correlation-length')).toBe(
      candidateId('quantum-correlation-length', 'coarsening-length'),
    );
  });
  it('normalizes to lo~hi over kebab-case slugs', () => {
    expect(candidateId('mutation-rate', 'decoherence-rate')).toBe(
      'decoherence-rate~mutation-rate',
    );
  });
  it('distinct pairs get distinct ids', () => {
    expect(candidateId('a', 'b')).not.toBe(candidateId('a', 'c'));
  });
  it('rejects names outside the kebab-case slug set (collision guard)', () => {
    expect(() => candidateId('bad~name', 'mass')).toThrow(/kebab-case/u);
    expect(() => candidateId('mass', 'Bad-Case')).toThrow(/kebab-case/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composition/adjudication-id.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Adjudication ledger for machine-surfaced discovery candidates.
 *
 * Human verdicts on identification hypotheses (`a ≟ b`) are REVIEW MEMORY:
 * once a physicist has disposed of a candidate, the funnel must not
 * re-surface it as fresh. Verdicts NEVER mutate the catalog or graphs
 * (the epistemic firewall) — they annotate discovery output only.
 *
 * Keyed by the order-normalized quantity-name pair. Proposed equations
 * (`upt discover --derive`) inherit the verdict of the identification they
 * were derived from (`derivedFrom.identification`).
 *
 * @module composition/adjudication
 */

/** Quantity names are ASCII kebab-case slugs; enforced so `~` cannot collide
 *  (Adam/Eve vet r1: guard the character-set assumption, don't assume it). */
const SLUG = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * Stable identity for an identification hypothesis: the two quantity names,
 * sorted, joined with `~`. Deliberately excludes score/verdict/dimension so
 * ids survive funnel-internal changes. NOT rename-proof: a quantity rename
 * (alias disposition) must update `ADJUDICATIONS` in the SAME commit — the
 * calibration benchmark's seed-resolution test enforces this.
 *
 * @public
 */
export function candidateId(a: string, b: string): string {
  if (!SLUG.test(a) || !SLUG.test(b)) {
    throw new Error(
      `candidateId: quantity names must be kebab-case slugs (got '${a}', '${b}')`,
    );
  }
  return a <= b ? `${a}~${b}` : `${b}~${a}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composition/adjudication-id.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit && npx tsc -p tsconfig.tests.json --noEmit
git add src/composition/adjudication.ts tests/composition/adjudication-id.test.ts
git commit -m "feat(composition): stable candidate identity for discovery adjudications"
```

---

### Task 2: Adjudication registry seeded with the 8 reviewed verdicts

**Files:**
- Modify: `src/composition/adjudication.ts`
- Test: `tests/composition/adjudication-registry.test.ts`

**Interfaces (Produces):** `ADJUDICATIONS: readonly CandidateAdjudication[]`, `adjudicationFor(a, b): CandidateAdjudication | undefined`.

**Seed data** — names below are the DOC names; use the Task-0-resolved live-graph names, keeping doc names in `grounds` when they differ. Verdicts and grounds come verbatim-in-substance from the two adjudication docs; do not soften or embellish them.

| # | Pair (doc names) | Verdict | Grounds (condensed from doc) | Source |
|---|---|---|---|---|
| PE-1 | erasure-energy ≟ photon-energy | decoy | dimensional coincidence; no mechanism | proposed-equations-adjudication.md |
| PE-2 | dark-fermion-mass ≟ erasure-energy | decoy | dimensional coincidence; no mechanism | proposed-equations-adjudication.md |
| PE-3 | (identification behind `m = hν/c²`) | entailed | real physics, already entailed by CE-planck-einstein + CE-mass-energy; not a new link | proposed-equations-adjudication.md |
| PE-4 | dark-fermion-mass ≟ rest-energy-identification | decoy | trivial/definitional | proposed-equations-adjudication.md |
| PE-5 | peak-wavelength ≟ hubble-distance | decoy | numerically off by ~10²⁹ for the CMB; no mechanism | proposed-equations-adjudication.md |
| CI-1 | coarsening-length ≟ quantum-correlation-length | decoy | non-equilibrium vs equilibrium length; unanimous | orphan-connector-adjudication.md |
| CI-2 | tunneling-mass ≟ effective-mass | decoy | different particles/Hamiltonians; unanimous | orphan-connector-adjudication.md |
| CI-3 | mutation-rate ≟ decoherence-rate | decoy | same units, no shared meaning; unanimous | orphan-connector-adjudication.md |

(PE-3/PE-4 rows: Task 0 must extract the exact identification pair each proposal was derived from — read the `derivedFrom.identification` of the matching `PROPOSED_BRIDGES` entry or the doc's derivation line. If a doc pair no longer resolves to live graph names, record it in the entry's `grounds` as `(doc name: X)` and use the live name; if it resolves to NOTHING at HEAD, seed it anyway — verdicts are durable even when the candidate is not currently surfaced — and note that in `grounds`.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/composition/adjudication-registry.test.ts
import { describe, it, expect } from 'vitest';
import {
  ADJUDICATIONS,
  adjudicationFor,
  candidateId,
} from '../../src/composition/adjudication.js';

describe('ADJUDICATIONS registry', () => {
  it('carries the 8 seeded verdicts', () => {
    expect(ADJUDICATIONS).toHaveLength(8);
  });
  it('every entry has grounds, a source doc, and a date', () => {
    for (const a of ADJUDICATIONS) {
      expect(a.grounds.length).toBeGreaterThan(10);
      expect(a.source).toMatch(/^docs\/research\/.+\.md$/u);
      expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(a.id).toBe(candidateId(...(a.id.split('~') as [string, string])));
    }
  });
  it('lookup is order-insensitive', () => {
    const c1 = adjudicationFor('mutation-rate', 'decoherence-rate');
    const c2 = adjudicationFor('decoherence-rate', 'mutation-rate');
    expect(c1).toBeDefined();
    expect(c1).toBe(c2);
    expect(c1?.verdict).toBe('decoy');
  });
  it('unknown pairs return undefined', () => {
    expect(adjudicationFor('mass', 'no-such-quantity')).toBeUndefined();
  });
});
```

(Adjust the CI-3 pair in the lookup test to the Task-0-resolved names.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composition/adjudication-registry.test.ts`
Expected: FAIL — `ADJUDICATIONS` not exported.

- [ ] **Step 3: Implement registry**

```ts
/**
 * Verdict of a human adjudication OF THE IDENTIFICATION `a ≡ b` (never of a
 * specific derived equation — derived equations inherit this as context):
 * - `genuine`  — real physics AND a new link (nothing seeded qualifies yet).
 * - `entailed` — real physics already carried by the L-layer; not a new link.
 * - `decoy`    — dimensional coincidence / no mechanism; includes trivial and
 *                definitional identifications.
 * - `deferred` — reviewed and consciously parked (≠ absent entry, which means
 *                never reviewed).
 *
 * @public
 */
export type AdjudicationVerdict = 'genuine' | 'decoy' | 'entailed' | 'deferred';

/** One adjudicated identification hypothesis. @public */
export interface CandidateAdjudication {
  /** `candidateId(a, b)` of the identification. */
  readonly id: string;
  readonly verdict: AdjudicationVerdict;
  /** Why — condensed from the adjudication record; never machine-generated. */
  readonly grounds: string;
  /** Repo-relative path of the adjudication document. */
  readonly source: string;
  /** ISO date the verdict was recorded. */
  readonly date: string;
}

/**
 * The seeded ledger — 2026-06 Adam+Eve adjudication rounds (8 → 0 genuine).
 * Append-only by convention; entries are corrected, never silently removed.
 *
 * @public
 */
export const ADJUDICATIONS: readonly CandidateAdjudication[] = [
  // …8 entries per the seed table, using Task-0-resolved names…
];

const BY_ID: ReadonlyMap<string, CandidateAdjudication> = new Map(
  ADJUDICATIONS.map((a) => [a.id, a]),
);

/** Look up the verdict for an identification, order-insensitive. @public */
export function adjudicationFor(
  a: string,
  b: string,
): CandidateAdjudication | undefined {
  return BY_ID.get(candidateId(a, b));
}
```

- [ ] **Step 4: Run tests, typecheck**

Run: `npx vitest run tests/composition/adjudication-registry.test.ts tests/composition/adjudication-id.test.ts`
Expected: PASS. Then both `tsc` gates.

- [ ] **Step 5: Commit**

```bash
git add src/composition/adjudication.ts tests/composition/adjudication-registry.test.ts
git commit -m "feat(composition): adjudication registry seeded with the 8 reviewed verdicts"
```

---

### Task 3: `upt discover` annotates and folds adjudicated candidates

**Files:**
- Modify: `src/composition/adjudication.ts` (add `annotateAdjudications`)
- Modify: `src/cli-api.ts` (export the new symbols)
- Modify: `src/cli/commands/discover.ts` (+ `_discovery-opts.ts` only if the flag belongs in the shared opts)
- Modify: the discover goldens enumerated in Task 0
- Test: `tests/composition/adjudication-annotate.test.ts`, plus golden/json-contract updates

**Interfaces:**
- Consumes: `VettedCandidate` (discovery.ts:73), `adjudicationFor` (Task 2).
- Produces: `AnnotatedCandidate = VettedCandidate & { readonly adjudication?: CandidateAdjudication }`, `annotateAdjudications(cands: readonly VettedCandidate[]): readonly AnnotatedCandidate[]`.

**Behavior (text output):**
- Fold-out rule is PER VERDICT (vet r1: 'deferred' was underspecified): only
  `decoy` and `entailed` fold out of the PROMISING list; `deferred` and
  `genuine` candidates STAY listed, each with a `[adjudicated: <verdict> —
  <grounds>]` trailer (a genuine verdict is news, not noise).
- The funnel line keeps reporting raw funnel verdicts (12 promising); the
  summary line RECONCILES explicitly so the counts never look inconsistent
  (vet r1, Eve #4), e.g.:
  `  adjudicated: 3 of the 12 promising carry recorded verdicts (3 decoy) — folded; --show-adjudicated to list`
  (exact wording fixed by the golden; singular/plural handled).
- `--show-adjudicated` prints the folded candidates in their usual block with the same `[adjudicated: …]` trailer line.
- Verdicts are re-openable only by editing the registry (a human act, own commit); the always-printed summary line keeps folded candidates visible so default suppression cannot silently bury a candidate.
- `--json` (additive, non-breaking): each candidate object gains an optional `adjudication` field; the envelope's `result` gains `adjudicationSummary: { total, genuine, decoy, entailed, deferred }`.
- Candidates with NO recorded verdict are byte-identical to today.
- **Firewall:** `rankDiscoveries` untouched; annotation happens in the command layer via `ctx.api.annotateAdjudications`.

- [ ] **Step 1: Write the failing library test** — `annotateAdjudications` attaches the verdict to a synthetic `VettedCandidate` whose `a`/`b` match a seeded pair, and leaves an unadjudicated candidate untouched (strict deep-equal). Use a hand-built minimal `VettedCandidate` literal (copy the field list from discovery.ts:73-141 — all fields are required; there are 17).
- [ ] **Step 2: RED** — `npx vitest run tests/composition/adjudication-annotate.test.ts`.
- [ ] **Step 3: Implement `annotateAdjudications`** (pure map; no sorting change).
- [ ] **Step 4: GREEN**, both tsc gates.
- [ ] **Step 5: Wire the CLI.** Add `--show-adjudicated` (`valueStyle: 'none'`) to discover's FlagSpec. Extend `src/cli-api.ts` with `annotateAdjudications`, `ADJUDICATIONS`, `adjudicationFor`, `candidateId`, and the two types. Command logic: annotate after ranking; partition; render per Behavior above. Follow the error-conversion and `ctx.out` conventions already in the file.
- [ ] **Step 6: Re-pin goldens.** For each Task-0-enumerated discover golden: recapture per `tests/cli/golden-capture.mjs`; diff MUST show only the new summary line (and `--show-adjudicated` cases if a new golden is added — add one). Add a `--json` contract assertion for `adjudicationSummary` in `tests/cli/json-contract.test.ts`.
- [ ] **Step 7: Scoped runs**

Run: `npx vitest run tests/composition/adjudication-annotate.test.ts tests/cli/`
Expected: PASS (all CLI harnesses green with re-pinned goldens).

- [ ] **Step 8: Commit**

```bash
git add src/composition/adjudication.ts src/cli-api.ts src/cli/commands/discover.ts tests/
git commit -m "feat(cli): discover folds adjudicated candidates behind --show-adjudicated"
```

---

### Task 4: Calibration benchmark (the gate for all future funnel changes)

**Files:**
- Test: `tests/composition/discovery-calibration.test.ts`

No src changes. The benchmark is four pinned invariants; each carries a comment stating that a change here requires justification in the commit message.

- [ ] **Step 1: Write the benchmark (it should pass immediately — it pins HEAD behavior; "failing first" here means: deliberately break one expected count, watch it fail, restore)**

```ts
// tests/composition/discovery-calibration.test.ts
//
// CALIBRATION BENCHMARK — the regression gate for every funnel change.
// (1) canonical-only self-consistency, (2) HEAD funnel counts,
// (3) adjudicated decoys never resurface unannotated, (4) seed integrity.
// A diff in these pins is a MEASURED funnel change: justify it in the
// commit message and update docs/research/discovery-precision-calibration.md.
import { describe, it, expect } from 'vitest';
import { rankDiscoveries } from '../../src/composition/discovery.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import {
  ADJUDICATIONS,
  annotateAdjudications,
} from '../../src/composition/adjudication.js';

const count = (cands: readonly { verdict: string }[], v: string) =>
  cands.filter((c) => c.verdict === v).length;

describe('discovery calibration benchmark', () => {
  it('canonical-only funnel is self-consistent (contradictory = 0)', () => {
    const cands = rankDiscoveries(CANONICAL_GRAPH);
    expect(count(cands, 'contradictory')).toBe(0);
  });

  // ── THE PINNED COUNTS ────────────────────────────────────────────────
  // Deliberate trade (vet r1, Adam #7 / Eve #5): exact pins DO break on
  // legitimate catalog edits — that is the point. A funnel-count change is a
  // MEASURED behavior change; update this ONE block in the same commit and
  // say why in the commit message. Fill from Task 0's measurement.
  const EXPECTED = {
    catalog: { total: 132, promising: 12, inert: 100, clash: 20, contradictory: 0 },
  };

  it('catalog funnel counts are pinned at HEAD', () => {
    const cands = rankDiscoveries(CATALOG_GRAPH);
    expect(cands.length).toBe(EXPECTED.catalog.total);
    expect(count(cands, 'promising')).toBe(EXPECTED.catalog.promising);
    expect(count(cands, 'inert')).toBe(EXPECTED.catalog.inert);
    expect(count(cands, 'magnitude-clash')).toBe(EXPECTED.catalog.clash);
    expect(count(cands, 'contradictory')).toBe(EXPECTED.catalog.contradictory);
  });

  it('adjudicated decoys never surface as unannotated promising', () => {
    // Guards the WIRING, not the physics (vet r1, Adam's tautology probe):
    // this fails when id construction or name resolution drifts so a seeded
    // pair surfaces as promising without its annotation attaching. The
    // combined graph is used deliberately — the widest candidate surface —
    // independent of what the CLI's default --source is (that is a UX
    // decision; this is a library invariant).
    const both = [...CATALOG_GRAPH, ...CANONICAL_GRAPH];
    const annotated = annotateAdjudications(rankDiscoveries(both));
    const escaped = annotated.filter(
      (c) =>
        c.verdict === 'promising' &&
        c.adjudication === undefined &&
        ADJUDICATIONS.some((a) => a.id === `${[c.a, c.b].sort().join('~')}`),
    );
    expect(escaped).toEqual([]);
  });

  it('seed pairs resolve against the live graph or say why not', () => {
    // Guards silent name drift: every adjudication either names two live
    // quantities, or its grounds explain the unresolved doc-name.
    const live = new Set(
      [...CATALOG_GRAPH, ...CANONICAL_GRAPH].flatMap((e) => [
        e.target.name,
        ...e.sources.map((s) => s.name),
      ]),
    );
    for (const a of ADJUDICATIONS) {
      const [lo, hi] = a.id.split('~');
      const resolved = live.has(lo) && live.has(hi);
      if (!resolved) expect(a.grounds).toMatch(/doc name|not currently surfaced/iu);
    }
  });
});
```

(Edge-shape note: confirm `BridgeEdge`'s target/sources field names in `src/composition/edge.ts` during implementation — mirror however `discovery.ts` walks edges rather than assuming this snippet's field names. Also verify `rankDiscoveries(graph)` accepts an edge array vs an options object; conform to `discover.ts`'s actual call.)

- [ ] **Step 2: Break-then-restore RED check** — temporarily set one pinned count wrong, run, watch it fail, restore.

Run: `npx vitest run tests/composition/discovery-calibration.test.ts`
Expected: PASS after restore.

- [ ] **Step 3: Commit**

```bash
git add tests/composition/discovery-calibration.test.ts
git commit -m "test(composition): discovery calibration benchmark (funnel pins + decoy no-resurface)"
```

---

### Task 5: Docs, CHANGELOG, release gate

**Files:**
- Modify: `cli/README.md` (discover section: `--show-adjudicated`, the summary line, the `--json` additions)
- Modify: `docs/research/discovery-precision-calibration.md` (append a short dated section: verdicts now live in `src/composition/adjudication.ts`; the benchmark file is the standing gate)
- Modify: `CHANGELOG.md` (`[Unreleased]` → Added: adjudication ledger + benchmark; Changed: discover folds adjudicated candidates)
- Modify: `todo.md` (flip the Phase-1 queue entry; queue Phase 2)

**Actions:**
- [ ] Docs edits above (step-12 check: run `npm run docs:deps` and confirm the new module lands in the reports; never hand-edit generated reports).
- [ ] Release gate: `npm run build && npm test && npm run smoke` (the ONE full-suite run), plus `npm audit` + `npm outdated` per release pre-flight.
- [ ] Commit: `git commit -m "docs: adjudication ledger + calibration benchmark recorded (phase 1 wrap)"`
- [ ] Push master. **Release ritual (user-triggered per convention):** bump to 0.31.0 → CHANGELOG header → tag `v0.31.0` → push tag → `npm publish --ignore-scripts --access public` (the owner runs publish).

---

## Subagent dispatch notes (for the executing controller)

- One implementer per task, fresh context; task briefs via `scripts/task-brief`; review packages via `scripts/review-package BASE HEAD` with BASE recorded before dispatch.
- Model tiers: Tasks 1–2 are cheap-tier (complete code above); Task 3 is standard-tier (CLI integration + golden re-pin judgment); Task 4 standard-tier; Task 5 cheap-tier. Final whole-branch review on the most capable model.
- Reviewer constraint blocks must carry, verbatim: the epistemic-firewall constraint, the `rankDiscoveries`-unchanged constraint, and the goldens-in-same-commit rule.
- Progress ledger: `.superpowers/sdd/progress.md` (append per completed task).

## Adversarial review record (r1 → r2, 2026-07-02)

Adam (gemini-2.5-pro) **YELLOW** · Eve (o3) **YELLOW**. Folded: `candidateId`
slug guard + rename-updates-ledger-in-same-commit convention (both reviewers'
top finding); ledger-adjudicates-the-identification semantics (Adam #2);
per-verdict fold-out rule — `deferred`/`genuine` stay listed (Adam #6, Eve #3);
funnel-line reconciliation wording (Eve #4); pins consolidated into one
`EXPECTED` block with an update protocol (Adam #7, Eve #5); wiring-not-physics
comment on the no-resurface test (Adam's tautology probe); `rejected.ts`
relationship + π-search bounds + σ-gate caveat added to the program design.
Rejected with grounds: Adam #1 "combined-graph contradiction" (deliberate
widest-surface library invariant, now documented in-test); Eve #7a/#7b ordering
swaps (P1 already lands in Phase 2; P4 already follows P5's phase).

## Self-review record (writing-plans checklist)

- Spec coverage: P9 fully covered (ledger, seeding, annotation, benchmark, docs). ✓
- Placeholders: seed-table names deliberately deferred to Task 0 measurement — that is a verification gate, not a TBD; everything else is complete code. ✓
- Type consistency: `candidateId`/`CandidateAdjudication`/`annotateAdjudications` used identically across Tasks 1–4. ✓
- Known uncertainty (flagged, not smoothed): exact live-graph names for the 8 pairs; `BridgeEdge` field names in the benchmark's quantity walk; `rankDiscoveries`' parameter shape. All three are pinned to Task 0 / implementation-time verification with explicit instructions.
