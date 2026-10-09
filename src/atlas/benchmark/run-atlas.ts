/**
 * Atlas Phase 5, S5.2 — the ATLAS condition of the invalid-bridge benchmark.
 *
 * Design note: `docs/planning/Atlas-Phase-5-Design.md` §6.
 *
 * For each item the runner applies three atlas instruments — the applicability
 * checker (S4.1), the composition table (S3) and the regime check (S2) — and
 * emits `accept`, `reject` or `abstain`.
 *
 * ## The decision rule, and why accept is the HARDEST outcome to reach
 *
 * - **reject** when an instrument DEMONSTRABLY fires: a blocking applicability
 *   finding, a chain OVERCLAIMED as an exact equivalence, a structural analogy
 *   promoted to an equivalence, or a regime inequality checked and violated.
 * - **accept** only when EVERY ENABLED instrument RAN and CLEARED: side conditions were
 *   stated, the applicability checker found nothing, the regime was supplied and
 *   every inequality was checked and held, and any claimed chain agrees with the
 *   table. At least one instrument must have RUN: an item that no enabled
 *   instrument applies to abstains, because nothing cleared it. S4.1 already fixed the principle: an empty finding list means "no rule
 *   fired", which is weaker than "valid". An item that leaves a check unrun has
 *   not been cleared by it.
 * - **abstain** otherwise. Abstention is a first-class outcome and is preferred
 *   to a wrong accept (ROADMAP Phase 5, pre-stated criteria).
 *
 * The failure kind a rejection names is a MAPPING from the rule that fired, and
 * it is only as good as that mapping: a dimensional inconsistency is reported as
 * `notation-collision` because that is its commonest cause, not because the rule
 * can see notation. The scorer grades "rejected" and "named the right kind"
 * separately, so an imperfect mapping costs the second score only.
 *
 * @module atlas/benchmark/run-atlas
 * @internal
 */

import { checkApplicability } from '../applicability.js';
import type { ApplicabilityFindingKind } from '../applicability.js';
import { composeRelation, NO_COMPOSITE_CLAIM } from '../composition-table.js';
import { regimeHolds } from '../regime.js';
import type { RelationType } from '../types.js';
import type { BenchmarkItem, FailureKind } from './types.js';

/** What the atlas condition concluded about one item. @internal */
export interface AtlasVerdict {
  readonly itemId: string;
  readonly outcome: 'accept' | 'reject' | 'abstain';
  /** Present on a reject when the rule that fired maps to a failure kind. */
  readonly detectedFailure?: FailureKind;
  /** Every reason, in rule order — including the unrun checks behind an abstention. */
  readonly reasons: readonly string[];
}

/**
 * Which instruments a run uses — the S6.2 ablation. The four named
 * configurations in {@link ABLATION_CONFIGS} are CUMULATIVE.
 *
 * @internal
 */
export interface AtlasRunConfig {
  /** The composition table over relation types. */
  readonly types: boolean;
  /** Side-condition rules: unguarded / zero divisors, squaring. */
  readonly assumptions: boolean;
  /** Dimensional consistency and convention agreement. */
  readonly dimensionsAndConventions: boolean;
  /** The regime check at the use site. */
  readonly regimes: boolean;
}

/** Every instrument on: the atlas condition as scored. @internal */
export const FULL_CONFIG: AtlasRunConfig = {
  types: true,
  assumptions: true,
  dimensionsAndConventions: true,
  regimes: true,
};

/** The four cumulative ablation configurations, in the plan's order. @internal */
export const ABLATION_CONFIGS: ReadonlyArray<readonly [string, AtlasRunConfig]> = [
  ['types only', { types: true, assumptions: false, dimensionsAndConventions: false, regimes: false }],
  ['+ assumptions', { types: true, assumptions: true, dimensionsAndConventions: false, regimes: false }],
  ['+ dimensions & conventions', { types: true, assumptions: true, dimensionsAndConventions: true, regimes: false }],
  ['+ regimes', FULL_CONFIG],
];

