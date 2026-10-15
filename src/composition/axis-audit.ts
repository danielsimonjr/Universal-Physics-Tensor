/**
 * Axis-discrimination audit — the anti-inert-metadata gate for the extensible
 * axis registry (`axes.ts`).
 *
 * A classification axis is only load-bearing when it actually SEPARATES real
 * candidates. This audit runs the discovery link-candidate enumeration and, for
 * EVERY registry axis (gated or not), measures how often the axis FIRES (both
 * endpoints carry the attribute and they differ → an axis-clash), ABSTAINS (at
 * least one endpoint lacks the attribute), and is CHECKED (both carry it).
 *
 * Beside the firing count, each axis carries EVIDENCE: Fisher's exact test (MathTS
 * `fisherExact`) of its fires against the clashes of the INDEPENDENT magnitude falsifier
 * (`discovery.ts`, `magnitudeGate`) over the candidates where both gates ran, and an `earned`
 * flag at {@link AUDIT_ALPHA}. Firing is activity; agreeing with an independent falsifier more
 * often than chance is evidence. The `discriminates` flag (fires > 0) is the registry's current
 * criterion and is not changed by the evidence; `GATE_AXES` reads the registry, not this audit.
 *
 * Use: an axis stays `gated: false` in the registry until this audit shows it
 * fires; an axis that only ever abstains is inert and must not be gated. As the
 * catalog grows into new branches of physics, re-run this and flip the gates the
 * measurement earns. Rank grows on evidence, not vision.
 *
 * @module composition/axis-audit
 */
import { fisherExact } from '@danielsimonjr/mathts-functions';
import type { BridgeEdge } from './edge.js';
import type { RegimeAttributes } from './quantity.js';
import type { QuantityIdentification } from './compose.js';
import { AXES } from './axes.js';
import { proposeLinkCandidates } from './bridge-analysis.js';
import { effectiveAttributes, QUANTITY_IDENTIFICATIONS } from './compose.js';
import { buildDiscoveryContext, magnitudeGate, REGISTRY_ATTRIBUTES_BY_NAME } from './discovery.js';
import type { DiscoveryOptions } from './discovery.js';

/**
 * The level at which an axis is `earned`: 0.05, the conventional two-sided level, fixed before
 * any table was read. Six axes are audited at once, so a reader who wants a family-wise level
 * divides by six (0.0083); the flag is per axis and says so here rather than hiding a
 * correction. Small tables (about twenty magnitude clashes on the catalog) are why the test is
 * exact and not a χ².
 *
 * @internal
 */
export const AUDIT_ALPHA = 0.05;

/**
 * Fisher's exact evidence of one axis against the magnitude falsifier, over the candidates
 * where BOTH gates ran (both endpoints carry the axis, and both have a magnitude).
 *
 * @internal
 */
export interface AxisEvidence {
  /**
   * `[[fires ∧ clash, fires ∧ no clash], [silent ∧ clash, silent ∧ no clash]]`: rows are the
   * axis's verdict, columns the magnitude falsifier's.
   */
  readonly table: readonly [readonly [number, number], readonly [number, number]];
  /** Sample odds ratio `ad/bc`, as MathTS reports it; `null` when a zero cell leaves it undefined. */
  readonly oddsRatio: number | null;
  /** Two-sided Fisher exact p; 1 when a margin is zero (only one table is possible). */
  readonly pValue: number;
  /** Candidates where both gates ran (the table's total). */
  readonly n: number;
}

/** Per-axis discrimination measurement over the candidate funnel. @internal */
export interface AxisDiscrimination {
  readonly axis: string;
  /** The registry's current gate flag for this axis. */
  readonly gated: boolean;
  /** Candidate pairs where BOTH endpoints carry the attribute. */
  readonly checked: number;
  /** Of the checked pairs, how many DIFFER (the axis fires → a clash). */
  readonly fires: number;
  /** Pairs where at least one endpoint lacks the attribute (the axis abstains). */
  readonly abstains: number;
  /** fires / checked (0 when nothing is checked). */
  readonly clashRate: number;
  /**
   * The registry's criterion: a gate is EARNED when the axis fires at all. `false` here on an
   * ungated axis = inert (do not gate); `false` on a gated axis = a regression to investigate.
   * Not changed by `evidence`.
   */
  readonly discriminates: boolean;
  /** Fisher's exact test of the axis's fires against the magnitude falsifier's clashes. */
  readonly evidence: AxisEvidence;
  /**
   * The axis's fires coincide with the independent falsifier's clashes more often than chance:
   * `evidence.pValue < AUDIT_ALPHA` AND the association is positive (`a·d > b·c`; an axis whose
   * fires avoid the clashes is not earned, however small its p). Reported beside
   * `discriminates`; it changes no gate.
   */
  readonly earned: boolean;
}

