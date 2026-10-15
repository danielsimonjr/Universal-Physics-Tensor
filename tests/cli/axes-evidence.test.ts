/**
 * `upt axes` prints each axis's evidence and whether the gate is earned.
 *
 * `auditAxisDiscrimination` carries, beside `discriminates` (fires > 0, the registry's
 * criterion), Fisher's exact test of the axis's fires against the independent magnitude
 * falsifier's clashes (`evidence`: table, odds ratio, p, n) and `earned` (p < AUDIT_ALPHA with a
 * positive association). Only the JSON carried them. The text now prints them on each axis, and
 * says plainly which gated axes are NOT earned: on the live catalog, scale and force gate because
 * they fire, and neither agrees with the falsifier more often than chance.
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { auditAxisDiscrimination, AUDIT_ALPHA } from '../../src/composition/axis-audit.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { formatQuantity } from '../../src/composition/explain.js';

describe('upt axes prints the Fisher evidence and the earned flag', () => {
  it('each axis prints its table, odds ratio, p, n and earned; the gated, unearned axes are named', async () => {
    const cap = capture();
    expect(await runCli(['axes'], cap.io)).toBe(0);
    const text = cap.lines.join('');
    const report = auditAxisDiscrimination(CATALOG_GRAPH);
    const lines = text.split('\n');
    for (const r of report) {
      const i = lines.findIndex((l) => l.trimStart().startsWith(`${r.axis} `));
      expect(i, r.axis).toBeGreaterThanOrEqual(0);
      const ev = lines[i + 1]!;
      const [[a, b], [c, d]] = r.evidence.table;
      expect(ev, r.axis).toContain(`[[${a}, ${b}], [${c}, ${d}]]`);
      expect(ev, r.axis).toContain(`odds ratio ${r.evidence.oddsRatio === null ? 'undefined' : formatQuantity(r.evidence.oddsRatio, 3)}`);
      expect(ev, r.axis).toContain(`p = ${formatQuantity(r.evidence.pValue, 3)}`);
      expect(ev, r.axis).toContain(`n = ${r.evidence.n}`);
      expect(ev, r.axis).toContain(r.earned ? 'EARNED' : 'NOT earned');
    }
    // The live catalog: scale and force gate, and neither is earned.
    const scale = report.find((r) => r.axis === 'scale')!;
    const force = report.find((r) => r.axis === 'force')!;
    expect([scale.gated, scale.earned, force.gated, force.earned]).toEqual([true, false, true, false]);
    expect(text).toMatch(/The gated axes scale, force are NOT earned/);
    expect(text).toContain(`p < ${AUDIT_ALPHA}`);
  });
});
