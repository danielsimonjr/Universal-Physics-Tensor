/**
 * The user guides under `docs/user/` run as a user would run them.
 *
 * Every line of a `bash` fence that is an `upt` (or `npx upt`) command is
 * spawned against the built CLI (`bin/upt.mjs`, which needs `bun run build`)
 * and must exit 0. What the guides say a command prints is read from the
 * guide itself, not a parallel table: a sentence whose leading code span is
 * a prefix of the command names the output in the `text` fence that follows
 * it (an intervening `bash` fence is skipped) or in the remaining code spans.
 * Each piece must sit in the guide text and in the command's stdout, so a
 * fabricated number, table row or `be-NNN` block fails. Neither guide may
 * hardcode a catalog count, which drifts the moment the catalog changes.
 */
import '../helpers/dist.js';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const guides: Record<string, string> = {
  'docs/user/getting-started.md': readFileSync(join(root, 'docs/user/getting-started.md'), 'utf8'),
  'docs/user/catalog.md': readFileSync(join(root, 'docs/user/catalog.md'), 'utf8'),
};

/** Split a command line into argv the way a shell would, honouring double quotes. */
function argv(command: string): string[] {
  const out: string[] = [];
  for (const match of command.matchAll(/"([^"]*)"|(\S+)/g)) out.push(match[1] ?? match[2]!);
  return out;
}

/** The command lines of every `bash` fence: `upt …` or `npx upt …`, with `npx ` stripped. */
function commandsOf(text: string): string[] {
  const out: string[] = [];
  const fences = [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]!);
  for (const fence of fences) {
    for (const line of fence.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)) {
      expect(
        /^(npx upt |upt |npm |bun |git |cd |#)/.test(line),
        `every bash-fence line is an upt command or shell plumbing, saw: ${line}`,
      ).toBe(true);
      if (line.startsWith('upt ')) out.push(line);
      else if (line.startsWith('npx upt ')) out.push(line.slice('npx '.length));
    }
  }
  return out;
}

/**
 * Prose sentences, outside fences. A sentence ends at a `.` or `:` that sits
 * outside backticks and is followed by whitespace, so a number inside a code
 * span does not end one, or at a paragraph break.
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

/**
 * The `text` fence that follows `sentence`, skipping an intervening `bash`
 * fence so a stating sentence may sit above the command it names.
 */
function fenceAfter(section: string, sentence: string): string | undefined {
  const at = section.indexOf(sentence);
  expect(at, sentence).toBeGreaterThanOrEqual(0);
  const match = /^\s*(?:```bash\n[\s\S]*?```\s*)?```text\n([\s\S]*?)```/.exec(section.slice(at + sentence.length));
  return match?.[1];
}

/**
 * What the guide says `command` prints, or `null` when no sentence states it
 * (`upt help` lists commands and has no pasted report). Two statements for
 * one command, or a stating sentence with no fence and no remaining code
 * spans, fail so a line added to a bash fence must say what it prints.
 */
function statedOutput(section: string, command: string): string[] | null {
  const leading = /^`([^`]+)`/;
  const spanOf = (sentence: string) => leading.exec(sentence)?.[1];
  const matching = sentences(section).filter((sentence) => {
    const span = spanOf(sentence);
    return span !== undefined && span.startsWith('upt ') && command.startsWith(span);
  });
  if (matching.length === 0) return null;
  // `upt eval` is a prefix of `upt eval "e + e_charge" …`. `upt eval "e"` is
  // not: the next character is `"` vs space. Keep the longest span so a short
  // stating sentence does not claim a longer command.
  const longest = Math.max(...matching.map((sentence) => spanOf(sentence)!.length));
  const best = matching.filter((sentence) => spanOf(sentence)!.length === longest);
  expect(best, `exactly one longest sentence states what \`${command}\` prints`).toHaveLength(1);
  const sentence = best[0]!;
  const following = sentence.endsWith(':') ? fenceAfter(section, sentence) : undefined;
  if (following !== undefined) {
    // One piece per non-empty line: a sampled table is not a contiguous
    // stdout substring, but a fabricated row or number still fails.
    const lines = following.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0);
    expect(lines, `the text fence for \`${command}\` is not empty`).not.toHaveLength(0);
    return lines;
  }
  const spans = [...sentence.matchAll(/`([^`]+)`/g)].map((match) => match[1]!).slice(1);
  expect(spans, `the sentence for \`${command}\` names its output in a text fence or code spans`).not.toHaveLength(0);
  return spans;
}

