/**
 * The CLI reads "is this a number" through the one literal rule.
 *
 * `src/dimensional/ast-leaves.ts` owns the decimal-literal grammar (`DECIMAL_LITERAL`,
 * `isDecimalLiteral`). `src/cli/numeric-flag.ts` carried a local copy of the regex and its own
 * `isDecimalLiteral`, which `expr-print.ts` and `commands/symbolic.ts` imported. The copy is
 * gone: numeric-flag.ts (a support module) and expr-print.ts import the owner directly, and the
 * symbolic command reaches it through the CLI barrel (`ctx.api`), as a command reaches every
 * library value. The edge spellings keep their verdicts.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { realFlag } from '../../dist/cli/numeric-flag.js';
import * as cliApi from '../../dist/cli-api.js';
import { isDecimalLiteral } from '../../dist/dimensional/ast-leaves.js';

const SRC_CLI = join(import.meta.dirname, '../../src/cli');
const REGEX_TEXT = String.raw`(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/`;

function cliSources(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  for (const dir of [SRC_CLI, join(SRC_CLI, 'commands')]) {
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      out.push({ name: join(dir === SRC_CLI ? '' : 'commands', name), text: readFileSync(join(dir, name), 'utf8') });
    }
  }
  return out;
}

describe('one decimal-literal rule in the CLI', () => {
  it('no CLI module defines the decimal regex or its own isDecimalLiteral', () => {
    const copies = cliSources().filter((f) => f.text.includes(REGEX_TEXT) || /function isDecimalLiteral\b/.test(f.text));
    expect(copies.map((f) => f.name)).toEqual([]);
  });

  it('expr-print and numeric-flag import the owner; the symbolic command reads it through ctx.api', () => {
    const files = Object.fromEntries(cliSources().map((f) => [f.name, f.text]));
    expect(files['expr-print.ts']).toMatch(/import \{[^}]*\bisDecimalLiteral\b[^}]*\} from '\.\.\/dimensional\/ast-leaves\.js'/);
    expect(files['numeric-flag.ts']).toMatch(/from '\.\.\/dimensional\/ast-leaves\.js'/);
    expect(files['commands/symbolic.ts']).not.toMatch(/import \{[^}]*isDecimalLiteral/);
    expect(files['commands/symbolic.ts']).toMatch(/api\.isDecimalLiteral\(/);
    expect((cliApi as Record<string, unknown>).isDecimalLiteral).toBe(isDecimalLiteral);
  });

  it('the edge spellings keep their verdicts: 1e3 is a literal; 0x2, "", whitespace and Infinity are not', () => {
    expect(isDecimalLiteral('1e3')).toBe(true);
    expect(realFlag('map', '--x', '1e3')).toBe(1000);
    for (const s of ['0x2', '', ' ', 'Infinity']) {
      expect(isDecimalLiteral(s), JSON.stringify(s)).toBe(false);
      expect(() => realFlag('map', '--x', s), JSON.stringify(s)).toThrow(/is not a number/);
    }
  });
});
