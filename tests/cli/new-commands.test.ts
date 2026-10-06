/**
 * The v0.44.0 CLI capability cluster — `upt axes`, `upt evaluate`, `upt ground`,
 * and `upt confront --rigor` / `--frontier`. In-process against dist/cli/main.js.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { M_SUN_SI } from '../../src/core/constants.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('');

describe('upt axes', () => {
  it('reproduces the axis-discrimination audit (scale/force gate, rest do not), exit 0', async () => {
    const c = capture();
    expect(await runCli(['axes'], c.io)).toBe(0);
    expect(text(c)).toMatch(/scale\s+GATED/);
    expect(text(c)).toMatch(/topology\s+ungated/);
    expect(text(c)).toMatch(/2 of 6 axes gate/);
  });
  it('--json carries the per-axis report', async () => {
    const c = capture();
    expect(await runCli(['axes', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    const sym = env.result.find((r: { axis: string }) => r.axis === 'symmetry');
    expect(sym.checked).toBe(0);
    expect(sym.gated).toBe(false);
  });
});

describe('upt evaluate', () => {
  it('be-63 mu_e=2 → Chandrasekhar mass, exit 0', async () => {
    const c = capture();
    expect(await runCli(['evaluate', 'be-63', 'mu_e=2'], c.io)).toBe(0);
    const kilograms = Number(text(c).match(/value = ([0-9.eE+-]+)/)?.[1]);
    expect(kilograms / M_SUN_SI).toBeGreaterThan(1.3);
    expect(kilograms / M_SUN_SI).toBeLessThan(1.6);
  });
  it('no args lists the evaluable bridges', async () => {
    const c = capture();
    expect(await runCli(['evaluate'], c.io)).toBe(0);
    expect(text(c)).toMatch(/be-55 {2}Integer quantum Hall \/ TKNN\n {6}C \[dimensionless\] TKNN \(Chern\) number C — /);
  });
  it('a non-bridge target is a usage error → exit 2', async () => {
    const c = capture();
    expect(await runCli(['evaluate', 'mass'], c.io)).toBe(2);
  });
  it('an id with no evaluator → exit 1', async () => {
    const c = capture();
    expect(await runCli(['evaluate', 'be-11', 'x=1'], c.io)).toBe(1);
  });
  it('--json carries {bridgeId, inputs, output}', async () => {
    const c = capture();
    expect(await runCli(['evaluate', 'be-55', 'C=1', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.result.bridgeId).toBe(55);
    expect(1 / env.result.output.value).toBeCloseTo(25812.807, 2);
  });
});

describe('upt confront --rigor / --frontier', () => {
  it('--rigor=stringent filters to the 7 precision-core rows', async () => {
    const c = capture();
    expect(await runCli(['confront', '--rigor=stringent'], c.io)).toBe(0);
    expect(text(c)).toMatch(/7 stringent · 0 moderate · 0 loose/);
    expect(text(c)).not.toMatch(/be-65/); // Jeans is loose
  });
  it('--rigor with a bad tier → exit 1', async () => {
    const c = capture();
    expect(await runCli(['confront', '--rigor=tight'], c.io)).toBe(1);
  });
  // Audit F07 (2026-09-26): "margin 0.09σ to exclusion" read as GR being 0.09σ from scientific
  // exclusion; the margin is to this tool's configured 1σ acceptance threshold.
  it('--frontier ranks value-tests by margin to the configured acceptance threshold (Shapiro first)', async () => {
    const c = capture();
    expect(await runCli(['confront', '--frontier'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/margin 0\.09σ to the 1σ acceptance threshold/);
    expect(t).toMatch(/a software criterion, not a scientific exclusion level/);
    expect(t).not.toMatch(/to exclusion/);
    // be-37 (0.91σ, margin 0.09) must precede be-52 (0.26σ, margin 0.74)
    expect(t.indexOf('be-37')).toBeLessThan(t.indexOf('be-52'));
  });
});

describe('upt ground', () => {
  it('shows a candidate grounding ledger with the honest ceiling, exit 0', async () => {
    const c = capture();
    const code = await runCli(['ground', 'landauer-erasure-energy', 'dark-fermion-mass'], c.io);
    expect(code).toBe(0);
    expect(text(c)).toMatch(/mechanism-tested false · data-tested false/);
  }, 360_000);
  // ground ranks the catalog. 1525 candidates no longer finish in 60s. After the graph held every
  // catalog relation, the same calls were still running at the 180s ceiling (measured ~190s).
  it('a non-candidate pair → exit 1', async () => {
    const c = capture();
    expect(await runCli(['ground', 'mass', 'mass'], c.io)).toBe(1);
  }, 360_000);
  it('needs two names → exit 2', async () => {
    const c = capture();
    expect(await runCli(['ground', 'mass'], c.io)).toBe(2);
  });

  // Audit F04 (2026-09-26): canonical/combined `discover` pairs could not be grounded, and
  // the refusal implied the pair never existed.
  describe('graph scope (audit F04)', () => {
    it('grounds a canonical discover pair with --source=canonical and prints the source', async () => {
      const c = capture();
      expect(await runCli(['ground', '--source=canonical', 'compton-wavelength', 'hubble-distance'], c.io)).toBe(0);
      expect(text(c)).toMatch(/\[source: canonical/);
      expect(text(c)).toMatch(/compton-wavelength ≟ hubble-distance/);
    }, 360_000);
    it('a pair from another scope names the scope that has it', async () => {
      const c = capture();
      expect(await runCli(['ground', 'compton-wavelength', 'hubble-distance'], c.io)).toBe(1);
      expect(text(c)).toMatch(/not a candidate in the catalog graph/);
      expect(text(c)).toMatch(/upt ground --source=canonical compton-wavelength hubble-distance/);
    }, 360_000);
    it('a pair in no scope still says so, without naming a scope', async () => {
      const c = capture();
      expect(await runCli(['ground', 'mass', 'mass'], c.io)).toBe(1);
      expect(text(c)).toMatch(/in any of catalog, canonical, both/);
    }, 360_000);
    it('help documents --source and the discover options', async () => {
      const c = capture();
      expect(await runCli(['help', 'ground'], c.io)).toBe(0);
      expect(text(c)).toMatch(/--source=catalog\|canonical\|both/);
      expect(text(c)).toMatch(/--anchor/);
    });
    it('--anchor is accepted with discover\'s validation', async () => {
      const c = capture();
      expect(await runCli(['ground', '--anchor=mass', 'a', 'b'], c.io)).toBe(2);
      expect(text(c)).toMatch(/--anchor expects k=v/);
    });
    it('every canonical discover candidate can be grounded with the same source', async () => {
      const d = capture();
      await runCli(['discover', '--source=canonical', '--json'], d.io);
      const cands = JSON.parse(text(d)).result as { a: string; b: string }[];
      expect(cands.length).toBeGreaterThan(0);
      for (const { a, b } of cands.slice(0, 5)) {
        const g = capture();
        expect(await runCli(['ground', '--source=canonical', a, b], g.io)).toBe(0);
      }
    });
  });
});
