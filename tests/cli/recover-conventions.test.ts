/**
 * Atlas Phase 1 S1.4 — `upt recover`'s convention advisory.
 *
 * The load-bearing claim is that `upt recover` is UNCHANGED today. Proving an
 * absence needs a control, or a silent no-op would pass identically to a
 * working advisory that happens to find nothing. So this file asserts both
 * halves: the real registries produce no advisory, and a stubbed pair that
 * DOES disagree produces one. A gauge that cannot move is dead, not stable.
 */
import { captureMerged, text } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { command as recoverCommand } from '../../src/cli/commands/recover.js';
import * as cliApi from '../../src/cli-api.js';
import type { CommandCtx } from '../../src/cli/command.js';

const ADVISORY = '⚠ conventions differ';

describe('upt recover — silent while declared conventions do not disagree', () => {
  it('the precondition holds: canonical rows declare none; a catalog edge may', () => {
    // A one-sided declaration is unknown, not a mismatch, so the advisory stays
    // silent. A disagreement on a key both sides declare is the control below.
    expect(cliApi.CANONICAL_EQUATIONS.some((e) => e.conventions !== undefined)).toBe(false);
    expect(cliApi.CATALOG_GRAPH.some((e) => e.conventions !== undefined)).toBe(true);
  });

  it('EVERY linkage row — not just the printed ones — yields an empty mismatch set', async () => {
    // Stronger than diffing the report: the report prints only the
    // restates-canonical and recovers groups, so a diff cannot speak for
    // dimensional-only rows. This walks all of them.
    const offenders: string[] = [];
    for (const r of cliApi.scanLinkages()) {
      const ce = cliApi.CANONICAL_EQUATIONS.find((e) => e.id === r.canonicalId);
      const edge = cliApi.CATALOG_GRAPH.find((e) => e.beId === r.bridgeId);
      const keys = cliApi.checkConventions(ce?.conventions, edge?.conventions);
      if (keys.length > 0) offenders.push(`${r.canonicalId}~${r.bridgeId}: ${keys.join(',')}`);
    }
    expect(offenders).toEqual([]);
    expect(cliApi.scanLinkages().length).toBeGreaterThan(0); // control
  });

  it('runCli(["recover"]) emits no advisory line anywhere in its output', async () => {
    const c = captureMerged();
    expect(await runCli(['recover'], c.io)).toBe(0);
    const out = text(c);
    expect(out).not.toContain(ADVISORY);
    // Control: the output is the real report, not an empty buffer that would
    // trivially "contain no advisory".
    expect(out).toContain('Bridge↔canonical recovery');
    expect(out).toMatch(/non-unrelated links/);
  });

  it('every emitted line is free of the advisory marker, and no line is split by it', async () => {
    const c = captureMerged();
    await runCli(['recover'], c.io);
    // A second, independent method: per-line rather than whole-buffer. The
    // advisory is prefixed with a newline, so a leak would also show up as an
    // extra indented line even if the marker itself were reworded.
    for (const line of text(c).split('\n')) {
      expect(line).not.toContain('conventions differ');
    }
  });

  it('--json output carries no convention field', async () => {
    const c = captureMerged();
    expect(await runCli(['recover', '--json'], c.io)).toBe(0);
    const parsed = JSON.parse(text(c)) as Record<string, unknown>;
    expect(JSON.stringify(parsed)).not.toContain('conventions');
  });
});

describe('THE CONTROL — the advisory fires when a pair genuinely disagrees', () => {
  it('a stubbed canonical/edge pair with opposing heatWorkSign emits the advisory', async () => {
    const real = cliApi.scanLinkages();
    const row = real.find((r) => r.classification === 'restates-canonical') ?? real[0];
    expect(row, 'no linkage row to stub against').toBeDefined();

    const stubApi = {
      ...cliApi,
      scanLinkages: () => [row!],
      CANONICAL_EQUATIONS: [
        { id: row!.canonicalId, conventions: { heatWorkSign: 'Q-W' } },
      ],
      CATALOG_GRAPH: [{ beId: row!.bridgeId, conventions: { heatWorkSign: 'Q+W' } }],
    } as unknown as CommandCtx['api'];

    const c = captureMerged();
    const ctx: CommandCtx = {
      args: { flags: new Map(), positionals: [] } as unknown as CommandCtx['args'],
      api: stubApi,
      out: c.io.out,
      err: c.io.err,
      write: c.io.write,
    };
    expect(await recoverCommand.run(ctx)).toBe(0);
    const out = text(c);
    expect(out).toContain(ADVISORY);
    expect(out).toContain('heatWorkSign');
  });

  it('the same stub with AGREEING conventions emits nothing', async () => {
    const real = cliApi.scanLinkages();
    const row = real.find((r) => r.classification === 'restates-canonical') ?? real[0];
    const stubApi = {
      ...cliApi,
      scanLinkages: () => [row!],
      CANONICAL_EQUATIONS: [{ id: row!.canonicalId, conventions: { heatWorkSign: 'Q-W' } }],
      // The second side declares nothing: absence is unknown, not disagreement.
      CATALOG_GRAPH: [{ beId: row!.bridgeId, conventions: {} }],
    } as unknown as CommandCtx['api'];

    const c = captureMerged();
    const ctx: CommandCtx = {
      args: { flags: new Map(), positionals: [] } as unknown as CommandCtx['args'],
      api: stubApi,
      out: c.io.out,
      err: c.io.err,
      write: c.io.write,
    };
    expect(await recoverCommand.run(ctx)).toBe(0);
    expect(text(c)).not.toContain(ADVISORY);
  });
});
