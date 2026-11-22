/**
 * The user guides under `docs/user/` run as a user would run them.
 *
 * Every line of a `bash` fence that is an `upt` (or `npx upt`) command is
 * spawned against the built CLI (`bin/upt.mjs`, which needs `bun run build`)
 * and must exit 0. What the guides say a command prints is checked in both
 * directions: the guide text must contain the substring, and the command's
 * stdout must print it. Neither guide may hardcode a catalog count, which
 * drifts the moment the catalog changes.
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

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [join(root, 'bin/upt.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/**
 * What a guide states a command prints: one row per statement. The substring
 * must sit in the guide's own text (as a `text` fence or code span) and come
 * out of the command's stdout, so retyping an invented value fails twice.
 */
const documented: { file: keyof typeof guides; command: string; prints: string[] }[] = [
  {
    file: 'docs/user/getting-started.md',
    command: 'upt eval "2*pi*sqrt(1/9.81)"',
    prints: ['2.0060666807106475'],
  },
  {
    file: 'docs/user/getting-started.md',
    command: 'upt derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"',
    prints: ['dimensionally determined up to a constant:  period ∝ length^0.5·gravity^-0.5', 'recovered prefactor ≈ 6.28318530717959'],
  },
  {
    file: 'docs/user/getting-started.md',
    command: 'upt explain hawking-temperature mass=1Msun',
    prints: ['Recovered value: 6.16842971641034e-8'],
  },
  {
    file: 'docs/user/getting-started.md',
    command: 'upt evaluate be-63 mu_e=2',
    prints: ['mass [kg] = 2.895722231692708e+30'],
  },
  {
    file: 'docs/user/getting-started.md',
    command: 'upt search pendulum',
    prints: ['CE-pendulum-period'],
  },
  {
    file: 'docs/user/catalog.md',
    command: 'upt atlas ab-pendulum-linear',
    prints: ['model-pendulum (oscillators) → model-spring (oscillators)'],
  },
  {
    file: 'docs/user/catalog.md',
    command: 'upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665',
    prints: ['2.0064092925890407'],
  },
  {
    file: 'docs/user/catalog.md',
    command: 'upt eval "hbar*c/fm" fm=1fm',
    prints: ['3.1615267734966904e-11 J'],
  },
  {
    file: 'docs/user/catalog.md',
    command: 'upt eval exp(1)',
    prints: ['2.718281828459045'],
  },
];

describe('docs/user guides', () => {
  for (const [file, text] of Object.entries(guides)) {
    describe(file, () => {
      const commands = commandsOf(text);

      it('has bash-fence commands to run (the check is not vacuous)', () => {
        expect(commands.length).toBeGreaterThanOrEqual(3);
      });

      for (const command of commands) {
        it(`\`${command}\` exits 0`, () => {
          const [, ...args] = argv(command);
          const result = runCli(args);
          expect(result.status, result.stderr).toBe(0);
        });
      }

      for (const { file: owner, command, prints } of documented) {
        if (owner !== file) continue;
        it(`\`${command}\` prints what the guide states it prints`, () => {
          const [, ...args] = argv(command);
          const result = runCli(args);
          expect(result.status, result.stderr).toBe(0);
          for (const piece of prints) {
            expect(text, `the guide states ${JSON.stringify(piece)}`).toContain(piece);
            expect(result.stdout, `stdout of \`${command}\` holds ${JSON.stringify(piece)}`).toContain(piece);
          }
        });
      }

      it('states no catalog count that drifts', () => {
        expect(text, 'a bridge count in prose or a `text` fence drifts when the catalog changes').not.toMatch(/\b160\b|^\d+ bridges/m);
      });

      it('CONTROL: the output matcher is sensitive to the stated value, not only to the words', () => {
        // A stated substring without a digit cannot be mutated into a wrong
        // value; the control therefore uses the first digit-bearing statement.
        const first = documented.find((entry) => entry.file === file && /\d/.test(entry.prints[0]!))!;
        const [, ...args] = argv(first.command);
        const result = runCli(args);
        const [stated] = first.prints;
        expect(result.stdout).toContain(stated!);
        expect(result.stdout).not.toContain(stated!.replace(/\d(?=\D*$)/, (d) => String((Number(d) + 1) % 10)));
      });
    });
  }

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
