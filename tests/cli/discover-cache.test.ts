/**
 * The funnel cache's rules, on an injected runner: one real run per (fingerprint, argv), shared
 * through the disk store between forks, invalidated by the fingerprint, and refused for any
 * command that is not a funnel. Then one real check that a cached `ground` equals a direct one.
 */
import '../helpers/dist.js';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  createFunnelCache,
  funnelFingerprint,
  isFunnelCommand,
  peerVersions,
  runCliCaptured,
  runFunnel,
  type CliRun,
} from '../helpers/discover-cache.js';

const dir = mkdtempSync(join(tmpdir(), 'upt-funnel-cache-test-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function counting(): { run: (argv: readonly string[]) => Promise<CliRun>; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    run: async (argv) => {
      calls.push(argv.join(' '));
      return { code: 0, stdout: `ran ${argv.join(' ')}\n`, stderr: '' };
    },
  };
}

describe('createFunnelCache', () => {
  it('runs once per argv in one process and serves the same bytes after', async () => {
    const r = counting();
    const cached = createFunnelCache({ run: r.run, fingerprint: 'a'.repeat(64), dir });
    const first = await cached(['discover', '--json']);
    const second = await cached(['discover', '--json']);
    expect(second).toEqual(first);
    expect(r.calls).toEqual(['discover --json']);
    await cached(['discover', '--source=canonical']);
    expect(r.calls).toHaveLength(2);
  });

  it('a second instance with the same fingerprint (another fork) reads the store, not the runner', async () => {
    const r = counting();
    const fingerprint = 'b'.repeat(64);
    const stored = await createFunnelCache({ run: r.run, fingerprint, dir })(['ground', 'a', 'b']);
    const other = counting();
    const again = await createFunnelCache({ run: other.run, fingerprint, dir })(['ground', 'a', 'b']);
    expect(again).toEqual(stored);
    expect(other.calls).toEqual([]);
  });

  it('a different fingerprint is a different store: the runner runs again', async () => {
    const r = counting();
    await createFunnelCache({ run: r.run, fingerprint: 'c'.repeat(64), dir })(['discover']);
    await createFunnelCache({ run: r.run, fingerprint: 'd'.repeat(64), dir })(['discover']);
    expect(r.calls).toEqual(['discover', 'discover']);
  });

  it('a half-written store file (another fork mid-write, or a crashed run) is a miss, not a SyntaxError', async () => {
    // Tom's review of #502: the store is shared between forks and was written with a
    // truncate-then-write, so a reader could parse a partial file. The write is now
    // temp-then-rename, and a record that does not parse is treated as absent.
    const fingerprint = 'e'.repeat(64);
    const argv = ['discover', '--json'];
    const store = join(dir, fingerprint.slice(0, 32));
    mkdirSync(store, { recursive: true });
    const file = join(store, `${createHash('sha256').update(JSON.stringify(argv)).digest('hex').slice(0, 32)}.json`);
    writeFileSync(file, '{"argv":"[\\"discover\\",\\"--js');
    const r = counting();
    const result = await createFunnelCache({ run: r.run, fingerprint, dir })(argv);
    expect(result.stdout).toBe('ran discover --json\n');
    expect(r.calls).toEqual(['discover --json']);
    // The whole record is there now: a fresh instance reads it without running.
    const other = counting();
    expect(await createFunnelCache({ run: other.run, fingerprint, dir })(argv)).toEqual(result);
    expect(other.calls).toEqual([]);
  });

  it('the fingerprint reads the peers by version: a bump with an unchanged dist is a different store', () => {
    const installed = peerVersions();
    expect(Object.keys(installed)).toContain('mathts-core');
    expect(funnelFingerprint()).toBe(funnelFingerprint(installed));
    expect(funnelFingerprint({ ...installed, 'mathts-core': '0.0.0-other' })).not.toBe(funnelFingerprint(installed));
  });

  it('refuses a command that is not a funnel, and the runner is not called', () => {
    const r = counting();
    const cached = createFunnelCache({ run: r.run, fingerprint: 'e'.repeat(64), dir });
    expect(() => cached(['explain', 'mass'])).toThrow(/not a discover or ground run/);
    expect(() => cached(['--json', 'map', '--proposed'])).toThrow(/not a discover or ground run/);
    expect(r.calls).toEqual([]);
  });

  it('isFunnelCommand reads the first positional, so a leading global flag is fine', () => {
    expect(isFunnelCommand(['--json', 'discover'])).toBe(true);
    expect(isFunnelCommand(['ground', 'a', 'b'])).toBe(true);
    expect(isFunnelCommand(['map', '--proposed'])).toBe(false);
    expect(isFunnelCommand([])).toBe(false);
  });

  it('the live fingerprint is a SHA-256 and is stable within one process', () => {
    const a = funnelFingerprint();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(funnelFingerprint()).toBe(a);
  });
});

describe('runFunnel against runCli', () => {
  it('a usage error (ground with one name) is the same code and text through the cache', async () => {
    const direct = await runCliCaptured(['ground', 'mass']);
    const cached = await runFunnel(['ground', 'mass']);
    expect(direct.code).toBe(2);
    expect(cached).toEqual(direct);
  });
});
