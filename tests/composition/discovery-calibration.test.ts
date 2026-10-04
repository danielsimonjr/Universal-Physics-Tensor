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
  // say why in the commit message.
  //
  // 2026-07-02 update (Task 3, D1 axis gate lands): promising 12 → 7, inert
  // 100 → 35, magnitude-clash unchanged at 20, contradictory unchanged at 0,
  // axis-clash (new bucket) → 70. The delta cross-validates EXACTLY against
  // Task 2 Step 5's Option-A would-clash re-measurement
  // (.superpowers/sdd/phase2/task-2-report.md): 80 catalog pairs would-clash
  // on axis (70 surface as `axis-clash`; the other 10 are shadowed by
  // magnitude-clash's higher verdict precedence — confirmed by direct
  // inspection of `axisClashes` on every magnitude-clash-verdict candidate,
  // which stays populated regardless of which falsifier wins), and exactly
  // the predicted 5-of-12 promising→axis-clash flip (pinned below,
  // machine-readable).
  // 2026-10-02: proved-seed edges on the catalog graph. total 132 → 152,
  // promising 7 → 10, inert 35 → 46, axis-clash 70 → 76. magnitude-clash
  // stays 20. The would-clash sum is 86 = 76 axis-clash + 10 still shadowed.
  // 2026-10-03: BE-66, BE-67, and BE-68 on the catalog graph. total 152 → 166,
  // axis-clash 76 → 90. promising stays 10, inert stays 46, magnitude-clash
  // stays 20. The would-clash sum is 100 = 90 axis-clash + 10 still shadowed.
  // 2026-10-04: BE-69 through BE-73 on the catalog graph. total 166 → 191,
  // inert 46 → 48, axis-clash 90 → 113. promising stays 10, magnitude-clash
  // stays 20. The would-clash sum is 123 = 113 axis-clash + 10 still shadowed.
  const EXPECTED = {
    catalog: { total: 191, promising: 10, inert: 48, clash: 20, contradictory: 0, axisClash: 113 },
  };

  it('catalog funnel counts are pinned at HEAD', () => {
    const cands = rankDiscoveries(CATALOG_GRAPH);
    expect(cands.length).toBe(EXPECTED.catalog.total);
    expect(count(cands, 'promising')).toBe(EXPECTED.catalog.promising);
    expect(count(cands, 'inert')).toBe(EXPECTED.catalog.inert);
    expect(count(cands, 'magnitude-clash')).toBe(EXPECTED.catalog.clash);
    expect(count(cands, 'contradictory')).toBe(EXPECTED.catalog.contradictory);
    expect(count(cands, 'axis-clash')).toBe(EXPECTED.catalog.axisClash);
  });

  it('the 123 would-clash pairs decompose as 113 axis-clash verdicts + 10 shadowed by magnitude-clash', () => {
    const cands = rankDiscoveries(CATALOG_GRAPH);
    // `axisClashes` stays populated regardless of which falsifier wins, so
    // the shadowed pairs are exactly the magnitude-clash candidates whose
    // axis diagnostic is non-empty (verdict precedence: magnitude-clash
    // outranks axis-clash).
    const shadowed = cands.filter(
      (c) => c.verdict === 'magnitude-clash' && c.axisClashes.length > 0,
    );
    expect(count(cands, 'axis-clash') + shadowed.length).toBe(123);
    expect(shadowed.length).toBe(10);
  });

  // ── D1 axis gate: machine-readable flipped-pair pin (Eve r3 #6) ────────
  // The exact catalog candidates the audited-attribute gate moves OUT of
  // `promising` into `axis-clash` — a later drift fails fast here, not in an
  // appendix. Cross-validated pair-for-pair against Task 2 Step 5's
  // prediction; sorted `a~b` candidate-id style (matches this file's
  // `ADJUDICATIONS` id convention below).
  const CATALOG_PROMISING_TO_AXIS_CLASH = [
    'boundary-length~schwarzschild-radius',
    'coarsening-length~schwarzschild-radius',
    'coarsening-length~thermal-wavelength',
    'grw-localization-rate~hubble-rate',
    'grw-localization-rate~mutation-rate',
  ];

  it('catalog PROMISING→AXIS-CLASH flip list matches the audited-gate prediction exactly', () => {
    const cands = rankDiscoveries(CATALOG_GRAPH);
    const byId = new Map(cands.map((c) => [[c.a, c.b].sort().join('~'), c]));
    for (const id of CATALOG_PROMISING_TO_AXIS_CLASH) {
      const c = byId.get(id);
      expect(c, `missing candidate ${id}`).toBeDefined();
      expect(c!.verdict, `${id} verdict`).toBe('axis-clash');
    }
    // mass≟scalar-field-{reference,value} are the PRE-AUDIT collateral flips
    // (Task 0 §4, `mass`'s now-stripped generic tag) that the audit's
    // generic-strip REVERSES via abstention — they must stay promising, not
    // join the flip list above (Task 2 Step 5, confirmed on both sources).
    expect(byId.get('mass~scalar-field-reference')!.verdict).toBe('promising');
    expect(byId.get('mass~scalar-field-value')!.verdict).toBe('promising');
  });

  // ── Canonical-only invariant (D6, Adam #5 + Eve #5) ─────────────────────
  // The design states this "holds by construction" under Option-A
  // registry-only resolution, since canonical-only candidate names are
  // mostly bare non-registry symbols the resolver can never find attributes
  // for. MEASURED correction (Task 3): it does not hold universally — one
  // canonical-graph candidate pair, `semi-major-axis ≟ planck-length`, has
  // BOTH endpoints as actual centralized registry `Quantity` nodes (not bare
  // canonical variables) that also happen to be governing variables of a
  // canonical equation, so the registry-only resolver finds real,
  // genuinely-disagreeing `scale` attributes (`classical` vs `quantum`) even
  // on the canonical-only graph. This pin is scoped "for the current audit"
  // (Adam #5 + Eve #5 protocol): any future tag change that moves this count
  // must either fix the tag or consciously update this pin with a
  // rationale, same update protocol as the catalog counts above.
  it('canonical-only axis-clash count is pinned for the current audit', () => {
    const cands = rankDiscoveries(CANONICAL_GRAPH);
    expect(count(cands, 'axis-clash')).toBe(1);
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
