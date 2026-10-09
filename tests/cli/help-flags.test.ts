/**
 * Every flag a command accepts is documented, and the top-level help does not hide one.
 *
 * The flags come from each registered command's own FlagSpec (what the parser accepts), not from a
 * list kept beside the help, so a flag added later is checked without editing this file. A command's
 * `upt help <name>` must name every one of its flags. Its block in the top-level `upt help` must
 * either name every flag too or say that `upt help <name>` lists them all; a block that shows some
 * flags and silently omits the rest reads as the complete usage (the audit's finding about `map`).
 * `--json` is global and documented once.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { listCommandNames, resolveCommand } from '../../dist/cli/command.js';

async function help(argv: string[]): Promise<string> {
  let s = '';
  await runCli(argv, { out: (l?: string) => void (s += (l ?? '') + '\n'), err: () => {}, write: (x: string) => void (s += x) });
  return s;
}

/** The top-level help block of one command: from its `  upt <name>` line to the next command's. */
function topBlock(top: string, name: string): string | null {
  const re = new RegExp(`\\n  upt ${name.replace(/[-]/g, '\\-')}(?=[ \\n])`);
  const m = re.exec(top);
  if (m === null) return null;
  const rest = top.slice(m.index + 1);
  const end = rest.search(/\n\n  upt /);
  return end < 0 ? rest : rest.slice(0, end);
}

const pointer = (name: string) => new RegExp(`\`upt help ${name}\` (lists|describes) every flag`);

describe('help documents every accepted flag', async () => {
  const top = await help(['help']);
  const names = listCommandNames();

  it('the registry is populated, so the loop below checks something', () => {
    expect(names.length).toBeGreaterThan(20);
    expect(names).toContain('map');
  });

  // `upt chain` is registered and is not in the top-level help. `upt help chain`
  // is the status. It accepts no flags. A second omitted command fails the set below.
  const unadvertised = new Set(['chain']);

  for (const name of names) {
    const flags = resolveCommand(name)!.flags.map((f) => f.name).filter((f) => f !== '--json');
    it(`upt help ${name} names each of its ${flags.length} flag(s)`, async () => {
      const own = await help(['help', name]);
      expect(flags.filter((f) => !own.includes(f))).toEqual([]);
    });
    it(`the top-level block for ${name} is complete or points to upt help ${name}`, () => {
      const block = topBlock(top, name);
      if (unadvertised.has(name)) {
        expect(block).toBeNull();
        return;
      }
      expect(block, `no top-level block for ${name}`).not.toBeNull();
      if (pointer(name).test(block!)) return;
      expect(flags.filter((f) => !block!.includes(f))).toEqual([]);
    });
  }

  it('chain is the only command omitted from the top-level help', () => {
    expect(names.filter((name) => topBlock(top, name) === null)).toEqual(['chain']);
  });

  it('control: the block check fails on a block that omits a flag and has no pointer', () => {
    const fake = '\n  upt map [--source=catalog]\n        Map things.\n\n  upt next\n';
    const block = topBlock(fake, 'map')!;
    expect(pointer('map').test(block)).toBe(false);
    expect(['--source', '--route'].filter((f) => !block.includes(f))).toEqual(['--route']);
  });

  it('control: a block cut at the next command does not borrow its flags', () => {
    const fake = '\n  upt map\n        Map.\n\n  upt route --route=X\n';
    expect(topBlock(fake, 'map')!.includes('--route')).toBe(false);
  });
});