function textFenceLines(section: string): string[] {
  return [...section.matchAll(/```text\n([\s\S]*?)```/g)].flatMap((match) =>
    match[1]!.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0),
  );
}

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [join(root, 'bin/upt.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** A pasted result line (a number, optionally with a unit), not a table id. */
function resultPiece(prints: string[]): string | undefined {
  return prints.find((piece) => /^\s*[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?:\s+\S+)?\s*$/.test(piece));
}

/**
 * Mutate a distinctive number inside a stated piece. Short ids (`be-16`) are
 * skipped: `be-17` may already be in stdout, which would make the control pass
 * vacuously.
 */
function mutateGuideNumber(piece: string): string | null {
  const token = piece.match(/\d+\.\d+(?:e[+-]?\d+)?|\d+e[+-]?\d+|\d{8,}/)?.[0];
  if (token === undefined) return null;
  const mutated = token.replace(/\d(?=\D*$)/, (d) => String((Number(d) + 1) % 10));
  if (mutated === token) return null;
  return piece.replace(token, mutated);
}

/**
 * Stale catalog counts that have appeared in this repo's records (bridge,
 * evaluator, traced-edge, file-census). A hyphenated id (`be-121`) is not a
 * count. The lookbehind also refuses a preceding `.`, `+` or word character
 * so `0.109`, `3.109 m` and `1e+109` are not counts. A following unit token
 * is a physical quantity, not a catalog size (`121 nm`, `160 K`, `160 km`,
 * `152 MeV`, or any other); only a count word (`entries`, `bridges`, …)
 * keeps the number a count.
 */
const DRIFT_COUNT =
  /(?<![-.+\w])(?:109|152|121|696|160)(?![.+\w])(?!\s+(?!(?:catalog\s+)?(?:entries|bridges|records|quantities|models|files|tests|exports|constants)\b)[A-Za-zµμ])|^\d+ bridges/m;

function assertStdoutHolds(stdout: string, command: string, prints: string[]): void {
  for (const piece of prints) {
    expect(stdout, `stdout of \`${command}\` holds ${JSON.stringify(piece)}`).toContain(piece);
  }
}

describe('docs/user guides', () => {
  for (const [file, text] of Object.entries(guides)) {
    describe(file, () => {
      const commands = commandsOf(text);
      const stated = commands.map((command) => ({ command, prints: statedOutput(text, command) }));
      const withOutput = stated.filter((row) => row.prints !== null);

      it('has bash-fence commands to run (the check is not vacuous)', () => {
        expect(commands.length).toBeGreaterThanOrEqual(3);
      });

      it('every pasted text fence is the stated output of exactly one bash command', () => {
        const fences = textFenceLines(text);
        expect(fences.length, 'the guide pastes at least one command report').toBeGreaterThan(0);
        const claimed = withOutput.flatMap((row) => row.prints!);
        expect(claimed.sort(), 'every text-fence line is claimed by one command, and no command invents a line').toEqual(
          [...fences].sort(),
        );
      });

      for (const command of commands) {
        it(`\`${command}\` exits 0`, () => {
          const [, ...args] = argv(command);
          const result = runCli(args);
          expect(result.status, result.stderr).toBe(0);
        });
      }

      for (const { command, prints } of withOutput) {
        it(`\`${command}\` prints what the guide states it prints`, () => {
          const [, ...args] = argv(command);
          const result = runCli(args);
          expect(result.status, result.stderr).toBe(0);
          for (const piece of prints!) {
            expect(text, `the guide states ${JSON.stringify(piece)}`).toContain(piece);
            expect(result.stdout, `stdout of \`${command}\` holds ${JSON.stringify(piece)}`).toContain(piece);
          }
        });
      }

      it('states no catalog count that drifts', () => {
        expect(text, 'a bridge count in prose or a `text` fence drifts when the catalog changes').not.toMatch(DRIFT_COUNT);
      });

      it('CONTROL: the output matcher is sensitive to the stated value, not only to the words', () => {
        const first = withOutput.find((entry) => resultPiece(entry.prints!) !== undefined)!;
        const [, ...args] = argv(first.command);
        const result = runCli(args);
        const statedPiece = resultPiece(first.prints!)!;
        expect(result.stdout).toContain(statedPiece);
        expect(result.stdout).not.toContain(statedPiece.replace(/\d(?=\D*$)/, (d) => String((Number(d) + 1) % 10)));
      });

      it('CONTROL: a wrong digit in the guide fails the guide↔stdout coupling', () => {
        const mutations: { command: string; original: string; mutated: string }[] = [];
        for (const { command, prints } of withOutput) {
          for (const original of prints!) {
            const mutated = mutateGuideNumber(original);
            if (mutated === null) continue;
            mutations.push({ command, original, mutated });
          }
        }
        expect(mutations.length, 'at least one digit-bearing stated line can be mutated').toBeGreaterThan(0);
        for (const { command, original, mutated } of mutations) {
          const mutatedGuide = text.replace(original, mutated);
          expect(mutatedGuide, `the guide text actually changed for ${JSON.stringify(original)}`).not.toBe(text);
          expect(mutatedGuide, 'the mutated guide no longer states the real value').not.toContain(original);
          expect(mutatedGuide, 'the mutated guide states the wrong value').toContain(mutated);
          const extracted = statedOutput(mutatedGuide, command);
          expect(extracted, `statedOutput still finds \`${command}\` after the guide mutation`).not.toBeNull();
          expect(extracted).toContain(mutated);
          const [, ...args] = argv(command);
          const result = runCli(args);
          expect(result.status, result.stderr).toBe(0);
          expect(result.stdout).toContain(original);
          expect(result.stdout).not.toContain(mutated);
          expect(
            () => assertStdoutHolds(result.stdout, command, extracted!),
            `wrong digit only in the guide must fail for \`${command}\``,
          ).toThrow();
        }
      });
    });
  }

  it('CONTROL: the drift guard fails on a stale count and not on a hyphenated id', () => {
    for (const n of ['109', '152', '121', '696', '160'] as const) {
      expect(`there are ${n} entries`, n).toMatch(DRIFT_COUNT);
      expect(`be-${n}`, n).not.toMatch(DRIFT_COUNT);
      expect(`CE-${n}`, n).not.toMatch(DRIFT_COUNT);
    }
    expect('160 bridges in the catalog').toMatch(DRIFT_COUNT);
    expect('Node >=22.12.0').not.toMatch(DRIFT_COUNT);
    expect('0.109').not.toMatch(DRIFT_COUNT);
    expect('3.109 m').not.toMatch(DRIFT_COUNT);
    expect('1e+109').not.toMatch(DRIFT_COUNT);
    expect('121 nm').not.toMatch(DRIFT_COUNT);
    expect('160 K').not.toMatch(DRIFT_COUNT);
    expect('160 km').not.toMatch(DRIFT_COUNT);
    expect('152 MeV').not.toMatch(DRIFT_COUNT);
  });

  it('CONTROL: statedOutput prefers the longest matching command span', () => {
    const catalog = guides['docs/user/catalog.md']!;
    expect(statedOutput(catalog, 'upt eval "e"')).toEqual(['1.602176634e-19 C']);
    expect(statedOutput(catalog, 'upt eval "e + e_charge" e_charge=3C')).toEqual(['6 C']);
  });

  it('getting-started describes upt help as full usage, matching the live CLI', () => {
    const started = guides['docs/user/getting-started.md']!;
    expect(started).not.toMatch(/one-line description/);
    expect(started).toMatch(/full usage and flags/);
    // A closed "have none" list of command names goes stale the moment HELP
    // gains or loses an e.g. line. The guide does not enumerate one.
    expect(started).not.toMatch(/have none/);
    const help = runCli(['help']);
    expect(help.status, help.stderr).toBe(0);
    const blocks = help.stdout
      .split(/\n(?=  upt )/)
      .filter((block) => /^  upt /.test(block) && /\nFlags:/m.test(block));
    expect(blocks.length, 'upt help prints every registered command as a usage block').toBeGreaterThan(10);
    for (const block of blocks) {
      expect(block.split('\n').length, block.slice(0, 60)).toBeGreaterThan(2);
    }
    const withEg = blocks.filter((block) => /^\s*e\.g\.\s+upt /m.test(block));
    const withoutEg = blocks.filter((block) => !/^\s*e\.g\.\s+upt /m.test(block));
    expect(withEg.length, 'some commands include an e.g. line').toBeGreaterThan(0);
    expect(withoutEg.length, 'some commands have no e.g. line').toBeGreaterThan(0);
  });

  it('the guides link each other and the CLI reference, not the future tutorials directory', () => {
    const started = guides['docs/user/getting-started.md']!;
    const catalog = guides['docs/user/catalog.md']!;
    expect(started).toContain('](catalog.md)');
    expect(started).toContain('../CLI.md');
    expect(catalog).toContain('](getting-started.md)');
    expect(catalog).toContain('../CLI.md');
    for (const text of Object.values(guides)) expect(text).not.toContain('tutorials/');
  });
});
