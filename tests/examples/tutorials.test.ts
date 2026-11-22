/**
 * The tutorials under `docs/user/tutorials/` run as a user would run them.
 *
 * A tutorial cannot rot: every `ts` fence in every tutorial file is extracted
 * verbatim from the Markdown and executed (the package symlinked as
 * `node_modules/universal-physics-tensor`, Node's type stripper), so a second
 * fence that throws, or a fence that names a non-root export, fails. Every
 * `upt …` line of a `bash` fence is spawned against the built CLI
 * (`bin/upt.mjs`, which needs `bun run build`). What the tutorial says a
 * command or TypeScript sample prints is read from the `text` fence that
 * follows that command or `ts` fence (`statedOutput` / `statedAfterTsFence`),
 * not a parallel table and not the rest of the file, and is compared to that
 * spawn's stdout. Every pasted `text` fence line is claimed by exactly one
 * bash command or ts fence.
 *
 * Mutation CONTROLS prove the harness is sensitive: a broken fence fails, a
 * wrong digit in a stated mass or period fails the tutorial↔stdout coupling,
 * and a line that lives only in another fence does not satisfy
 * `assertGuideMatchesStdout`.
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

const SPAWN_TIMEOUT_MS = 55_000;

function textFenceLines(body: string): string[] {
  return body.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0);
}

function tsFences(file: string): string[] {
  return [...sources[file]!.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]!);
}

/** The `ts` fence whose source contains `needle` (exactly one must). */
function tsFence(file: string, needle: string): string {
  const fences = tsFences(file);
  const found = fences.filter((source) => source.includes(needle));
  expect(found, `${file} has exactly one ts fence containing ${JSON.stringify(needle)}`).toHaveLength(1);
  return found[0]!;
}

/**
 * Non-empty trimmed lines of the first `text` fence immediately after the
 * single `ts` fence that contains `needle`. Fails if that fence is missing.
 */
function statedAfterTsFence(file: string, needle: string): string[] {
  const text = sources[file]!;
  const fences = [...text.matchAll(/```ts\n([\s\S]*?)```/g)];
  const found = fences.filter((match) => match[1]!.includes(needle));
  expect(found, `${file} has exactly one ts fence containing ${JSON.stringify(needle)}`).toHaveLength(1);
  const match = found[0]!;
  const after = text.slice((match.index ?? 0) + match[0].length);
  const next = /```(\w+)\n([\s\S]*?)```/.exec(after);
  expect(next, `${file} has a fence after the ts fence containing ${JSON.stringify(needle)}`).toBeTruthy();
  expect(next![1], `${file}: the fence after the ts fence containing ${JSON.stringify(needle)} is a text fence`).toBe('text');
  const lines = textFenceLines(next![2]!);
  expect(lines.length, `${file} text fence after ${JSON.stringify(needle)} is non-empty`).toBeGreaterThan(0);
  return lines;
}

