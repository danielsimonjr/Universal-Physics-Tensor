/**
 * The code fences in the root `README.md` run as a user would run them.
 *
 * TypeScript fences import from `universal-physics-tensor` (the built package,
 * linked into a scratch `node_modules`), so a fence that names a non-root
 * export fails to import. The composing and unit fences also print the values
 * their comments state, and the test reads those back.
 *
 * The bash fence under "First five minutes" is run line by line against the
 * built CLI (`bin/upt.mjs`, which needs `bun run build`). What the README says
 * each command prints is read from the README itself, not retyped here: a
 * `text` fence that follows the command's sentence, or the code spans of that
 * sentence. A command with no stated output, or two statements for one
 * command, fails the test, so a line added to the fence must say what it prints.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';

const root = resolve(import.meta.dirname, '../..');
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
const fences = [...readme.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) => match[1]!);
const fence = (needle: string): string => {
  const found = fences.filter((source) => source.includes(needle));
  expect(found, needle).toHaveLength(1);
  return found[0]!;
};

function runFence(source: string): { status: number; stdout: string; stderr: string } {
  const dir = tempDir('upt-readme-');
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(root, join(dir, 'node_modules', 'universal-physics-tensor'));
  writeFileSync(join(dir, 'snippet.ts'), source);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'snippet.ts'], { cwd: dir, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('README.md TypeScript fences', () => {
  it('every fence imports only from the package root', () => {
    expect(fences.length).toBeGreaterThanOrEqual(3);
    for (const source of fences) {
      for (const match of source.matchAll(/from '([^']+)'/g)) expect(match[1]).toBe('universal-physics-tensor');
    }
  });

  it('every fence runs', () => {
    for (const source of fences) {
      const result = runFence(source);
      expect(result.status, result.stderr).toBe(0);
    }
  });

  it('the composing fence gives the erasure cost and confidence its comments state', () => {
    const source = fence('composeEdges') + '\nconsole.log(JSON.stringify([erasureCost.evaluate({ mass: M_SUN_KG }), erasureCost.confidence]));\n';
    const result = runFence(source);
    expect(result.status, result.stderr).toBe(0);
    const [value, confidence] = JSON.parse(result.stdout.trim()) as [number, string];
    expect(value).toBeCloseTo(5.9e-31, 32);
    expect(confidence).toBe('highly-speculative');
  });

  it('the unit fence prints the conversion its comment states', () => {
    const source = fence('convertValue') + "\nconsole.log(JSON.stringify(convertValue('25degC', 'K')));\n";
    const result = runFence(source);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ value: 298.15, given: 'degC', affine: 'celsius' });
    expect(source).toContain("{ value: 298.15, given: 'degC', affine: 'celsius' }");
  });
});

/** The section between the "First five minutes" heading and the next `## ` heading. */
function firstFiveMinutes(): string {
  const start = readme.indexOf('\n## First five minutes\n');
  expect(start, 'README has a "First five minutes" section').toBeGreaterThan(0);
  const rest = readme.slice(start + 1);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
}

/** The `npx upt …` lines of the section's bash fence, as `upt …` command text. */
function bashCommands(section: string): string[] {
  const bash = [...section.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]!);
  expect(bash, 'one bash fence in "First five minutes"').toHaveLength(1);
  const lines = bash[0]!.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines) expect(line, 'every fence line is an `npx upt` command').toMatch(/^npx upt /);
  return lines.map((line) => line.slice('npx '.length));
}

/** Split `upt eval "2*pi"` into argv the way a shell would, honouring double quotes. */
function argv(command: string): string[] {
  const out: string[] = [];
  for (const match of command.matchAll(/"([^"]*)"|(\S+)/g)) out.push(match[1] ?? match[2]!);
  return out;
}

/**
 * Prose sentences of the section, outside fences. A sentence ends at a `.` or `:` that sits
 * outside backticks and is followed by whitespace, so the `9.81` inside a code span does not end
 * one, or at a paragraph break, so a heading does not run into the paragraph after it.
 */
