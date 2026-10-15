/**
 * Scientist-facing probe reports. Never prints a status stronger than the
 * stored candidate status. Novelty wording is always corpus-relative.
 *
 * @internal
 */

import { bodyExpression } from './fingerprint.js';
import { corpusRelativeWording } from './corpus.js';
import type { ProbeSearchResult } from './pipeline.js';
import type { FrontierGap, ProbeCandidateRecord, ProbeCandidateStatus } from './types.js';

const STATUS_LINE: Record<ProbeCandidateStatus, string> = {
  generated: 'generated (not yet validated)',
  'structurally-valid': 'structurally valid (not yet fit)',
  'empirically-fit': 'fit on exploratory data only (holdout not passed)',
  'heldout-supported': 'supported on locked holdout (not yet falsified)',
  'falsification-survivor': 'survived declared falsification batteries',
  'expert-review-required': 'requires expert review — not a published discovery',
  rejected: 'rejected',
  falsified: 'falsified',
  'equivalent-known': 'algebraically equivalent to a known corpus relation (not novel)',
  'insufficient-evidence': 'insufficient evidence (no data or no holdout)',
};

function exprSummary(record: ProbeCandidateRecord): string {
  const expr = bodyExpression(record.body);
  try {
    return JSON.stringify(expr);
  } catch {
    return record.id;
  }
}

/** Format a Product B search result. @internal */
export function formatProbeReport(result: ProbeSearchResult): string {
  const lines: string[] = [];
  lines.push(`upt probe — experimental expression/residual search  [run ${result.manifest.runId}]`);
  lines.push('⚠ Product B is experimental. `upt discover` remains the quantity-identification funnel.');
  lines.push(`  stop: ${result.stopReason}`);
  lines.push(`  candidates: ${result.candidates.length} · rejections: ${result.rejections.length}`);
  if (result.wording.length > 0) {
    lines.push('');
    for (const w of result.wording.slice(0, 8)) lines.push(`  ${w}`);
  }
  lines.push('');
  if (result.ranked.length === 0) {
    lines.push('  no candidates to rank.');
    return lines.join('\n');
  }
  lines.push('  ranked (Pareto front first; scores are not a discovery claim):');
  for (const item of result.ranked) {
    const rec = item.record;
    const mark = item.pareto ? '●' : '·';
    const fit = result.fits[rec.id];
    const fitBit = fit
      ? ` ĉ=${fit.prefactor.toPrecision(4)}${fit.prefactorStderr !== null ? `±${fit.prefactorStderr.toPrecision(2)}` : ''} RMSE_ex=${fit.exploratoryRmse.toPrecision(3)}` +
        (fit.holdoutRmse != null ? ` RMSE_ho=${fit.holdoutRmse.toPrecision(3)}` : '')
      : '';
    lines.push(
      `  ${mark} ${rec.id}  [${STATUS_LINE[rec.status]}]  validity=${item.scores.validity.toFixed(2)} emp=${item.scores.empirical.toFixed(2)} parsimony=${item.scores.parsimony.toFixed(2)}${fitBit}`,
    );
    const corp = result.corpus[rec.id];
    if (corp) lines.push(`      ${corpusRelativeWording(corp)}`);
    for (const note of result.prefactorNotes[rec.id] ?? []) lines.push(`      ${note}`);
    lines.push(`      ${exprSummary(rec).slice(0, 180)}`);
  }
  return lines.join('\n');
}

/** Format a frontier scan. @internal */
export function formatFrontierScan(gaps: readonly FrontierGap[]): string {
  const lines: string[] = [];
  lines.push('upt probe scan — typed frontier gaps');
  lines.push('⚠ relation-link / regime-transition gaps are Product A review surfaces (`upt discover`).');
  lines.push(`  ${gaps.length} gap(s)\n`);
  for (const g of gaps) {
    const search = g.searchability.searchable ? 'searchable' : 'not-searchable';
    lines.push(`  ${g.id}  [${g.kind} / ${search}]`);
    lines.push(`    ${g.evidence.summary}`);
    if (!g.searchability.searchable) {
      lines.push(`    → ${g.searchability.reasons.join('; ')}`);
    }
  }
  return lines.join('\n');
}

/** Format a single gap. @internal */
export function formatFrontierGap(gap: FrontierGap): string {
  return [
    `upt probe show ${gap.id}`,
    `  kind: ${gap.kind}`,
    `  status: ${gap.status}`,
    `  searchable: ${gap.searchability.searchable} (${gap.searchability.reasons.join('; ')})`,
    `  identifiability: ${gap.identifiability.kind} ${gap.identifiability.parametric?.status ?? ''}`,
    `  ${gap.evidence.summary}`,
  ].join('\n');
}
