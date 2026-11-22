/**
 * The tutorials under `docs/user/tutorials/` run as a user would run them.
 *
 * A tutorial cannot rot: every `ts` fence is extracted verbatim from the
 * Markdown and executed (the package symlinked as `node_modules/universal-physics-tensor`,
 * Node's type stripper), so a fence that names a non-root export or prints a
 * value the prose does not state fails. Every `upt …` line of a `bash` fence is
 * spawned against the built CLI (`bin/upt.mjs`, which needs `bun run build`),
 * and what the tutorial says a command prints is read from the tutorial's own
 * `text` fences, not a parallel table.
 *
 * Mutation CONTROLS prove the harness is sensitive: a broken fence fails, and a
 * wrong digit in the tutorial fails the tutorial↔stdout coupling.
 */
import '../helpers/dist.js';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';
import { M_SUN_SI } from '../../src/index.js';

const root = resolve(import.meta.dirname, '../..');
const TUTORIALS = ['docs/user/tutorials/evaluate-a-bridge.md', 'docs/user/tutorials/units.md', 'docs/user/tutorials/search-and-explain.md'];
const sources = Object.fromEntries(TUTORIALS.map((file) => [file, readFileSync(resolve(root, file), 'utf8')])) as Record<string, string>;

/** The `ts` fence whose source contains `needle` (exactly one must). */
function tsFence(file: string, needle: string): string {
  const fences = [...sources[file]!.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]!);
  const found = fences.filter((source) => source.includes(needle));
  expect(found, `${file} has exactly one ts fence containing ${JSON.stringify(needle)}`).toHaveLength(1);
  return found[0]!;
}