function sentences(section: string): string[] {
  const prose = section.replace(/```[\s\S]*?```/g, '\n');
  const out: string[] = [];
  let current = '';
  let inCode = false;
  const push = () => {
    if (current.trim()) out.push(current.trim());
    current = '';
  };
  for (let i = 0; i < prose.length; i++) {
    const ch = prose[i]!;
    if (ch === '`') inCode = !inCode;
    current += ch;
    const next = prose[i + 1];
    if (!inCode && (ch === '.' || ch === ':') && (next === undefined || /\s/.test(next))) push();
    else if (ch === '\n' && next === '\n') push();
  }
  push();
  return out;
}

/** The `text` fence that immediately follows the given sentence in the section, if any. */
function fenceAfter(section: string, sentence: string): string | undefined {
  const at = section.indexOf(sentence);
  expect(at, sentence).toBeGreaterThanOrEqual(0);
  const match = /^\s*```text\n([\s\S]*?)```/.exec(section.slice(at + sentence.length));
  return match?.[1];
}

/**
 * What the README says `command` prints: the sentence whose leading code span is a prefix of the
 * command (`` `upt derive` `` stands for the whole derive line) names the output either in the
 * `text` fence that follows it or in its remaining code spans.
 */
function statedOutput(section: string, command: string): string[] {
  const leading = /^`([^`]+)`/;
  const matching = sentences(section).filter((sentence) => {
    const span = leading.exec(sentence)?.[1];
    return span !== undefined && span.startsWith('upt ') && command.startsWith(span);
  });
  expect(matching, `exactly one sentence states what \`${command}\` prints`).toHaveLength(1);
  const sentence = matching[0]!;
  const following = sentence.endsWith(':') ? fenceAfter(section, sentence) : undefined;
  if (following !== undefined) return [following.trimEnd()];
  const spans = [...sentence.matchAll(/`([^`]+)`/g)].map((match) => match[1]!).slice(1);
  expect(spans, `the sentence for \`${command}\` names its output in code spans`).not.toHaveLength(0);
  return spans;
}

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [resolve(root, 'bin/upt.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('README.md "First five minutes" bash fence', () => {
  const section = firstFiveMinutes();
  const commands = bashCommands(section);

  it('the fence has the five commands the section promises', () => {
    expect(commands).toHaveLength(5);
  });

  for (const command of commands) {
    it(`\`${command}\` exits 0 and prints what the README says it prints`, () => {
      const expected = statedOutput(section, command);
      const [, ...args] = argv(command);
      const result = runCli(args);
      expect(result.status, result.stderr).toBe(0);
      for (const piece of expected) {
        expect(result.stdout, `stdout of \`${command}\` holds ${JSON.stringify(piece)}`).toContain(piece);
      }
    });
  }

  it('CONTROL: the matcher is sensitive to the stated value, not only to the words', () => {
    const result = runCli(argv(commands[0]!).slice(1));
    const [stated] = statedOutput(section, commands[0]!);
    expect(result.stdout).toContain(stated!);
    expect(result.stdout).not.toContain(stated!.replace(/\d(?=\D*$)/, (d) => String((Number(d) + 1) % 10)));
  });
});

describe('README.md Quick Start', () => {
  it('the sentence about what the npm package ships names every directory in package.json `files`', () => {
    const files = (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { files: string[] }).files;
    const dirs = files.filter((entry) => statSync(resolve(root, entry)).isDirectory());
    expect(dirs.length, 'package.json ships at least one directory').toBeGreaterThan(0);
    const sentence = sentences(readme).find((candidate) => candidate.startsWith('The npm package ships'));
    expect(sentence, 'README states what the npm package ships').toBeDefined();
    for (const dir of dirs) expect(sentence, `README names \`${dir}/\` as shipped`).toContain(`\`${dir}/\``);
  });
});
