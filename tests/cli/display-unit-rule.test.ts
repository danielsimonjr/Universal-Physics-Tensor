/**
 * One rule labels a quantity in every `upt` command (#705). `primaryUnitLabel` reads a declared
 * `displayUnit`, then one coherent named unit, then the SI base form. A command never calls
 * `siUnitOf` or `derivedUnitOf` itself, so two commands cannot print one quantity two ways.
 * Needs `npm run build`.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { runCli } from '../../dist/cli/main.js';
import * as api from '../../dist/cli-api.js';
import { primaryUnitLabel } from '../../dist/cli/expr-print.js';

async function run(args: string[]): Promise<string> {
  let out = '';
  await runCli(args, {
    out: (line?: string) => {
      out += `${line ?? ''}\n`;
    },
    err: () => {},
    write: (s: string) => {
      out += s;
    },
  });
  return out;
}

const COMMANDS_DIR = new URL('../../src/cli/commands/', import.meta.url);

describe('the display-unit rule (#705)', () => {
  it('T1: no command labels a quantity without primaryUnitLabel', () => {
    // A command that must print a base form on purpose needs an explicit entry here, with a reason.
    const allowed: Record<string, string> = {};
    const offenders: string[] = [];
    for (const file of readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      if (file in allowed) continue;
      readFileSync(new URL(file, COMMANDS_DIR), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\b(siUnitOf|derivedUnitOf)\(/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders, 'label a quantity through primaryUnitLabel (src/cli/expr-print.ts)').toEqual([]);
  });

  it('T2: the rule reads displayUnit, then a named unit, then the base form', () => {
    expect(primaryUnitLabel(api, 'thermal-conductivity', api.quantityRecord('thermal-conductivity')!.dimension)).toBe('W/(m*K)');
    expect(primaryUnitLabel(api, 'mass', api.quantityRecord('mass')!.dimension)).toBe('kg');
    expect(primaryUnitLabel(api, 'zqx-unknown', api.quantityRecord('landauer-erasure-energy')!.dimension)).toBe('J');
  });

  it('T4: the result line of upt symbolic names its unit', async () => {
    for (const args of [['symbolic'], ['symbolic', '--simplify']]) {
      const lines = (await run(args)).split('\n').filter((l) => l.includes('value @ mass = M_sun:'));
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toMatch(/M_sun:\s+\S+ J(\s|$)/);
      expect(lines[1]).toMatch(/M_sun:\s+\S+ K(\s|$)/);
      for (const l of lines) expect(l).not.toContain('kg*m^2');
    }
  });

  it('T3: the input row and the JSON keep the unit kg', async () => {
    expect(await run(['symbolic'])).toMatch(/\n\s+mass\s+input quantity mass .*\s+kg\s+evaluation point/);
    const json = JSON.parse(await run(['symbolic', '--json'])) as { result: { symbols: { symbol: string; unit: string }[] }[] };
    const rows = json.result.flatMap((c) => c.symbols ?? []).filter((r) => r.symbol === 'mass');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.unit).toBe('kg');
  });
});
