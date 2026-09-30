/**
 * `upt atlas` (Atlas Phase 6, S6.5) — and Eve E6's check: "no output hides a
 * qualification", verified on three bridges against their source records.
 *
 * Also pins the two pre-existing single-family defects fixed alongside it:
 * `upt regime` and `upt path` searched the oscillator family only.
 */

import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import type { AtlasBridge } from '../../src/atlas/types.js';

async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, {
    out: (s: string) => out.push(s),
    err: (s: string) => err.push(s),
    write: (s: string) => out.push(s),
  } as never);
  return { code, out: out.join('\n'), err: err.join('\n') };
}

const bridge = (id: string): AtlasBridge =>
  ATLAS_FAMILIES.flatMap((f) => f.bridges).find((b) => b.id === id)!;

describe('upt atlas — listing', () => {
  it('lists every bridge of every family', async () => {
    const r = await run(['atlas']);
    expect(r.code).toBe(0);
    for (const b of ATLAS_FAMILIES.flatMap((f) => f.bridges)) expect(r.out).toContain(b.id);
    expect(r.out).toContain('20 atlas bridges across 3 families');
  });

  it('an unknown id is an error, not an empty report', async () => {
    const r = await run(['atlas', 'ab-no-such-bridge']);
    expect(r.code).not.toBe(0);
    expect(r.err).toContain('unknown bridge');
  });
});

describe('Eve E6 — no output hides a qualification (three bridges vs their source records)', () => {
  // An approximation with a bound and a formalRef; an exact equivalence with an
  // EMPTY regime and no counterexample; a two-premise hyperedge.
  for (const id of ['ab-pendulum-linear', 'ab-heat-diffusion', 'ab-sound-speed']) {
    it(`${id}: every side condition, inequality, witness, counterexample and citation is printed`, async () => {
      const b = bridge(id);
      const r = await run(['atlas', id]);
      expect(r.code).toBe(0);
      expect(r.out).toContain(b.relation);
      expect(r.out).toContain(b.transformation);
      for (const p of b.premises) expect(r.out).toContain(p);
      for (const s of b.sideConditions) expect(r.out).toContain(s);
      for (const i of b.regime.inequalities) expect(r.out).toContain(`${i.group} ${i.op} ${i.bound}`);
      for (const s of b.preserves) expect(r.out).toContain(s);
      for (const s of b.doesNotPreserve) expect(r.out).toContain(s);
      for (const w of b.witnesses) expect(r.out).toContain(w.id);
      for (const c of b.counterexamples) expect(r.out).toContain(c.description);
      for (const c of b.citations) expect(r.out).toContain(c);
      if (b.bound !== undefined) {
        expect(r.out).toContain(b.bound.horizon);
        expect(r.out).toContain(b.bound.domain);
      }
      expect(r.out).toContain(`review status: ${b.reviewStatus}`);
    });
  }

  it('an EMPTY section is printed as empty, never omitted', async () => {
    const r = await run(['atlas', 'ab-heat-diffusion']);
    expect(r.out).toContain('VACUOUS');
    expect(r.out).toMatch(/counterexamples:\n {2}none stated/);
    expect(r.out).toMatch(/bound:\n {2}none stated/);
    expect(r.out).toContain('none — no checked counterpart is recorded');
  });

  it('formally-proved is shown WITH its scope: the statement only, not the bound', async () => {
    const r = await run(['atlas', 'ab-pendulum-linear']);
    expect(r.out).toContain('formally-proved (derived from formalRef): YES');
    expect(r.out).toContain('covers: the transformation, not bound.delta — covers its statement only');
  });

  it('--json carries the same qualifications', async () => {
    const r = await run(['atlas', 'ab-sound-speed', '--json']);
    const env = JSON.parse(r.out) as { result: { premises: unknown[]; sideConditions: string[] } };
    expect(env.result.premises).toHaveLength(2);
    expect(env.result.sideConditions).toEqual([...bridge('ab-sound-speed').sideConditions]);
  });
});

describe('the single-family defects, fixed', () => {
  it('upt regime accepts the diffusion family (it used to reject every family but oscillators)', async () => {
    const r = await run(['regime', 'diffusion', '--at', 'dt · t^-1=0.001']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('ab-walk-diffusion');
  });

  it('upt path searches the waves family', async () => {
    const r = await run(['path', 'model-stiff-string', 'model-string']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('ab-stiff-string');
  });
});