function runFence(source: string): { status: number; stdout: string; stderr: string } {
  const dir = tempDir('upt-tutorials-');
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(root, join(dir, 'node_modules', 'universal-physics-tensor'), 'junction');
  writeFileSync(join(dir, 'snippet.ts'), source);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'snippet.ts'], { cwd: dir, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** Split a command line into argv the way a shell would, honouring double quotes. */
function argv(command: string): string[] {
  const out: string[] = [];
  for (const match of command.matchAll(/"([^"]*)"|(\S+)/g)) out.push(match[1] ?? match[2]!);
  return out;
}

/** The `upt …` lines of the file's `bash` fences. */
function bashCommands(file: string): string[] {
  const out: string[] = [];
  const fences = [...sources[file]!.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]!);
  for (const fence of fences) {
    for (const line of fence.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)) {
      expect(line, `every bash-fence line in ${file} is an upt command, saw: ${line}`).toMatch(/^upt /);
      out.push(line);
    }
  }
  return out;
}

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [join(root, 'bin/upt.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** The `text` fence that immediately follows the command's line in the file, if any. */
function statedOutput(file: string, command: string): string[] | undefined {
  const text = sources[file]!;
  const at = text.indexOf(command);
  expect(at, `${file} contains the command line ${JSON.stringify(command)}`).toBeGreaterThanOrEqual(0);
  const match = /\n```text\n([\s\S]*?)```/.exec(text.slice(at + command.length));
  return match?.[1]!.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0);
}

/** Assert `prints` sits in the tutorial text and in the command's stdout. */
function assertGuideMatchesStdout(file: string, command: string, prints: string[], stdout: string): void {
  for (const piece of prints) {
    expect(sources[file], `the tutorial states ${JSON.stringify(piece)}`).toContain(piece);
    expect(stdout, `stdout of \`${command}\` holds ${JSON.stringify(piece)}`).toContain(piece);
  }
}

/** Mutate the last digit of a number, so a wrong value in the tutorial fails the coupling. */
function mutateNumber(piece: string): string {
  const token = piece.match(/\d+\.\d+(?:e[+-]?\d+)?|\d+/)![0]!;
  return piece.replace(token, token.replace(/\d(?=\D*$)/, (d) => String((Number(d) + 1) % 10)));
}

describe('docs/user/tutorials', () => {
  it('all three tutorial files exist with code fences, and the tutorials carry both kinds', () => {
    for (const file of TUTORIALS) {
      const text = sources[file]!;
      const fences = [...text.matchAll(/```(?:ts|bash)\n/g)].length;
      expect(fences, `${file} has runnable code fences`).toBeGreaterThan(0);
    }
    const count = (file: string, kind: string) => [...sources[file]!.matchAll(new RegExp('```' + kind + '\\n', 'g'))].length;
    expect(TUTORIALS.reduce((sum, file) => sum + count(file, 'ts'), 0), 'the tutorials import the library').toBeGreaterThanOrEqual(2);
    expect(TUTORIALS.reduce((sum, file) => sum + count(file, 'bash'), 0), 'the tutorials run CLI commands too').toBeGreaterThanOrEqual(4);
  });

  it('every ts fence imports only from the package root', () => {
    for (const [file, text] of Object.entries(sources)) {
      for (const fence of [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]!)) {
        for (const match of fence.matchAll(/from '([^']+)'/g)) expect(match[1], file).toBe('universal-physics-tensor');
        expect(fence, `${file} has no relative-src import`).not.toContain('../src/');
      }
    }
  });

  describe('evaluate-a-bridge.md', () => {
    const file = TUTORIALS[0]!;

    it('the `upt evaluate be-63 mu_e=2` bash line exits 0 and prints the Chandrasekhar report', () => {
      const command = bashCommands(file).find((line) => line.startsWith('upt evaluate be-63'))!;
      const result = runCli(argv(command).slice(1));
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Chandrasekhar');
      const prints = statedOutput(file, command)!;
      assertGuideMatchesStdout(file, command, prints, result.stdout);
    });

    it('the ts fence prints the mass in kg and in solar masses', () => {
      const source = tsFence(file, 'evaluateRelation');
      const result = runFence(source);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('2.8957222');
      expect(result.stdout).toContain('1.455');
      // The mass in kg is what the CLI printed, and the solar-mass figure is its quotient.
      const kg = Number(/([\d.]+e\+\d+)/.exec(result.stdout)![1]!);
      const solar = Number(/in solar masses: ([\d.]+)/.exec(result.stdout)![1]!);
      expect(solar).toBe(kg / M_SUN_SI);
    });

    it('CONTROL: a fence that prints a wrong value fails the tutorial\u2019s own assertion', () => {
      const source = tsFence(file, 'evaluateRelation').replace('{ mu_e: 2 }', '{ mu_e: 3 }');
      expect(runFence(source).stdout).not.toContain('2.8957222');
      expect(runFence(source).stdout).not.toContain('1.455');
    });

    it('CONTROL: a fence naming a non-root export fails to run', () => {
      const source = tsFence(file, 'evaluateRelation').replace("import { evaluateRelation, M_SUN_SI }", "import { evaluateBridge, M_SUN_SI }").replace('evaluateRelation(', 'evaluateBridge(');
      expect(runFence(source).status).not.toBe(0);
    });

    it('CONTROL: a wrong digit in the stated report fails the guide\u2194stdout coupling', () => {
      const command = bashCommands(file).find((line) => line.startsWith('upt evaluate be-63'))!;
      const prints = statedOutput(file, command)!;
      const mutated = mutateNumber(prints[0]!);
      const result = runCli(argv(command).slice(1));
      expect(result.stdout).toContain(prints[0]!);
      expect(result.stdout).not.toContain(mutated);
      expect(() => assertGuideMatchesStdout(file, command, [mutated], result.stdout)).toThrow();
    });
  });

  describe('units.md', () => {
    const file = TUTORIALS[1]!;

    it('the ts fence prints bit scale Math.LN2, the 25 degC difference, and both 1 Hz\u2192rad/s values', () => {
      const source = tsFence(file, 'parseUnit');
      const result = runFence(source);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toMatch(/^bit scale: 0\.6931471805599453$/m);
      expect(result.stdout).toMatch(/^25 degC -> K \(difference\): 25$/m);
      expect(result.stdout).toMatch(/^1 Hz -> rad\/s: 1$/m);
      expect(result.stdout).toMatch(/^1 Hz -> rad\/s cycles: 1$/m);
    });

    it('CONTROL: the fence\u2019s printed values are pinned, not matched loosely', () => {
      const source = tsFence(file, 'parseUnit');
      for (const [broken, absent] of [
        ['convertValue(\'25 degC\', \'K\', \'difference\')', '25 degC -> K (difference): 25'],
        ['parseUnit(\'bit\')', 'bit scale: 0.6931471805599453'],
      ] as const) {
        const mutated = source.replace(broken, 'undefined as never');
        expect(mutated).not.toBe(source);
        expect(runFence(mutated).status).not.toBe(0);
        expect(runFence(mutated).stdout).not.toContain(absent);
      }
    });
  });

  describe('search-and-explain.md', () => {
    const file = TUTORIALS[2]!;

    const commands = bashCommands(file);
    expect(commands.length, 'the tutorial runs three commands').toBe(3);

    it('the stated outputs of the three commands are the real stdout', () => {
      const stated = [
        ['CE-pendulum-period', 'upt search pendulum'],
        ['6.16842971641034e-8', 'upt explain hawking-temperature mass=1Msun'],
        ['2.0064092925890407', 'upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665'],
      ] as const;
      for (const [expected, command] of stated) {
        expect(commands, command).toContain(command);
        const result = runCli(argv(command).slice(1));
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout, `stdout of \`${command}\` holds ${expected}`).toContain(expected);
        const prints = statedOutput(file, command)!;
        assertGuideMatchesStdout(file, command, prints, result.stdout);
        expect(prints.join('\n'), `the text fence for \`${command}\` states the value`).toContain(expected);
      }
    });

    it('every pasted text fence is claimed by exactly one command', () => {
      const fences = [...sources[file]!.matchAll(/```text\n([\s\S]*?)```/g)].flatMap((match) =>
        match[1]!.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0),
      );
      const claimed = commands.flatMap((command) => statedOutput(file, command) ?? []).sort();
      expect(fences.length).toBeGreaterThan(0);
      expect(claimed, 'every text-fence line is the stated output of one command').toEqual([...fences].sort());
    });

    it('CONTROL: a wrong digit in the stated pendulum period fails the coupling', () => {
      const command = commands[2]!;
      const prints = statedOutput(file, command)!;
      const mutated = mutateNumber(prints[0]!);
      const result = runCli(argv(command).slice(1));
      expect(result.stdout).toContain(prints[0]!);
      expect(result.stdout).not.toContain(mutated);
      expect(() => assertGuideMatchesStdout(file, command, [mutated], result.stdout)).toThrow();
    });
  });
});