/** The inputs of the magnitude gate an audit may override (a synthetic table for a test). @internal */
export type AxisAuditOptions = Pick<DiscoveryOptions, 'representativeValues' | 'groundTruth' | 'maxOrdersOfMagnitude'>;

/** The one Fisher call, read back for what MathTS returns: a number or `null` odds ratio, a number p. */
function fisher(table: AxisEvidence['table']): Pick<AxisEvidence, 'oddsRatio' | 'pValue'> {
  const r = fisherExact([[...table[0]], [...table[1]]]);
  const oddsRatio: unknown = r.oddsRatio;
  const pValue: unknown = r.pValue;
  if (typeof pValue !== 'number' || !(pValue >= 0 && pValue <= 1)) {
    throw new TypeError(`fisherExact returned p = ${String(pValue)} for ${JSON.stringify(table)}`);
  }
  return { oddsRatio: typeof oddsRatio === 'number' && Number.isFinite(oddsRatio) ? oddsRatio : null, pValue };
}

/**
 * Audit every registry axis's discrimination over the discovery candidate funnel, with Fisher
 * evidence against the magnitude falsifier. The magnitude gate runs once per candidate from one
 * discovery context (`buildDiscoveryContext`), not the whole funnel.
 *
 * @internal
 */
export function auditAxisDiscrimination(
  edges: readonly BridgeEdge[],
  attributesByName: ReadonlyMap<string, RegimeAttributes> = REGISTRY_ATTRIBUTES_BY_NAME,
  identifications: readonly QuantityIdentification[] = QUANTITY_IDENTIFICATIONS,
  options: AxisAuditOptions = {},
): AxisDiscrimination[] {
  const candidates = proposeLinkCandidates(edges);
  const ctx = buildDiscoveryContext(edges, { ...options, identifications, quantityAttributes: attributesByName });
  const magnitudes = candidates.map((c) => magnitudeGate(c, ctx));
  return AXES.map((spec) => {
    let checked = 0;
    let fires = 0;
    let abstains = 0;
    // The 2×2 table over candidates where both gates ran.
    let a = 0; // fires ∧ clash
    let b = 0; // fires ∧ no clash
    let c = 0; // silent ∧ clash
    let d = 0; // silent ∧ no clash
    candidates.forEach((cand, i) => {
      const attrsA = effectiveAttributes(cand.a, attributesByName, identifications) as Record<
        string,
        string | undefined
      >;
      const attrsB = effectiveAttributes(cand.b, attributesByName, identifications) as Record<
        string,
        string | undefined
      >;
      const av = attrsA[spec.name];
      const bv = attrsB[spec.name];
      if (av === undefined || bv === undefined) {
        abstains++;
        return;
      }
      checked++;
      const fired = av !== bv;
      if (fired) fires++;
      const gate = magnitudes[i];
      if (!gate.checked) return; // the falsifier abstained: no row for this candidate
      if (fired && gate.clash) a++;
      else if (fired) b++;
      else if (gate.clash) c++;
      else d++;
    });
    const table: AxisEvidence['table'] = [
      [a, b],
      [c, d],
    ];
    const { oddsRatio, pValue } = fisher(table);
    return {
      axis: spec.name,
      gated: spec.gated,
      checked,
      fires,
      abstains,
      clashRate: checked > 0 ? fires / checked : 0,
      discriminates: fires > 0,
      evidence: { table, oddsRatio, pValue, n: a + b + c + d },
      earned: pValue < AUDIT_ALPHA && a * d > b * c,
    };
  });
}
