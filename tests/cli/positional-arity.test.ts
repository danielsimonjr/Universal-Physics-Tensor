/**
 * Nothing typed is silently dropped (cli/README.md §Hardening): a positional argument a
 * command does not read is refused as a usage error, exit 2, naming the token and the command.
 *
 * Found by the 2026-10-15 survey: `upt audit junk`, `upt canonical junk junk2`, `upt map junk`
 * and `upt probe scan extra junk` exited 0 with their normal output, on thirteen commands, while
 * `atlas`, `confront`, `version` and `metric` refused. The arity is now a declaration on the
 * `Command` (`positionals`; absent means none accepted) that the parser the dispatcher runs
 * checks once, so a command registered without the declaration refuses every positional and
 * cannot slip through: the first block iterates the registry.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { listCommandNames, resolveCommand } from '../../dist/cli/command.js';

const STRAY = 'zzz-stray-token';

async function run(args: string[]): Promise<{ code: number; stderr: string; stdout: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => out.push((s ?? '') + '\n'),
    err: (s?: string) => err.push((s ?? '') + '\n'),
    write: (s: string) => out.push(s),
  });
  return { code, stderr: err.join(''), stdout: out.join('') };
}

describe('every registered command either declares its positionals or refuses a stray one', () => {
  const names = listCommandNames();

  it('the registry is non-empty (an empty one would make the next test vacuous)', () => {
    expect(names.length).toBeGreaterThan(20);
  });

  it.each(names)('%s', async (name) => {
    const command = resolveCommand(name)!;
    if (command.positionals === undefined) {
      const r = await run([name, STRAY]);
      expect(r.code, r.stderr || r.stdout).toBe(2);
      expect(r.stderr).toContain(`upt ${name}: unexpected argument '${STRAY}'`);
      expect(r.stdout).toBe('');
    } else {
      // A command that reads positionals says how many; the parser refuses the rest.
      expect(command.positionals.max).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("the survey's repros", () => {
  it.each([
    ['audit', ['audit', 'junk'], 'junk'],
    ['canonical', ['canonical', 'junk', 'junk2'], 'junk'],
    ['map', ['map', 'junk'], 'junk'],
    ['symbolic', ['symbolic', 'junk'], 'junk'],
  ])('upt %s refuses the stray token with exit 2', async (_cmd, args, token) => {
    const r = await run(args);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(`unexpected argument '${token}'`);
  });

  it('a command with a bounded arity refuses the token past it, naming it', async () => {
    const atlas = await run(['atlas', 'ab-spring-lc', 'extra']);
    expect(atlas.code).toBe(2);
    expect(atlas.stderr).toContain("upt atlas: unexpected argument 'extra'");
    const confront = await run(['confront', 'be-11', 'extra']);
    expect(confront.code).toBe(2);
    expect(confront.stderr).toContain("upt confront: unexpected argument 'extra'");
    const ground = await run(['ground', 'mass', 'energy', 'extra']);
    expect(ground.code).toBe(2);
    expect(ground.stderr).toContain("upt ground: unexpected argument 'extra'");
    const testplan = await run(['testplan', 'be-58', 'extra']);
    expect(testplan.code).toBe(2);
    expect(testplan.stderr).toContain("upt testplan: unexpected argument 'extra'");
  });

  it('probe: the subverb is the one positional of scan; show takes its id and nothing more', async () => {
    const scan = await run(['probe', 'scan', 'extra', 'junk']);
    expect(scan.code).toBe(2);
    expect(scan.stderr).toContain("upt probe scan: unexpected argument 'extra'");
    const show = await run(['probe', 'show', 'fg-expr-x', 'extra']);
    expect(show.code).toBe(2);
    expect(show.stderr).toContain("upt probe show: unexpected argument 'extra'");
  });

  it('CONTROL: the same commands without the stray token still run', async () => {
    expect((await run(['audit'])).code).toBe(0);
    expect((await run(['atlas', 'ab-spring-lc'])).code).toBe(0);
    expect((await run(['probe', 'scan'])).code).toBe(0);
  });
});