/**
 * The instrument each applicability finding belongs to.
 *
 * `model-incompatibility` has no entry: a benchmark item carries model IDS,
 * not model records with families, so this runner never passes `premises`
 * or `conclusion` to `checkApplicability` and that finding cannot arise
 * here. The sentence that it mapped to a `'models'` instrument no config
 * field gated is the record from before this map was narrowed; a finding of
 * that kind now throws below, because it would mean the instrument changed
 * without this map.
 */
const FINDING_INSTRUMENT: Readonly<
  Record<Exclude<ApplicabilityFindingKind, 'model-incompatibility'>, 'assumptions' | 'dimensionsAndConventions'>
> = {
  'dimensional-inconsistency': 'dimensionsAndConventions',
  'convention-mismatch': 'dimensionsAndConventions',
  'convention-undeclared': 'dimensionsAndConventions',
  'division-unguarded': 'assumptions',
  'division-by-zero': 'assumptions',
  'squaring-adds-solutions': 'assumptions',
};

/** Which failure kind a BLOCKING applicability finding points to. */
const FINDING_TO_FAILURE: Readonly<Partial<Record<ApplicabilityFindingKind, FailureKind>>> = {
  'dimensional-inconsistency': 'notation-collision',
  'convention-mismatch': 'convention-mismatch',
  'division-by-zero': 'domain-violation',
};

/** Relations that assert more than an analogy can carry. */
const STRONG: ReadonlySet<RelationType> = new Set(['exact-equivalence', 'derivation']);

/**
 * The failure kind an OVERCLAIMED chain points to: a chain claimed as an exact
 * equivalence that the table composes to something weaker.
 *
 * - through a restriction ⇒ the restriction's condition was dropped:
 *   `omitted-premise`;
 * - to a derivation or a coarse-graining ⇒ the claim asserts an inverse the
 *   one-way step does not have: `false-inverse`.
 */
function overclaimFailure(chain: readonly RelationType[]): FailureKind {
  return chain.includes('restriction') ? 'omitted-premise' : 'false-inverse';
}

/**
 * Whether `claimed` follows from `composed`. The table's own non-declined
 * results are exact-equivalence, derivation, restriction and coarse-graining;
 * of these only exact-equivalence ⇒ derivation is an implication this module
 * asserts. Anything else unequal is "not shown", never "shown".
 */
const implies = (composed: RelationType, claimed: RelationType): boolean =>
  composed === claimed || (composed === 'exact-equivalence' && claimed === 'derivation');

/**
 * Run the atlas condition on one item. Pure and deterministic; never throws.
 *
 * @internal
 */
