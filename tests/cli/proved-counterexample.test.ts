/**
 * A formally proved bridge with an unresolved counterexample must say so.
 *
 * `deriveEvidence` already returns both tags. `upt atlas` printed
 * `formally-proved: YES` and the counterexample, and dropped `contradicted`.
 * The proof stays. The counterexample stays unresolved.
 */

import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES, provedWithUnresolvedCounterexample } from '../../src/atlas/derive-evidence.js';

const WITH_COUNTEREXAMPLE = [
  'ab-spring-lc',
  'ab-pendulum-linear',
  'ab-telegraph-diffusion',
  'ab-klein-gordon-wave',
  'ab-kg-schrodinger',
  'ab-stiff-string',
] as const;

const PROVED_ONLY = [
  'ab-damped-rlc',
  'ab-telegraph-wave',
  'ab-wave-dalembert',
  'ab-kg-oscillator',
] as const;

const FLAG = 'proved, with unresolved counterexample';

function bridge(id: string) {
  const found = ATLAS_FAMILIES.flatMap((family) => family.bridges).find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(id);
  return found;
}

async function run(argv: string[]): Promise<{ code: number; out: string }> {
  const out: string[] = [];
  const code = await runCli(argv, {
    out: (s: string) => out.push(s),
    err: () => {},
    write: (s: string) => out.push(s),
  } as never);
  return { code, out: out.join('\n') };
}

describe('proved, with unresolved counterexample', () => {
  it('the six bridges derive both tags and still carry an unresolved counterexample', () => {
    expect(WITH_COUNTEREXAMPLE.length).toBe(6);
    for (const id of WITH_COUNTEREXAMPLE) {
      const row = bridge(id);
      const tags = deriveEvidence(row, NO_PASSING_WITNESSES);
      expect(tags.has('formally-proved'), id).toBe(true);
      expect(tags.has('contradicted'), id).toBe(true);
      expect(provedWithUnresolvedCounterexample(tags), id).toBe(true);
      expect(row.counterexamples.length, id).toBeGreaterThan(0);
      expect(row.formalRef?.kind, id).toBe('bridge');
    }
  });

  it('upt atlas names the flag and does not drop contradicted', async () => {
    for (const id of WITH_COUNTEREXAMPLE) {
      const r = await run(['atlas', id]);
      expect(r.code, id).toBe(0);
      expect(r.out, id).toContain('formally-proved (derived from formalRef): YES');
      expect(r.out, id).toContain(`${FLAG}: yes`);
      expect(r.out, id).toContain('contradicted');
      expect(r.out, id).toContain(bridge(id).counterexamples[0]!.description);
    }
  });

  it('CONTROL: a proved bridge with no counterexample does not raise the flag', async () => {
    for (const id of PROVED_ONLY) {
      const row = bridge(id);
      expect(row.counterexamples, id).toEqual([]);
      expect(deriveEvidence(row, NO_PASSING_WITNESSES).has('formally-proved'), id).toBe(true);
      const r = await run(['atlas', id]);
      expect(r.out, id).toContain('formally-proved (derived from formalRef): YES');
      expect(r.out, id).toContain(`${FLAG}: no`);
    }
  });

  it('the JSON report carries the flag beside formally-proved', async () => {
    const r = await run(['atlas', 'ab-spring-lc', '--json']);
    const env = JSON.parse(r.out) as {
      result: { formallyProved: boolean; provedWithUnresolvedCounterexample: boolean; derivedEvidence: string[] };
    };
    expect(env.result.formallyProved).toBe(true);
    expect(env.result.provedWithUnresolvedCounterexample).toBe(true);
    expect(env.result.derivedEvidence).toContain('formally-proved');
    expect(env.result.derivedEvidence).toContain('contradicted');
  });
});
