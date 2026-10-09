/**
 * One-call CLI runners over the BUILT CLI (`dist/cli/main.js`); the capture shapes are in
 * `tests/helpers/cli.ts`.
 *
 * `run`, `runText` and `json` route `discover` and `ground` through `tests/helpers/discover-cache.js`:
 * those commands rank the whole graph (seconds to a minute) and their output is a pure function
 * of the build and the data, so one run serves every fork. `spawnCli` is the spawned form through
 * `bin/upt.mjs`, for the few tests that must see a real process (exit code, a closed pipe).
 *
 * @module tests/helpers/cli-run
 */
import './dist.js';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { captureMerged, text } from './cli.js';
import { isFunnelCommand, runCliCaptured, runFunnel, type CliRun } from './discover-cache.js';

export type { CliRun };

/** Run `argv` in-process; stdout and stderr apart. Funnel commands come from the cache. */
export async function run(argv: readonly string[]): Promise<CliRun> {
  return isFunnelCommand(argv) ? runFunnel(argv) : runCliCaptured(argv);
}

/** Run `argv` in-process; both streams merged into `text`. Funnel commands come from the cache. */
export async function runText(argv: readonly string[]): Promise<{ code: number; text: string }> {
  if (isFunnelCommand(argv)) {
    const r = await runFunnel(argv);
    return { code: r.code, text: r.stdout + r.stderr };
  }
  const c = captureMerged();
  const code = await runCli([...argv], c.io);
  return { code, text: text(c) };
}

/** Run `argv --json`, require exit 0, and parse the envelope. */
export async function json(argv: readonly string[]): Promise<Record<string, any>> {
  const r = await run([...argv, '--json']);
  expect(r.code, r.stderr).toBe(0);
  return JSON.parse(r.stdout) as Record<string, any>;
}

const shim = resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/upt.mjs');

/** Run `args` through the real `bin/upt.mjs` in a child process. */
export function spawnCli(args: readonly string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [shim, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}