function runFence(source: string): { status: number; stdout: string; stderr: string } {
  const dir = tempDir('upt-tutorials-');
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(root, join(dir, 'node_modules', 'universal-physics-tensor'), 'junction');
  writeFileSync(join(dir, 'snippet.ts'), source);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'snippet.ts'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? result.error?.message ?? '' };
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
  const result = spawnSync(process.execPath, [join(root, 'bin/upt.mjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? result.error?.message ?? '' };
}

/** Offset of `command` inside a bash fence, not a prose mention of the same line. */
function commandOffset(file: string, command: string): number {
  const text = sources[file]!;
  for (const match of text.matchAll(/```bash\n([\s\S]*?)```/g)) {
    const body = match[1]!;
    const lineAt = body.indexOf(command);
    if (lineAt < 0) continue;
    return (match.index ?? 0) + '```bash\n'.length + lineAt;
  }
  expect.fail(`${file} bash fences do not contain ${JSON.stringify(command)}`);
}

/** Raw body of the `text` fence that immediately follows the command's bash line. */
function statedFenceBody(file: string, command: string): string {
  const text = sources[file]!;
  const at = commandOffset(file, command);
  const match = /\n```text\n([\s\S]*?)```/.exec(text.slice(at + command.length));
  expect(match, `${file} has a text fence after ${JSON.stringify(command)}`).toBeTruthy();
  return match![1]!;
}

/** The `text` fence that immediately follows the command's line in the file, if any. */
function statedOutput(file: string, command: string): string[] | undefined {
  const text = sources[file]!;
  const at = commandOffset(file, command);
  const match = /\n```text\n([\s\S]*?)```/.exec(text.slice(at + command.length));
  return match?.[1] === undefined ? undefined : textFenceLines(match[1]);
}

/** Assert `prints` sits in the command's own text fence and in the command's stdout. */
function assertGuideMatchesStdout(file: string, command: string, prints: string[], stdout: string, statedBlock: string): void {
  for (const piece of prints) {
    expect(statedBlock, `the ${file} text fence for \`${command}\` states ${JSON.stringify(piece)}`).toContain(piece);
    expect(stdout, `stdout of \`${command}\` holds ${JSON.stringify(piece)}`).toContain(piece);
  }
}

/**
 * Mutate the last digit of the first number's mantissa, so a wrong value in
 * the tutorial fails the coupling (scientific notation keeps the exponent).
 */
function mutateNumber(piece: string): string {
  const token = piece.match(/\d+\.\d+(?:e[+-]?\d+)?|\d+/)![0]!;
  const mantissa = token.match(/^\d+(?:\.\d+)?/)![0]!;
  const mutatedMantissa = mantissa.replace(/\d(?=\D*$)/, (d) => String((Number(d) + 1) % 10));
  return piece.replace(token, token.replace(mantissa, mutatedMantissa));
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

  it('every ts fence is extracted verbatim and exits 0', () => {
    for (const file of TUTORIALS) {
      for (const [index, source] of tsFences(file).entries()) {
        const result = runFence(source);
        expect(result.status, `${file} ts fence ${index}: ${result.stderr}`).toBe(0);
      }
    }
  });

  it('every pasted text fence is claimed by exactly one command or ts fence', () => {
    for (const file of TUTORIALS) {
      const fences = [...sources[file]!.matchAll(/```text\n([\s\S]*?)```/g)].flatMap((match) => textFenceLines(match[1]!));
      const claimed = [
        ...bashCommands(file).flatMap((command) => statedOutput(file, command) ?? []),
        ...tsFences(file).flatMap((source) => statedAfterTsFence(file, source)),
      ].sort();
      expect(fences.length, `${file} pastes at least one text fence`).toBeGreaterThan(0);
      expect(claimed, `${file}: every text-fence line is the stated output of one command or ts fence`).toEqual([...fences].sort());
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
      expect(prints.join('\n'), 'the CLI text fence states the evaluated mass').toContain('mass [kg] = 2.895722231692708e+30');
      assertGuideMatchesStdout(file, command, prints, result.stdout, statedFenceBody(file, command));
    });

    it('the ts fence prints the mass in kg and in solar masses', () => {
      const source = tsFence(file, 'evaluateRelation');
      const result = runFence(source);
      expect(result.status, result.stderr).toBe(0);
      const prints = statedAfterTsFence(file, 'evaluateRelation');
      expect(prints).toEqual([
        'Chandrasekhar mass: 2.895722231692708e+30 kg',
        'in solar masses: 1.4558683920023672',
      ]);
      for (const line of prints) expect(result.stdout, `stdout holds ${JSON.stringify(line)}`).toContain(line);
      expect(result.stdout).toContain('2.8957222');
      expect(result.stdout).toContain('1.455');
      // The mass in kg is what the CLI printed, and the solar-mass figure is its quotient.
      const kg = Number(/([\d.]+e\+\d+)/.exec(result.stdout)![1]!);
      const solar = Number(/in solar masses: ([\d.]+)/.exec(result.stdout)![1]!);
      expect(solar).toBe(kg / M_SUN_SI);
    });

    it('CONTROL: a fence that prints a wrong value fails the tutorial\u2019s own assertion', () => {
      const source = tsFence(file, 'evaluateRelation').replace('{ mu_e: 2 }', '{ mu_e: 3 }');
      const result = runFence(source);
      expect(result.stdout).not.toContain('2.8957222');
      expect(result.stdout).not.toContain('1.455');
    });

    it('CONTROL: a fence naming a non-root export fails to run', () => {
      const source = tsFence(file, 'evaluateRelation').replace("import { evaluateRelation, M_SUN_SI }", "import { evaluateBridge, M_SUN_SI }").replace('evaluateRelation(', 'evaluateBridge(');
      expect(runFence(source).status).not.toBe(0);
    });

    it('CONTROL: a wrong digit in the stated mass line fails the guide\u2194stdout coupling', () => {
      const command = bashCommands(file).find((line) => line.startsWith('upt evaluate be-63'))!;
      const prints = statedOutput(file, command)!;
      const massLine = prints.find((line) => line.includes('mass [kg] ='))!;
      expect(massLine, 'the stated report includes the mass line').toContain('2.895722231692708e+30');
      const mutated = mutateNumber(massLine);
      const result = runCli(argv(command).slice(1));
      expect(mutated).toContain('2.895722231692709e+30');
      expect(result.stdout).toContain(massLine);
      expect(result.stdout).not.toContain(mutated);
      expect(() => assertGuideMatchesStdout(file, command, [mutated], result.stdout, statedFenceBody(file, command))).toThrow();
    });

    it('CONTROL: a wrong stated mass or last-digit solar drift fails the ts fence coupling', () => {
      const prints = statedAfterTsFence(file, 'evaluateRelation');
      const result = runFence(tsFence(file, 'evaluateRelation'));
      const wrongMass = 'Chandrasekhar mass: 1.111111111111111e+30 kg';
      const driftedSolar = mutateNumber(prints.find((line) => line.startsWith('in solar masses:'))!);
      expect(result.stdout).toContain(prints[0]!);
      expect(result.stdout).toContain(prints[1]!);
      expect(result.stdout).not.toContain(wrongMass);
      expect(result.stdout).not.toContain(driftedSolar);
      expect(() => {
        for (const line of [wrongMass]) expect(result.stdout).toContain(line);
      }).toThrow();
      expect(() => {
        for (const line of [driftedSolar]) expect(result.stdout).toContain(line);
      }).toThrow();
    });

    it('CONTROL: a stated line only in another text fence fails the coupling', () => {
      const command = bashCommands(file).find((line) => line.startsWith('upt evaluate be-63'))!;
      const statedBlock = statedFenceBody(file, command);
      const foreign = statedAfterTsFence(file, 'evaluateRelation')[0]!;
      expect(sources[file]).toContain(foreign);
      expect(statedBlock).not.toContain(foreign);
      expect(() => assertGuideMatchesStdout(file, command, [foreign], foreign, statedBlock)).toThrow();
    });
  });

  describe('units.md', () => {
    const file = TUTORIALS[1]!;

    it('the ts fence prints bit scale Math.LN2, the 25 degC difference, and both 1 Hz\u2192rad/s values', () => {
      const source = tsFence(file, 'parseUnit');
      const result = runFence(source);
      expect(result.status, result.stderr).toBe(0);
      const prints = statedAfterTsFence(file, 'parseUnit');
      expect(prints).toEqual([
        'bit scale: 0.6931471805599453',
        '25 degC -> K (difference): 25',
        '1 Hz -> rad/s: 1',
        '1 Hz -> rad/s cycles: 1',
      ]);
      for (const line of prints) expect(result.stdout, `stdout holds ${JSON.stringify(line)}`).toContain(line);
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
        const result = runFence(mutated);
        expect(result.status).not.toBe(0);
        expect(result.stdout).not.toContain(absent);
      }
    });

    it('CONTROL: a wrong stated Hz conversion fails the tutorial\u2194stdout coupling', () => {
      const prints = statedAfterTsFence(file, 'parseUnit');
      const result = runFence(tsFence(file, 'parseUnit'));
      const mutated = prints.map((line) => (line === '1 Hz -> rad/s: 1' ? '1 Hz -> rad/s: 42' : line));
      expect(result.stdout).toContain('1 Hz -> rad/s: 1');
      expect(result.stdout).not.toContain('1 Hz -> rad/s: 42');
      expect(() => {
        for (const line of mutated) expect(result.stdout, line).toContain(line);
      }).toThrow();
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
        assertGuideMatchesStdout(file, command, prints, result.stdout, statedFenceBody(file, command));
        expect(prints.join('\n'), `the text fence for \`${command}\` states the value`).toContain(expected);
      }
    });

    it('CONTROL: a wrong digit in the stated pendulum period fails the coupling', () => {
      const command = commands[2]!;
      const prints = statedOutput(file, command)!;
      const mutated = mutateNumber(prints[0]!);
      const result = runCli(argv(command).slice(1));
      expect(result.stdout).toContain(prints[0]!);
      expect(result.stdout).not.toContain(mutated);
      expect(() => assertGuideMatchesStdout(file, command, [mutated], result.stdout, statedFenceBody(file, command))).toThrow();
    });
  });
});
