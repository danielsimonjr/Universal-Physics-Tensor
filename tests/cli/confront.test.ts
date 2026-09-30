/**
 * `upt confront` — in-process against the src/cli port (dist/cli/main.js),
 * matching the convention established in main-dispatch.test.ts /
 * json-contract.test.ts (not a src/ import — the command needs the built
 * cli-api barrel wired in).
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('upt confront', () => {
  it('lists all confrontations by default (exit 0)', async () => {
    const cap = capture();
    const code = await runCli(['confront'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/be-37/);
    expect(text).toMatch(/be-48/);
    expect(text).toMatch(/be-52/);
  });

  it('--bridge=be-37 runs one, exit 0', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-37'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/PPN|γ|gamma/i);
  });

  it('--bridge with an unregistered id is a bad value → exit 1', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-99'], cap.io);
    expect(code).toBe(1);
  });

  it('--bridge with an unparseable value is a bad value → exit 1', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=garbage'], cap.io);
    expect(code).toBe(1);
  });

  it('--json emits an envelope with a result array', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.command).toBe('confront');
    expect(Array.isArray(parsed.result)).toBe(true);
    expect(parsed.result.some((o: { kind: string }) => o.kind === 'value')).toBe(true);
  });

  it('--bridge=be-52 --sensitivity prints a descending elasticity ranking', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-52', '--sensitivity'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/sensitivity \(elasticity, strongest dependence, not uncertainty budget\)/);
    expect(text).toMatch(/central_mass_kg:/);
    expect(text).not.toMatch(/uncertainty budget\).*dominates/i);
  });

  it('--bridge=be-48 --sensitivity reports n/a for the non-value kind', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-48', '--sensitivity'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/sensitivity: n\/a for upper-bound-kind/);
  });

  it('--json --sensitivity adds a sensitivity field to value-kind entries only', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--json', '--sensitivity'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    const be52 = parsed.result.find((r: { kind: string; predicted: number }) => r.kind === 'value' && Math.abs(r.predicted - 42) < 5);
    expect(Array.isArray(be52.sensitivity)).toBe(true);
    expect(be52.sensitivity.length).toBeGreaterThan(0);
    const be48 = parsed.result.find((r: { kind: string }) => r.kind === 'upper-bound');
    expect(be48.sensitivity).toBeUndefined();
    expect(parsed.epistemics).toMatch(/uncertainty budget/);
  });

  it('--bridge=be-36 surfaces the one-sided caveat in the summary line', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-36'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    // Audit F13 (2026-09-26): "predicted 1e-15 · bound 6.5e-16 · not excluded" read as a point
    // prediction above an upper limit. BE-36's 1e-15 is its ENCODED range, and the rule is stated.
    expect(text).toMatch(/encoded bound \|x\| ≤ 1e-15, .*\(a range, not a point prediction\)/);
    expect(text).toMatch(/observed upper limit 6\.50\d*e-16/);
    expect(text).toMatch(/rule: observed limit ≤ encoded bound · compatible ✓/);
    expect(text).not.toMatch(/predicted 1e-15/);
    // honesty fix: the pass is one-sided — the GW170817 negative side exceeds
    // BE-36's symmetric encoding, and the summary line must say so.
    expect(text).toMatch(/one-sided|\+side|−side|-side/i);
  });

  it('a point-prediction upper-bound record states its rule (be-48)', async () => {
    const cap = capture();
    await runCli(['confront', '--bridge=be-48'], cap.io);
    const text = cap.lines.join('');
    expect(text).toMatch(/predicted 1e-16 .* · observed upper limit 2\.96e-8 · rule: predicted ≤ limit · not excluded ✓/);
  });

  it('--json names what the predicted field is for each upper-bound record', async () => {
    const cap = capture();
    await runCli(['confront', '--json'], cap.io);
    const rows = JSON.parse(cap.lines.join('')).result as { bridgeId: number; predictedIs?: string }[];
    expect(rows.find((r) => r.bridgeId === 36)!.predictedIs).toBe('encoded-bound');
    expect(rows.find((r) => r.bridgeId === 48)!.predictedIs).toBe('point');
  });

  it('--json carries the be-36 caveat as a field', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    const be36 = parsed.result.find((r: { kind: string; caveat?: string }) => r.kind === 'upper-bound' && r.caveat);
    expect(be36).toBeDefined();
    expect(be36.caveat).toMatch(/side/i);
  });

  // Audit §14 item 14: "gap 150.0%" for be-65 was the agreement bound; the difference is −43.7%.
  it('a consistency record prints its actual difference and its agreement bound as separate fields', async () => {
    const cap = capture();
    await runCli(['confront'], cap.io);
    const text = cap.lines.join('');
    expect(text).not.toMatch(/· gap \d/);
    expect(text).toMatch(
      /approaches 1 M_⊙;.* · actual difference -43\.7% = \(observed − predicted\) \/ predicted · agreement bound ±150\.0% \(the record's stated tolerance, not a measured difference\) · \|difference\| ≤ bound: compatible ✓/,
    );
    expect(text).toMatch(/approaches 1\.35 M_⊙;.* · actual difference -7\.3% .* agreement bound ±12\.0%/);
    expect(text).toMatch(/approaches 3\.5 2Δ.* · actual difference -0\.8% .* agreement bound ±5\.0%/);
    expect(text).toMatch(/Lorenz number .* · actual difference 0\.0% .* agreement bound ±10\.0%/);
    expect(text).toMatch(/peak L\/L_Edd .* · actual difference 0\.0% .* agreement bound ±50\.0%/);
    expect(text).toMatch(/force ratio;.* · actual difference 0\.0% .* agreement bound ±1\.0%/);
    expect(text).toMatch(/graphene.* agreement bound ±8\.6e-9%/);
    expect(text).toMatch(/KSS lower bound .* · actual difference \+25\.7% .* · rule: observed ≥ predicted lower limit · compatible ✓/);
    expect(text).toMatch(/9-gas agreement within 15% experimental error · actual difference 0\.0% .* agreement bound ±15\.0% .* compatible ✓/);
    // Audit I14 limit closed: every consistency record now makes a compatibility decision.
    expect(text).not.toMatch(/no compatibility decision/);
  });

  it('--json carries the comparison beside fractionalGap and says what fractionalGap is', async () => {
    const cap = capture();
    await runCli(['confront', '--json'], cap.io);
    const rows = JSON.parse(cap.lines.join('')).result as {
      bridgeId: number;
      fractionalGap?: number;
      fractionalGapIs?: string;
      predictedIs?: string;
      comparison?: { relativeDifference: number; definition: string; agreementBound: number | null; withinBound: boolean | null; rule: string | null };
    }[];
    const be65 = rows.find((r) => r.bridgeId === 65)!;
    expect(be65.fractionalGap).toBe(1.5);
    expect(be65.fractionalGapIs).toBe('agreement-bound');
    expect(be65.comparison!.relativeDifference).toBeCloseTo(-0.436927, 6);
    expect(be65.comparison!.definition).toBe('(observed − predicted) / predicted');
    expect(be65.comparison!.agreementBound).toBe(1.5);
    expect(be65.comparison!.withinBound).toBe(true);
    const be21 = rows.find((r) => r.bridgeId === 21)!;
    expect(be21.fractionalGapIs).toBe('observed-difference');
    expect(be21.predictedIs).toBe('lower-limit');
    expect(be21.comparison!.agreementBound).toBeNull();
    expect(be21.comparison!.rule).toBe('observed ≥ predicted lower limit');
    expect(be21.comparison!.withinBound).toBe(true);
    const be11 = rows.find((r) => r.bridgeId === 11)!;
    expect(be11.fractionalGapIs).toBe('agreement-bound');
    expect(be11.comparison!.agreementBound).toBe(0.15);
    expect(be11.comparison!.rule).toBe('|difference| ≤ agreement bound');
    expect(be11.comparison!.withinBound).toBe(true);
    expect(rows.find((r) => r.bridgeId === 52)!.comparison).toBeUndefined();
  });

  it('default confront (no --sensitivity) output is unaffected', async () => {
    const cap = capture();
    const code = await runCli(['confront'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).not.toMatch(/sensitivity/i);
  });
});

// Persona finding L6 (2026-09-25): be-51 printed "observed 1.751639983367098 ± 0.000105 arcsec".
// VLBI measured PPN γ = 1 − (0.8 ± 1.2)×10⁻⁴, not a solar-limb deflection to 16 digits: the
// number was the tool's own prediction times (1 + γ)/2 (reproduced to every printed digit). The
// residual, 0.67σ, is correct because it tests only γ; the label was not.
describe('upt confront be-51 shows the measurement, and labels the deflection as derived', () => {
  it('prints γ ± σ as the measurement and the deflection as (1+γ)/2 × predicted', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-51'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/measured: PPN γ = 0\.99992 ± 0\.00012 \(VLBI\); the value above is derived from it, not observed/);
    expect(text).toMatch(/derived \(1\+γ\)\/2 × predicted = 1\.75112\d* ± 0\.000105\d* arcsec/);
    expect(text).not.toMatch(/observed 1\.75/);
    expect(text).toMatch(/residual 0\.67σ/);
  });

  it('--json carries the measurement', async () => {
    const cap = capture();
    await runCli(['confront', '--bridge=be-51', '--json'], cap.io);
    const s = JSON.stringify(JSON.parse(cap.lines.join('')));
    expect(s).toContain('"measured":{"quantity":"PPN γ","value":0.99992,"sigma":0.00012,"source":"VLBI","derivation":"(1+γ)/2 × predicted"}');
  });
});

// `upt explain be-58` prints `upt confront be-58`. That positional was ignored:
// the command exited 0 and printed every confrontation. These tests fail while
// a bare `be-58` still selects the full list.
describe('upt confront <be-NN> — the id explain prints', () => {
  it('a positional be-58 prints that confrontation and not the rest of the catalog', async () => {
    const cap = capture();
    const code = await runCli(['confront', 'be-58'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/be-58/);
    expect(text).toMatch(/Johnson-Nyquist/);
    expect(text).not.toMatch(/be-11/);
    expect(text).not.toMatch(/NOT 19 equal confirmations/);
  });

  it('positional be-58 --json is a one-element result', async () => {
    const cap = capture();
    const code = await runCli(['confront', 'be-58', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.result.map((r: { bridgeId: number }) => r.bridgeId)).toEqual([58]);
  });

  it('positional be-58 prints the same record as --bridge=be-58', async () => {
    const positional = capture();
    const flagged = capture();
    expect(await runCli(['confront', 'be-58'], positional.io)).toBe(0);
    expect(await runCli(['confront', '--bridge=be-58'], flagged.io)).toBe(0);
    expect(positional.lines.join('')).toBe(flagged.lines.join(''));
  });

  // Agreeing spellings. Before the fix this already exited 0: the positional was
  // ignored and --bridge was obeyed. It guards a fix that rejects every pair.
  it('be-58 together with --bridge=58 is that one record, not an error', async () => {
    const both = capture();
    const flagged = capture();
    expect(await runCli(['confront', 'be-58', '--bridge=58'], both.io)).toBe(0);
    expect(await runCli(['confront', '--bridge=be-58'], flagged.io)).toBe(0);
    expect(both.lines.join('')).toBe(flagged.lines.join(''));
  });

  it('a positional and --bridge that name different bridges is an error, not both records', async () => {
    const cap = capture();
    const code = await runCli(['confront', 'be-58', '--bridge=be-56'], cap.io);
    expect(code).toBe(2);
    const text = cap.lines.join('');
    expect(text).toMatch(/different bridges/);
    expect(text).not.toMatch(/Johnson-Nyquist/);
    expect(text).not.toMatch(/Casimir/);
  });

  it('a positional that is not a bridge id is an error, not the full list', async () => {
    const cap = capture();
    const code = await runCli(['confront', 'nope'], cap.io);
    expect(code).toBe(1);
    const text = cap.lines.join('');
    expect(text).toMatch(/not a bridge id/);
    expect(text).not.toMatch(/NOT 19 equal confirmations/);
  });

  it('two positionals are a usage error', async () => {
    const cap = capture();
    const code = await runCli(['confront', 'be-58', 'be-56'], cap.io);
    expect(code).toBe(2);
    expect(cap.lines.join('')).toMatch(/unexpected/);
  });

  it('be-53 with no table and no procedure refuses and names both', async () => {
    const cap = capture();
    const code = await runCli(['confront', 'be-53'], cap.io);
    expect(code).toBe(1);
    const text = cap.lines.join('');
    expect(text).toMatch(/refused/);
    expect(text).toMatch(/table/);
    expect(text).toMatch(/running procedure/);
    expect(text).not.toMatch(/residual/i);
    expect(text).toMatch(/not a pass and not a fail/);
    expect(text).toMatch(/catalog status of be-53 is unchanged/);
  });

  it('be-53 --json is the same refusal and has no residual field', async () => {
    const cap = capture();
    const code = await runCli(['confront', '--bridge=be-53', '--json'], cap.io);
    expect(code).toBe(1);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.command).toBe('confront');
    expect(parsed.result.status).toBe('refused');
    expect(parsed.result.missing).toEqual(['table', 'running procedure']);
    expect(parsed.result.pass).toBe(false);
    expect(parsed.result.fail).toBe(false);
    expect(JSON.stringify(parsed)).not.toMatch(/residual/i);
  });

  it('the full confrontation list still does not include be-53', async () => {
    const cap = capture();
    const code = await runCli(['confront'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).not.toMatch(/be-53/);
  });
});