export function runAtlasOnItem(item: BenchmarkItem, config: AtlasRunConfig = FULL_CONFIG): AtlasVerdict {
  const reasons: string[] = [];
  let rejectKind: FailureKind | undefined;
  let rejected = false;
  const reject = (reason: string, kind?: FailureKind): void => {
    reasons.push(`REJECT: ${reason}`);
    if (!rejected) rejectKind = kind;
    rejected = true;
  };
  let allRanAndCleared = true;
  // An accept needs at least one instrument that actually RAN. Without this,
  // an item no enabled instrument applies to is accepted with nothing checked.
  let ranAny = false;
  const unrun = (reason: string): void => {
    reasons.push(`UNRUN: ${reason}`);
    allRanAndCleared = false;
  };

  // 1. Applicability — split by instrument so the ablation can switch each off.
  const applicabilityOn = config.assumptions || config.dimensionsAndConventions;
  if (!applicabilityOn) {
    // Instrument disabled: neither run nor required.
  } else if (item.sideConditions === undefined) {
    unrun('no side conditions stated, so the applicability checker has nothing to check against');
  } else {
    ranAny = true;
    const findings = checkApplicability({
      ast: item.expr,
      sideConditions: item.sideConditions,
      ...(item.conventions?.premise === undefined ? {} : { premiseConventions: item.conventions.premise }),
      ...(item.conventions?.conclusion === undefined
        ? {}
        : { conclusionConventions: item.conventions.conclusion }),
    });
    for (const f of findings) {
      if (f.kind === 'model-incompatibility') {
        throw new Error('runAtlasItem: checkApplicability reported model-incompatibility without being given models');
      }
      const instrument = FINDING_INSTRUMENT[f.kind];
      if (instrument === 'assumptions' && !config.assumptions) continue;
      if (instrument === 'dimensionsAndConventions' && !config.dimensionsAndConventions) continue;
      if (f.severity === 'blocking') reject(`${f.kind}: ${f.detail}`, FINDING_TO_FAILURE[f.kind]);
      else {
        reasons.push(`QUESTION: ${f.kind}: ${f.detail}`);
        allRanAndCleared = false;
      }
    }
  }

  // 2. Composition. Only for items that claim a chain.
  if (config.types && item.composedFrom !== undefined) {
    ranAny = true;
    const [first, second] = item.composedFrom;
    const composed = composeRelation(first, second);
    if (item.composedFrom.includes('structural-analogy') && STRONG.has(item.claimedRelation)) {
      reject(
        `a chain through structural-analogy is claimed as ${item.claimedRelation}`,
        'analogy-promoted',
      );
    } else if (composed === NO_COMPOSITE_CLAIM) {
      reasons.push(`QUESTION: the table declines to compose ${first} ∘ ${second}`);
      allRanAndCleared = false;
    } else if (implies(composed, item.claimedRelation)) {
      reasons.push(`CLEARED: ${first} ∘ ${second} composes to ${composed}, which gives ${item.claimedRelation}`);
    } else if (item.claimedRelation === 'exact-equivalence') {
      reject(
        `${first} ∘ ${second} composes only to ${composed}; the exact equivalence is overclaimed`,
        overclaimFailure(item.composedFrom),
      );
    } else {
      reasons.push(
        `QUESTION: ${first} ∘ ${second} composes to ${composed}; the table does not show ${item.claimedRelation}`,
      );
      allRanAndCleared = false;
    }
  }

  // 3. Regime.
  if (!config.regimes) {
    // Instrument disabled: neither run nor required.
  } else if (item.regime === undefined) {
    unrun('no regime supplied, so the use site was never checked against a domain');
  } else {
    ranAny = true;
    const check = regimeHolds(
      { family: item.family, inequalities: item.regime.inequalities, groupDefinitions: {} },
      item.regime.values,
    );
    if (check.ok === false) {
      reject(
        `regime violated: ${check.violated.map((i) => `${i.group} ${i.op} ${i.bound}`).join(', ')}`,
        'domain-violation',
      );
    } else if (check.ok === 'unknown') {
      unrun(`regime unchecked for ${check.unchecked.map((i) => i.group).join(', ')}`);
    } else if (item.regime.inequalities.length === 0) {
      // regimeHolds returns true for an empty list; that is "nothing to check",
      // not "checked and held" — the silent pass RegimeCheck warns about.
      unrun('the regime states no inequality, so nothing was checked');
    }
  }

  if (rejected) {
    return {
      itemId: item.id,
      outcome: 'reject',
      ...(rejectKind === undefined ? {} : { detectedFailure: rejectKind }),
      reasons,
    };
  }
  if (allRanAndCleared && !ranAny) {
    reasons.push('UNRUN: no enabled instrument applies to this item, so nothing was checked');
    return { itemId: item.id, outcome: 'abstain', reasons };
  }
  if (allRanAndCleared) {
    reasons.push('ACCEPT: every instrument ran and cleared');
    return { itemId: item.id, outcome: 'accept', reasons };
  }
  return { itemId: item.id, outcome: 'abstain', reasons };
}

/** Run the atlas condition over a set of items, in order. @internal */
export function runAtlasCondition(
  items: readonly BenchmarkItem[],
  config: AtlasRunConfig = FULL_CONFIG,
): AtlasVerdict[] {
  return items.map((item) => runAtlasOnItem(item, config));
}
