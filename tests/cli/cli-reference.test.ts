/**
 * Help, the parser, and docs/CLI.md read one flag spec.
 *
 * A flag added to a command's FlagSpec without a description fails to load
 * (`renderFlagCatalog` throws). A description that is not in `upt help`
 * fails `undocumentedFlags`. A hand-edited docs/CLI.md fails the freshness
 * comparison against `renderCliReference`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { listCommandNames, resolveCommand } from '../../src/cli/command.js';
import { GLOBAL_FLAGS, renderFlagCatalog, undocumentedFlags } from '../../src/cli/flag-help.js';
import { runCli } from '../../src/cli/main.js';
import '../../src/cli/commands/index.js';
import { renderCliReference, stampReadme } from '../../scripts/cli-reference.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function capture(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await runCli(argv, {
    out: (line?: string) => {
      out += (line ?? '') + '\n';
    },
    err: (line?: string) => {
      err += (line ?? '') + '\n';
    },
    write: (s: string) => {
      out += s;
    },
  });
  return { code, out, err };
}

describe('flag spec is what help and the reference print', () => {
  it('CONTROL: a description absent from help is reported, and a present one is not', () => {
    const flags = [{ name: '--made-up', valueStyle: 'none' as const, description: 'made-up phrase for the control' }];
    expect(undocumentedFlags('nothing here', flags)).toEqual(['--made-up']);
    expect(undocumentedFlags('made-up phrase for the control', flags)).toEqual([]);
  });

  it('every registered command documents every flag it parses', () => {
    const names = listCommandNames();
    expect(names.length).toBeGreaterThan(20);
    const missing: string[] = [];
    for (const name of names) {
      const command = resolveCommand(name)!;
      expect(command.summary, name).toBeTruthy();
      expect(command.example, name).toMatch(/^upt /);
      expect(command.group, name).toBeTruthy();
      for (const flag of command.flags) {
        expect(flag.description, `${name} ${flag.name}`).toBeTruthy();
      }
      const catalog = renderFlagCatalog(command.flags);
      if (catalog !== '' && !command.help.endsWith(catalog)) missing.push(name);
      missing.push(...undocumentedFlags(command.help, command.flags).map((flag) => `${name} ${flag}`));
    }
    expect(missing).toEqual([]);
  });

  it('upt help names every global option from the same spec', async () => {
    const help = await capture(['help']);
    expect(help.code).toBe(0);
    expect(help.out).toContain(renderFlagCatalog(GLOBAL_FLAGS, 'Global options:'));
    expect(undocumentedFlags(help.out, GLOBAL_FLAGS)).toEqual([]);
  });

  it('docs/CLI.md and the README spans match the registry', () => {
    const cli = readFileSync(join(root, 'docs/CLI.md'), 'utf8');
    expect(cli).toBe(renderCliReference());
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    expect(readme).toBe(stampReadme(readme));
  });

  it('CONTROL: dropping a command from the rendered page is visible', () => {
    const page = renderCliReference();
    expect(page).toContain('### `audit`');
    expect(page.replace('### `audit`', '### `audited`')).not.toContain('### `audit`');
  });
});

describe('dispatcher flag contract', () => {
  it('upt eval --help prints the flag spec and does not evaluate', async () => {
    const help = await capture(['eval', '--help']);
    expect(help.code).toBe(0);
    expect(help.out).toContain('Print mathts or builtin');
    expect(help.out).not.toMatch(/^2\n/);
  });

  it('upt version rejects an extra argument and --json', async () => {
    const extra = await capture(['version', 'please']);
    expect(extra.code).toBe(2);
    expect(extra.err).toContain('takes no arguments');
    const json = await capture(['--json', 'version']);
    expect(json.code).toBe(2);
    expect(json.err).toContain('does not take --json');
  });

  it('upt help rejects a second argument', async () => {
    const extra = await capture(['help', 'eval', '--json']);
    expect(extra.code).toBe(2);
    expect(extra.err).toContain('at most one command');
  });

  it('a leading --json is the same envelope as a trailing --json', async () => {
    const leading = await capture(['--json', 'eval', '1+1']);
    const trailing = await capture(['eval', '--json', '1+1']);
    expect(leading.code).toBe(0);
    expect(trailing.code).toBe(0);
    expect(JSON.parse(leading.out)).toEqual(JSON.parse(trailing.out));
  });
});
