/**
 * Post-swap hardening matrix (Task 9): spawn-based tests pinning the CLI's
 * end-to-end contract through the real `bin/upt.mjs` shim -> `dist/cli/`.
 *
 * These are NOT unit tests of `src/cli/*` internals — they exercise the
 * actual built artifact the way a user's shell would, so they only pass if
 * the shim, the dispatcher, and every ported command agree on: unknown-flag
 * exit code (2) and message shape, `--version`/`-v`/`version` output shape,
 * per-command `help` text, and the no-args demo's flag-rejection behavior.
 *
 * This file and `closed-stdout.test.ts` (EPIPE) are the only spawned paths. The golden corpus
 * runs in-process (`inprocess-golden.test.ts`); the ONE spawned golden case at the end of this
 * file is the smoke that the shim delivers the same bytes and exit code as `runCli`.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');

function run(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

const COMMANDS = [
  'explain',
  'priority',
  'audit',
  'map',
  'candidates',
  'predict',
  'discover',
  'connectors',
  'coverage',
  'canonical',
  'recover',
  'symbolic',
  'eval',
  'evaluate',
  'derive',
  'confront',
  'ground',
  'axes',
  'probe',
] as const;

/** Minimal valid leading positionals per command, so `--bogus` is rejected as
 * an unknown FLAG (not masked by a missing-positional error first). */
function argsFor(command: (typeof COMMANDS)[number]): string[] {
  switch (command) {
    case 'explain':
      return [command, 'hawking-temperature', '--bogus'];
    case 'eval':
      return [command, '1+1', '--bogus'];
    case 'evaluate':
      return [command, 'be-63', 'mu_e=2', '--bogus'];
    case 'derive':
      return [command, 'x:time', '--bogus'];
    default:
      return [command, '--bogus'];
  }
}

describe('upt — unknown flag on every command', () => {
  it.each(COMMANDS)("rejects --bogus for '%s' with exit 2 naming the flag and command", (command) => {
    const { status, stderr } = run(argsFor(command));
    expect(status).toBe(2);
    expect(stderr).toContain('--bogus');
    expect(stderr).toContain(command);
  });
});

describe('upt discover — the motivating typo', () => {
  it("rejects '--sourc=canonical' (misspelled --source) with exit 2 naming the bad flag", () => {
    const { status, stderr } = run(['discover', '--sourc=canonical']);
    expect(status).toBe(2);
    expect(stderr).toContain('--sourc');
  });
});

describe('upt — version reporting', () => {
  it.each([['-v'], ['--version'], ['version']])('%s prints a bare semver line', (flag) => {
    const { status, stdout } = run([flag]);
    expect(status).toBe(0);
    expect(stdout).toMatch(/^\d+\.\d+\.\d+\n$/);
  });
});

describe('upt help <command> — per-command help text', () => {
  it("'upt help map' documents --equation", () => {
    const { status, stdout } = run(['help', 'map']);
    expect(status).toBe(0);
    expect(stdout).toContain('--equation');
  });

  it("'upt help discover' documents --max-orders", () => {
    const { status, stdout } = run(['help', 'discover']);
    expect(status).toBe(0);
    expect(stdout).toContain('--max-orders');
  });
});

describe('upt derive — non-graph command rejects --source', () => {
  it("'upt derive x:time --source=catalog' is an unknown flag, not a graph --source", () => {
    const { status, stderr } = run(['derive', 'x:time', '--source=catalog']);
    expect(status).toBe(2);
    expect(stderr).toContain('--source');
    expect(stderr).toContain('derive');
  });
});

describe('upt — no-args demo takes no flags', () => {
  it("'upt --json' does not run the demo", () => {
    const { status, stderr, stdout } = run(['--json']);
    expect(status).toBe(2);
    expect(stderr).toContain("'--json' requires a command");
    expect(stdout).toBe('');
  });

  it("'upt --json eval' emits a JSON envelope", () => {
    const { status, stdout } = run(['--json', 'eval', '1+1']);
    expect(status).toBe(0);
    const parsed = JSON.parse(stdout) as { command: string; result: { value: number } };
    expect(parsed.command).toBe('eval');
    expect(parsed.result.value).toBe(2);
  });
});

describe('upt — the shim reproduces one golden case end to end', () => {
  // The corpus runs in-process (inprocess-golden.test.ts). This one spawned case is the smoke
  // that bin/upt.mjs -> dist/cli/main.js delivers the same stdout bytes and exit code through a
  // real process; a second spawned run of all 36 cases proved nothing more (190 s of the suite).
  it("'upt priority' through bin/upt.mjs matches tests/cli/golden/priority.txt and exits 0", () => {
    const golden = readFileSync(resolve(here, 'golden/priority.txt'), 'utf8').replace(/\r\n/g, '\n');
    const { status, stdout } = run(['priority']);
    expect(status).toBe(0);
    expect(stdout.replace(/\r\n/g, '\n')).toBe(golden);
  });

  it("control: a case the shim must refuse exits 2 with the command named", () => {
    const { status, stderr } = run(['nosuchcommand']);
    expect(status).toBe(2);
    expect(stderr).toContain("Unknown command 'nosuchcommand'");
  });
});
