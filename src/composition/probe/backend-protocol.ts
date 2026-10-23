/**
 * Optional NDJSON worker protocol for expression-search backends.
 *
 * Spawn with an **argv array** (no shell). Timeout + kill. Schema-validate
 * output. **No vendored Python** — CI uses `tests/fixtures/discovery-workers/echo-worker.mjs`.
 *
 * @internal
 */

import { spawn } from 'node:child_process';
import type { ExprNode } from '../../dimensional/ast-types.js';

/** One request line that the search sends to an expression-search backend worker. */
export interface BackendRequest {
  readonly problemId: string;
  readonly budgetMs: number;
  readonly variables: readonly string[];
  readonly target: string;
}

/** One candidate expression that an expression-search backend worker returns. */
export interface BackendCandidate {
  readonly expression: ExprNode;
  readonly prefactor?: number;
  readonly note?: string;
}

/** The parsed reply of a backend worker: its candidates, or an error. */
export interface BackendResponse {
  readonly ok: boolean;
  readonly candidates: readonly BackendCandidate[];
  readonly error?: string;
}

function isExprNode(value: unknown): value is ExprNode {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === 'string' && kind.length > 0;
}

function parseLine(line: string): BackendCandidate | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as { expression?: unknown; prefactor?: unknown; note?: unknown };
  if (!isExprNode(obj.expression)) return null;
  const prefactor =
    typeof obj.prefactor === 'number' && Number.isFinite(obj.prefactor) ? obj.prefactor : undefined;
  const note = typeof obj.note === 'string' ? obj.note : undefined;
  return { expression: obj.expression, prefactor, note };
}

/**
 * The part of a launched worker process that {@link runBackendWorker} uses. A `node:child_process`
 * `ChildProcess` satisfies it; the interface keeps Node types out of this module's declarations.
 * @internal
 */
export interface WorkerProcess {
  readonly stdin: { write(chunk: string): unknown; end(): unknown } | null;
  readonly stdout: { on(event: 'data', listener: (chunk: Uint8Array) => void): unknown } | null;
  readonly stderr: { on(event: 'data', listener: (chunk: Uint8Array) => void): unknown } | null;
  on(event: 'error', listener: (err: Error) => void): unknown;
  on(event: 'close', listener: (code: number | null, signal: string | null) => void): unknown;
  kill(signal: 'SIGKILL'): unknown;
}

/** Launches a worker process. The default is `node:child_process` `spawn`. @internal */
export type WorkerLauncher = (
  command: string,
  args: readonly string[],
  options: { cwd?: string; stdio: ['pipe', 'pipe', 'pipe']; windowsHide: boolean },
) => WorkerProcess;

/**
 * Run an untrusted NDJSON worker. Never uses a shell.
 *
 * The timeout starts when the launcher returns, so it includes the worker's own start-up time.
 * `opts.spawn` replaces the process launcher; tests use it to drive the exit paths without a real
 * process. @internal
 */
export async function runBackendWorker(
  argv: readonly string[],
  request: BackendRequest,
  opts: { timeoutMs?: number; cwd?: string; spawn?: WorkerLauncher } = {},
): Promise<BackendResponse> {
  if (argv.length === 0) {
    return { ok: false, candidates: [], error: 'empty argv' };
  }
  const timeoutMs = opts.timeoutMs ?? request.budgetMs;
  const launch: WorkerLauncher = opts.spawn ?? spawn;
  const child = launch(argv[0]!, argv.slice(1), {
    cwd: opts.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const chunks: Uint8Array[] = [];
  const errChunks: Uint8Array[] = [];
  child.stdout?.on('data', (d) => chunks.push(d));
  child.stderr?.on('data', (d) => errChunks.push(d));

  const killer = setTimeout(() => {
    child.kill('SIGKILL');
  }, timeoutMs);

  const stdinPayload = `${JSON.stringify(request)}\n`;
  child.stdin?.write(stdinPayload);
  child.stdin?.end();

  const exit = await new Promise<{ code: number | null; signal: string | null; spawnError?: string }>((resolve) => {
    child.on('error', (err) => resolve({ code: 1, signal: null, spawnError: err.message }));
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(killer);

  if (exit.signal === 'SIGKILL') {
    return { ok: false, candidates: [], error: `worker timed out after ${timeoutMs}ms` };
  }
  if (exit.code !== 0) {
    const err = exit.spawnError ?? Buffer.concat(errChunks).toString('utf8').trim();
    return {
      ok: false,
      candidates: [],
      error: err || `worker exited ${exit.code}`,
    };
  }

  const text = Buffer.concat(chunks).toString('utf8');
  const candidates: BackendCandidate[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    const c = parseLine(line);
    if (!c) {
      return { ok: false, candidates: [], error: `malformed NDJSON line: ${line.slice(0, 200)}` };
    }
    candidates.push(c);
  }
  return { ok: true, candidates };
}
