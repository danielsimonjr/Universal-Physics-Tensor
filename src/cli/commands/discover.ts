/**
 * `upt discover` — vet the link candidates through the inference suite, and
 * (with `--derive`) emit the algebraic identity-consequence proposals.
 * Transposed verbatim from bin/upt.mjs's `parseDiscoveryOpts()`/`discoverCmd()`/
 * `deriveCmd()` (lines 592-713), plus `--json`. `parseDiscoveryOpts` itself
 * moved to `_discovery-opts.ts` so `map`'s `--proposed` overlay can share it.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph, groundTruthAnchor, groundTruthLine } from '../graphs.js';
import { emitJson } from '../output.js';
import { parseDiscoveryOpts } from './_discovery-opts.js';
import type { VettedCandidate } from '../../composition/discovery.js';
import type { AnnotatedCandidate, AdjudicationVerdict } from '../../composition/adjudication.js';
import type { ConsequenceSignal, ConsequenceEvidence } from '../../composition/consequence.js';

/** `annotated` (adjudication layer) composed with the consequence layer —
 *  both are `VettedCandidate & {...}` intersections, so a candidate carries
 *  both `adjudication?` and `consequence?` after composition. */
type FullyAnnotatedCandidate = AnnotatedCandidate & {
  readonly consequence?: {
    readonly signal: ConsequenceSignal;
    readonly evidence: readonly ConsequenceEvidence[];
  };
};

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--max-orders', valueStyle: 'attached' },
  { name: '--anchor', valueStyle: 'attached', repeatable: true },
  { name: '--derive', valueStyle: 'none' },
  { name: '--show-adjudicated', valueStyle: 'none' },
  { name: '--require-falsifier', valueStyle: 'none' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt discover [--source=catalog|canonical|both]
        VET the link candidates through the inference suite: hypothesise
        each identification a≡b and test whether it merges disconnected
        physics, unlocks quantities, and stays numerically consistent.
        Ranks promising / inert / contradictory.
        --source=canonical runs the funnel on the standard-physics L-layer
        ALONE (bridges excluded) — new candidates from established physics,
        and a self-consistency check (expect 0 contradictory).
        --derive emits, for each 'promising' identification, the ONE algebraic
        relation it implies (monomial elimination) as an UNADJUDICATED, math-only
        proposal — NOT a bridge (Part-VI §XXVII-B). Pairs with --source=canonical.
        --max-orders=N tunes the magnitude-clash threshold (default 3); looser N
        keeps more candidates 'promising', tighter N falsifies more as clashes.
        --anchor=k=v[,k2=v2] overrides the numeric anchor (default mass=M_sun)
        for the consistency/closure check. Both reshape the candidate pool that
        --derive consumes.
        Candidates a physicist has already adjudicated (docs/research/*-adjudication.md)
        fold out of the PROMISING list by default (decoy/entailed verdicts only —
        review memory, not a re-litigation prompt); --show-adjudicated lists them
        again with their recorded verdict.
        Each PROMISING row states its readiness dimension by dimension —
        structure, kind, which independent falsifiers (magnitude, axis,
        consequence) ran and survived or abstained — and what would make it
        testable: the identity premise, the missing magnitudes and regimes,
        and the observation that would test it. An abstention is a missing
        test, never a pass. --require-falsifier hides promising rows that no
        independent falsifier ran on and survived, counts them, and lists the
        encoded bridges that already carry a falsifier (a confrontation, a
        counterexample, or a regime inequality).`;

const EPISTEMICS =
  '⚠ a REVIEW SURFACE: `promising` means "worth a physicist\'s minute", not "true".\n' +
  '  Each candidate hypothesises an identification a≡b and tests its consequences.';

const DERIVE_EPISTEMICS =
  '⚠ Each is the ALGEBRAIC CONSEQUENCE of an unadjudicated identification — NOT a new\n' +
  '  relation and NOT a bridge. No mechanism asserted. Promotion to the catalog needs\n' +
  '  adversarial + literature review (Part-VI §XXVII-B). The enumerator proposes; humans dispose.';

// ── discover --derive (identity-consequence proposals) ────────────────────

/**
 * Sample values for GENERIC quantities, which the representative-value table
 * leaves out on purpose. A proposal is evaluated only when every free input
 * has a sourced sample: this command once put 300 into every input, a Hubble
 * rate of 300 s⁻¹ among them (persona finding D5).
 */
const GENERIC_SAMPLES: Readonly<Record<string, { value: number; source: string }>> = {
  temperature: { value: 300, source: 'room temperature, 300 K' },
};
function deriveReport(
  api: CommandCtx['api'],
  ranked: readonly VettedCandidate[],
  label: string,
  anchorLine: string,
  out: (line?: string) => void
): void {
  const proposals = api.deriveProposedBridges(ranked);
  out(`\nDerived identity-consequence PROPOSALS — UNADJUDICATED, math-only  [source: ${label}]`);
  out(`  ${anchorLine}`);
  out(DERIVE_EPISTEMICS + '\n');
  if (!proposals.length) {
    out('  no admissible proposal (need two fully-quantitative, monomial canonical targets).');
    return;
  }
  for (const p of proposals) {
    let approx = '';
    const governing = p.governing || [];
    const sampleOf = (name: string) => api.REPRESENTATIVE_VALUES[name] ?? GENERIC_SAMPLES[name];
    const missing = governing.filter((g) => sampleOf(g.name) === undefined).map((g) => g.name);
    if (missing.length > 0) {
      approx = `  (no sourced sample value for ${missing.join(', ')}; not evaluated)`;
    } else {
      try {
        const vals = Object.fromEntries(governing.map((g) => [g.name, sampleOf(g.name)!.value]));
        const at = governing
          .map((g) => `${g.name}=${sampleOf(g.name)!.value} [${sampleOf(g.name)!.source}]`)
          .join(', ');
        approx = `  ≈ ${p.evaluate(vals).toExponential(2)}${at ? ` (${at})` : ''}`;
      } catch {
        approx = '';
      }
    }
    out(`  ${p.id}`);
    out(`      ${p.formulaLatex}      ${p.dimensionalSignature}${approx}`);
    out(
      `      from: ${p.derivedFrom.identification.a} ≟ ${p.derivedFrom.identification.b}` +
        `  (${p.derivedFrom.sourceEquationIds[0]} = ${p.derivedFrom.sourceEquationIds[1]}); solved for ${p.derivedFrom.solvedFor}`
    );
    if (p.alsoDerivableFrom && p.alsoDerivableFrom.length) {
      out(`      also derivable from: ${p.alsoDerivableFrom.join('; ')}`);
    }
    const c = api.describeDerivedClaim(p);
    out(
      c.relation === 'known-law'
        ? `      status: known law — re-derives ${c.canonicalMatch.id}; the identification ${c.premise} is still unadjudicated`
        : `      status: conditional identity — holds only if ${c.premise} (unadjudicated); untested`,
    );
    out(`      meaning: ${c.symbol.meaning}`);
    out(
      `      assumptions carried: ${c.assumptions.map((a) => `${a.equation}: ${a.assumptions.join(', ') || 'none stated'}`).join('; ')}`,
    );
    const governingSet = `{${p.governing.map((g) => g.name).join(', ')}}`;
    out(
      `      canonical match: ${c.canonicalMatch.id ?? 'none'} — ${c.canonicalMatch.sameTarget} registry equation(s) target ` +
        `${p.target.name}, ${c.canonicalMatch.sameTargetAndGoverning} with governing ${governingSet}; ` +
        'scope: this registry only, not physics at large',
    );
  }
  out('');
}

/** Verdicts that fold a candidate out of the printed PROMISING list by
 *  default — review memory, not news. `deferred`/`genuine` stay listed
 *  (see the module-level docstring on `AdjudicationVerdict`). */
function foldsOut(verdict: AdjudicationVerdict): boolean {
  return verdict === 'decoy' || verdict === 'entailed';
}

/** Tally an annotated candidate set's recorded verdicts, for `--json`'s
 *  `adjudicationSummary` (over ALL candidates, every funnel bucket). */
function summarizeAdjudications(
  candidates: readonly AnnotatedCandidate[]
): { total: number; genuine: number; decoy: number; entailed: number; deferred: number } {
  const summary = { total: 0, genuine: 0, decoy: 0, entailed: 0, deferred: 0 };
  for (const c of candidates) {
    if (!c.adjudication) continue;
    summary.total++;
    summary[c.adjudication.verdict]++;
  }
  return summary;
}

/** The reconciling line printed under PROMISING when some of it carries a
 *  recorded verdict — so the folded/shorter list never looks inconsistent
 *  against the funnel line's raw promising count. */
function adjudicationSummaryLine(promising: readonly AnnotatedCandidate[], promisingCount: number): string {
  const adjudicated = promising.filter((r) => r.adjudication);
  const counts = { genuine: 0, decoy: 0, entailed: 0, deferred: 0 };
  let folded = 0;
  for (const r of adjudicated) {
    const v = r.adjudication!.verdict;
    counts[v]++;
    if (foldsOut(v)) folded++;
  }
  const parts = (['decoy', 'entailed', 'deferred', 'genuine'] as const)
    .filter((v) => counts[v] > 0)
    .map((v) => `${counts[v]} ${v}`);
  const total = adjudicated.length;
  const verb = total === 1 ? 'carries' : 'carry';
  const noun = total === 1 ? 'a recorded verdict' : 'recorded verdicts';
  const foldNote = folded === total ? '— folded' : folded === 0 ? '— shown below' : `— ${folded} folded`;
  return `  adjudicated: ${total} of the ${promisingCount} promising ${verb} ${noun} (${parts.join(', ')}) ${foldNote}; --show-adjudicated to list`;
}

interface Readiness {
  promising: number;
  mechanismTested: number;
  dataTested: number;
  withoutMagnitudeEvidence: number;
  axisUnresolved: number;
  entailedConsequence: number;
}

/** How far the `promising` set is from evidence, counted from candidate fields. */
/** Encoded bridges that already carry a falsifier. Not discovery rows. */
function encodedFalsifiers(api: CommandCtx['api']): readonly string[] {
  const lines: string[] = [];
  for (const id of [...api.CONFRONTATIONS.keys()].sort((a, b) => a - b)) {
    lines.push(`be-${id} (confrontation)`);
  }
  for (const f of api.ATLAS_FAMILIES) {
    for (const b of f.bridges) {
      const cx = b.counterexamples.length;
      const ineq = b.regime.inequalities.length;
      if (cx === 0 && ineq === 0) continue;
      const bits = [
        cx > 0 ? `${cx} counterexample${cx === 1 ? '' : 's'}` : '',
        ineq > 0 ? `${ineq} regime inequalit${ineq === 1 ? 'y' : 'ies'}` : '',
      ].filter((s) => s !== '');
      lines.push(`${b.id} (${bits.join(', ')})`);
    }
  }
  return lines;
}

function readinessOf(api: CommandCtx['api'], candidates: readonly FullyAnnotatedCandidate[]): Readiness {
  const p = candidates.filter((c) => c.verdict === 'promising');
  const g = p.map((c) => api.describeGrounding(c, c.consequence?.signal));
  return {
    promising: p.length,
    mechanismTested: g.filter((x) => x.mechanismTested).length,
    dataTested: g.filter((x) => x.dataTested).length,
    withoutMagnitudeEvidence: p.filter((c) => !c.magnitudeChecked || c.magnitudeAnchorInvariant === true).length,
    axisUnresolved: p.filter((c) => !c.axisChecked).length,
    entailedConsequence: p.filter((c) => c.consequence?.signal === 'entailed').length,
  };
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, label, source } = resolveGraph(api, args.flags);
  const opts = parseDiscoveryOpts(args.flags);
  const anchor = groundTruthAnchor(api, opts);
  const ranked = api.rankDiscoveries(graph, opts);
  const isDerive = args.flags.has('derive');
  const annotated = isDerive ? ([] as AnnotatedCandidate[]) : api.annotateAdjudications(ranked);
  const withConsequence: readonly FullyAnnotatedCandidate[] = isDerive
    ? []
    : api.annotateConsequences(annotated);
  const showAdjudicated = args.flags.has('show-adjudicated');

  if (args.flags.has('json')) {
    const requireFalsifier = args.flags.has('require-falsifier');
    const mapped = isDerive
      ? api.deriveProposedBridges(ranked).map((p) => ({ ...p, claim: api.describeDerivedClaim(p) }))
      : withConsequence.map((c) => ({
          ...c,
          grounding: api.describeGrounding(c, c.consequence?.signal),
          readiness: api.describeReadiness(c, c.consequence?.signal),
        }));
    const result =
      requireFalsifier && !isDerive
        ? mapped.filter(
            (c) =>
              !('readiness' in c) ||
              c.verdict !== 'promising' ||
              c.readiness.falsifiers.survived.length > 0,
          )
        : mapped;
    const envelope = {
      command: 'discover',
      source,
      anchor: { groundTruth: anchor },
      options: opts as Record<string, unknown>,
      epistemics: isDerive ? DERIVE_EPISTEMICS : EPISTEMICS,
      result,
      ...(requireFalsifier && !isDerive ? { encodedFalsifiers: encodedFalsifiers(api) } : {}),
      ...(isDerive
        ? {}
        : {
            readiness: readinessOf(api, withConsequence),
            adjudicationSummary: summarizeAdjudications(withConsequence),
          }),
    };
    emitJson(envelope, ctx.write);
    return 0;
  }

  if (Object.keys(opts).length) {
    const bits: string[] = [];
    if (opts.maxOrdersOfMagnitude !== undefined) bits.push(`max-orders=${opts.maxOrdersOfMagnitude}`);
    if (opts.groundTruth) {
      bits.push(`anchor={${Object.entries(opts.groundTruth).map(([k, v]) => `${k}=${v}`).join(', ')}}`);
    }
    out(`  [discovery options: ${bits.join('; ')}]`);
  }

  if (isDerive) {
    deriveReport(api, ranked, label, groundTruthLine(anchor), out);
    return 0;
  }

  const by = (v: string) => withConsequence.filter((r) => r.verdict === v);
  // Q1: within PROMISING, spend the physicist's first minute on consequence-
  // bearing / magnitude-backed rows before inconclusive + no-magnitude coincidences.
  const consRank = (s: ConsequenceSignal | undefined): number =>
    s === 'entailed' ? 0 : s === 'novel-consequence' ? 1 : 2;
  const promising = [...by('promising')].sort((a, b) => {
    const ca = consRank(a.consequence?.signal);
    const cb = consRank(b.consequence?.signal);
    if (ca !== cb) return ca - cb;
    const magA = a.magnitudeChecked && a.magnitudeAnchorInvariant !== true ? 0 : 1;
    const magB = b.magnitudeChecked && b.magnitudeAnchorInvariant !== true ? 0 : 1;
    if (magA !== magB) return magA - magB;
    return b.score - a.score || a.a.localeCompare(b.a) || a.b.localeCompare(b.b);
  });
  const inert = by('inert');
  const contra = by('contradictory');
  const clash = by('magnitude-clash');
  const axisClash = by('axis-clash');
  out(`\nDiscovery — link candidates VETTED through the inference suite  [source: ${label}]`);
  out(`  ${groundTruthLine(anchor)}`);
  out('⚠ a REVIEW SURFACE: `promising` means "worth a physicist\'s minute", not "true".');
  out('  Each candidate hypothesises an identification a≡b and tests its consequences.\n');
  out(
    `  funnel:  ${withConsequence.length} candidates  →  ${promising.length} promising  ` +
      `·  ${inert.length} inert  ·  ${clash.length} magnitude-clash  ` +
      `·  ${contra.length} contradictory (numerically falsified)  ·  ${axisClash.length} axis-clash`
  );
  const rd = readinessOf(api, withConsequence);
  out(
    `  readiness of the ${rd.promising} promising: ${rd.mechanismTested} mechanism-tested · ` +
      `${rd.dataTested} data-tested · ${rd.withoutMagnitudeEvidence} without magnitude evidence · ` +
      `${rd.axisUnresolved} with axis unresolved · ${rd.entailedConsequence} with an entailed consequence`,
  );
  out('  promising ≠ evidence: promotion to a bridge needs a mechanism and a falsifiable prediction.\n');
  const requireFalsifier = args.flags.has('require-falsifier');
  const untested = (r: FullyAnnotatedCandidate) =>
    api.describeReadiness(r, r.consequence?.signal).falsifiers.survived.length === 0;
  if (requireFalsifier) {
    out(
      `  --require-falsifier: ${promising.filter(untested).length} of the ${promising.length} promising hidden — ` +
        'no independent falsifier ran and survived (connectivity alone is not evidence)\n',
    );
    const encoded = encodedFalsifiers(api);
    out(`  encoded falsifiers already on the records (${encoded.length}; these are not discovery rows):`);
    for (const line of encoded) out(`    ${line}`);
    out('');
  }
  if (promising.length) {
    out('  PROMISING (merges disconnected physics, unlocks quantities, stays consistent):');
    for (const r of promising) {
      if (r.adjudication && foldsOut(r.adjudication.verdict) && !showAdjudicated) continue;
      if (requireFalsifier && untested(r)) continue;
      out(`    ${(r.a + ' ≟ ' + r.b).padEnd(52)} [${r.dim}]  score ${r.score}`);
      out(`        unlocks: ${r.unlocksFromAnchor.join(', ') || '—'}`);
      if (r.consequence) {
        out(`        [consequence: ${r.consequence.signal}]`);
      }
      const g = api.describeGrounding(r, r.consequence?.signal);
      out(
        `        [grounding — passed: ${g.passed.join(', ') || '—'}` +
          ` · gaps: ${g.gaps.join(', ') || '—'} · ceiling: no mechanism/data test]`,
      );
      const rd = api.describeReadiness(r, r.consequence?.signal);
      const f = rd.falsifiers;
      out(
        `        [readiness — structure: ${rd.structure.mergesComponents ? 'merges components' : 'no merge'}, ` +
          `unlocks ${rd.structure.unlocks} · kind: ${rd.kind} · independent falsifiers survived: ` +
          `${f.survived.join(', ') || 'none'}${f.abstained.length ? ` (abstained: ${f.abstained.join(', ')})` : ''}` +
          ' · mechanism: none · data: none]',
      );
      const needs = [
        ...(rd.needs.magnitudeFor.length ? [`needs a representative magnitude for: ${rd.needs.magnitudeFor.join(', ')}`] : []),
        ...rd.needs.regimeFor.map((u) => `needs a stated ${u.axis} regime for: ${u.endpoints.join(', ')}`),
        ...(rd.needs.derivableConsequence ? ['needs a consequence that re-derives a known law'] : []),
      ];
      out(`        [to make it testable — premise: ${rd.needs.premise}${needs.map((n) => ` · ${n}`).join('')}]`);
      out(`        [observation: ${rd.observation}]`);
      if (r.adjudication) {
        out(`        [adjudicated: ${r.adjudication.verdict} — ${r.adjudication.grounds}]`);
      }
    }
    if (promising.some((r) => r.adjudication)) {
      out(adjudicationSummaryLine(promising, promising.length));
    }
  } else {
    out('  no candidate is `promising` from the default {mass} anchor.');
  }
  if (clash.length) {
    out(`\n  MAGNITUDE-CLASH (representative values differ by > N orders — a falsifier):`);
    for (const r of clash) {
      const basis = r.magnitudeUsedAnchor ? '  (anchor-derived)' : '';
      out(`    ${(r.a + ' ≟ ' + r.b).padEnd(52)} ~${r.ordersApart!.toFixed(1)} orders apart${basis}`);
    }
  }
  const subsumed = inert.filter((r) => r.subsuming);
  if (subsumed.length) {
    out(`\n  SUBSUMING (generic ≟ specialization — tautological, barred from promising):`);
    for (const r of subsumed) {
      out(`    ${(r.a + ' ≟ ' + r.b).padEnd(52)} [${r.dim}]`);
    }
  }
  if (contra.length) {
    out(`\n  CONTRADICTORY (the identification falsifies itself numerically):`);
    for (const r of contra) {
      out(`    ${(r.a + ' ≟ ' + r.b).padEnd(52)} disagreeing node(s): ${r.inconsistentNodes.join(', ')}`);
    }
  }
  if (axisClash.length) {
    out(`\n  AXIS-CLASH (stated scale/force labels differ: a regime-label prior, not a physical test):`);
    for (const r of axisClash) {
      out(`    ${(r.a + ' ≟ ' + r.b).padEnd(52)} ${r.axisClashes.join('; ')}`);
    }
  }
  out('\n  (magnitude gate abstains where a representative value is unknown; weak priors on dimension.)');
  out(`  (inspect one candidate: upt ground --source=${source} <a> <b>, with the same --anchor/--max-orders)`);
  return 0;
}

export const command: Command = {
  name: 'discover',
  aliases: ['discovery'],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
