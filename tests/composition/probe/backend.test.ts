/**
 * NDJSON worker protocol: argv spawn, timeout/kill, malformed output.
 */
import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runBackendWorker, type WorkerLauncher } from '../../../src/composition/probe/backend-protocol.js';
import { REAL_WORKER_HANG_GUARD_MS } from './worker-hang-guard.js';

const here = dirname(fileURLToPath(import.meta.url));
const workers = join(here, '../../fixtures/discovery-workers');

const req = {
  problemId: 'fg-test',
  budgetMs: 2000,
  variables: ['x'],
  target: 'y',
};

describe('runBackendWorker', () => {
  it('rejects empty argv', async () => {
    const r = await runBackendWorker([], req);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/empty argv/);
  });

  it('parses echo-worker NDJSON', async () => {
    const r = await runBackendWorker([process.execPath, join(workers, 'echo-worker.mjs')], req, {
      timeoutMs: REAL_WORKER_HANG_GUARD_MS,
    });
    expect(r.ok).toBe(true);
    expect(r.candidates.length).toBe(1);
    expect(r.candidates[0]!.expression.kind).toBe('symbol');
  });

  it('parses prefactor and note fields', async () => {
    const r = await runBackendWorker([process.execPath, join(workers, 'rich-worker.mjs')], req, {
      timeoutMs: REAL_WORKER_HANG_GUARD_MS,
    });
    expect(r.ok).toBe(true);
    expect(r.candidates[0]!.prefactor).toBe(2.5);
    expect(r.candidates[0]!.note).toBe('rich candidate');
  });

  it('rejects malformed NDJSON', async () => {
    const r = await runBackendWorker([process.execPath, join(workers, 'malformed-worker.mjs')], req, {
      timeoutMs: REAL_WORKER_HANG_GUARD_MS,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/malformed/);
  });

  it('kills a worker that has started and never answers (injected launcher)', async () => {
    // A real child at a 200 ms budget could be killed before it had started, and "timed out"
    // would be reported either way. The launcher below hands back a child that exists from the
    // first instant and never closes, so the only way to the result is the timeout path, and
    // the kill it issues is observed.
    let killed = 0;
    const launch: WorkerLauncher = () => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        kill: (signal: 'SIGKILL') => {
          killed++;
          // A killed process closes with the signal, as node:child_process reports it.
          queueMicrotask(() => child.emit('close', null, signal));
          return true;
        },
        stdin: { write: () => true, end: () => {} },
      });
      return child;
    };
    const r = await runBackendWorker(['hung-worker'], req, { spawn: launch, timeoutMs: 20 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/timed out/);
    expect(killed).toBeGreaterThan(0);
  });

  it('a real hung worker is killed too (process smoke; the budget is the hang guard)', async () => {
    const r = await runBackendWorker([process.execPath, join(workers, 'hang-worker.mjs')], req, {
      timeoutMs: REAL_WORKER_HANG_GUARD_MS,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/timed out/);
  }, REAL_WORKER_HANG_GUARD_MS * 2);
});
