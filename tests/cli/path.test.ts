/**
 * `upt path` — in-process against the built CLI (dist/cli/main.js).
 *
 * The load-bearing case is the no-composite-claim one: it must print the
 * literal phrase, EXIT 0 (a refusal is an answer), and carry no number — the
 * envelope must have no `bound` key at all, because a precise-looking bound
 * over an undefined composite is the one output this library must never emit.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('upt path', () => {
  it('pendulum → spring composes to an approximation with its stated bound', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10'],
      cap.io,
    );
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/composite relation: approximation/);
    // The bound is the RECORD's own (the EXACT relative period error at the
    // regime edge θ0 = 0.5), not a number recomputed from --at. The S2.3 brief
    // predicted (1, 0.0025) — that is θ0²/16 at θ0 = 0.2, which no code path
    // produces. The pinned 0.015625 here was 0.5²/16, the SERIES at the edge,
    // which the record no longer declares: it understates the exact error by
    // 1.456% and so was a bound violated at its own boundary.
    expect(text).toMatch(/composed bound: K = 1 · delta = 0\.0158525/);
    expect(text).toMatch(/norm: relative period error/);
    expect(text).toMatch(/horizons at t=10: all hold/);
  });

  it('the same path at t=1000 reports the pendulum horizon VIOLATED', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=1000'],
      cap.io,
    );
    expect(code).toBe(3); // a violated horizon or regime is a failed check (0.47.0)
    const text = cap.lines.join('');
    // Machine horizon is t < 4 T0/θ0² = 100, so 1000 is outside it.
    expect(text).toMatch(/horizons at t=1000: NOT all hold/);
    expect(text).toMatch(/ab-pendulum-linear: VIOLATED/);
  });

  // Persona finding L1 (2026-09-25): at θ0 = 0.8 the path printed the bound and "all hold",
  // although the bound's own regime is θ0 ≤ 0.5. The exact relative period error there is
  // 2K(sin 0.4)/π − 1 = 0.0415 (AGM), 2.6 times the quoted 0.0159. A bound quoted outside the
  // regime it is claimed in is the claim applied where it was never made.
  it('outside the bound regime (θ0 = 0.8) the regime is reported VIOLATED, and the bound does not apply', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.8', 'T0=1', 't=1'],
      cap.io,
    );
    expect(code).toBe(3); // a violated horizon or regime is a failed check (0.47.0)
    const text = cap.lines.join('');
    expect(text).toMatch(/regimes at --at: VIOLATED/);
    expect(text).toMatch(/ab-pendulum-linear: VIOLATED — theta0 <= 0\.5/);
    expect(text).toMatch(/no bound on this path is claimed at this point/);
  });

  it('a path whose regimes state no inequality says VACUOUS, not "all hold"', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-spring', 'model-lc', '--at', 't=1'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/regimes: VACUOUS/);
    expect(text).not.toMatch(/regimes at --at: all hold/);
  });

  it('--json carries each regime verdict and allRegimesHold', async () => {
    const run = async (theta0: string) => {
      const cap = capture();
      const code = await runCli(
        ['path', 'model-pendulum', 'model-spring', '--at', `theta0=${theta0}`, 'T0=1', 't=1', '--json'],
        cap.io,
      );
      expect(code).toBe(Number(theta0) > 0.5 ? 3 : 0); // outside θ0 ≤ 0.5 the regime is violated
      return JSON.parse(cap.lines.join('')).result;
    };
    const outside = await run('0.8');
    expect(outside.allRegimesHold).toBe(false);
    expect(outside.regimes).toEqual([
      {
        bridgeId: 'ab-pendulum-linear',
        ok: false,
        violated: ['theta0 <= 0.5 (θ0 ≤ 0.5 rad)'],
        unchecked: [],
        premisesNotChecked: ['θ0 ≤ 0.5 rad', 'the bound is a PERIOD error and is not uniform in time'],
      },
    ]);
    const inside = await run('0.2');
    expect(inside.allRegimesHold).toBe(true);
  });

  it('with no --at the regime is UNKNOWN, never a pass', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-pendulum', 'model-spring', '--json'], cap.io);
    expect(code).toBe(0);
    const result = JSON.parse(cap.lines.join('')).result;
    expect(result.allRegimesHold).toBe('unknown');
  });

  // Persona finding L9 (2026-09-25): the path printed only the domain supremum (0.0159 for the
  // pendulum at any θ0). Where deltaAt is PROVEN (closed-form, the exact error), the bound at the
  // --at point is printed beside it; at θ0 = 0.2 the exact period error is 0.0025057 (AGM).
  it('prints the proven bound at the --at point beside the domain supremum', async () => {
    const cap = capture();
    await runCli(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10'], cap.io);
    const text = cap.lines.join('');
    expect(text).toMatch(/bound at this point: K = 1 · delta = 0\.00250574\d* \(closed-form: the exact error; the composed bound above is the supremum over the bridge's domain\)/);
    const json: string[] = [];
    await runCli(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10', '--json'], {
      out: () => {}, err: () => {}, write: (s: string) => json.push(s),
    });
    const r = JSON.parse(json.join('')).result;
    // AGM and the θ0 series both give 0.00250574422860 (independent check).
    expect(r.pointBound.delta).toBeCloseTo(0.0025057442286, 12);
  });

  it('no point bound outside the regime, and none from a numerically supported deltaAt', async () => {
    const out = async (args: string[]) => {
      const cap = capture();
      await runCli(args, cap.io);
      return cap.lines.join('');
    };
    const outside = await out(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.8', 'T0=1', 't=1']);
    expect(outside).toMatch(/bound at this point: none — a regime on the path is violated or unchecked/);
    const damped = await out([
      'path', 'model-damped-spring', 'model-first-order',
      '--at', 'm · b^-2 · k=0.01', 'm=0.01', 'b=1', 'k=1', 'x0=1', 'v0=0', 't=1',
    ]);
    expect(damped).toMatch(/bound at this point: none — ab-damped-massless's point bound is numerically supported, not proven/);
  });

  it("a no-composite-claim pair prints the phrase, carries no bound, and EXITS 0", async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-lc', '--at', 'theta0=0.2', 'T0=1', 't=10'],
      cap.io,
    );
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/no composite claim/);
    expect(text).not.toMatch(/composed bound/);
  });

  // Audit F05 (2026-09-26): the refusal is kept (the table is not widened), but it now names
  // what a composite would need instead of only saying "no composite claim".
  it('a no-composite-claim refusal names the missing information (audit F05)', async () => {
    const cap = capture();
    await runCli(['path', 'model-pendulum', 'model-lc'], cap.io);
    const text = cap.lines.join('');
    expect(text).toMatch(/to compose, this path would need:/);
    expect(text).toMatch(/a composition-table cell for approximation then exact-equivalence/);
    expect(text).toMatch(/'ab-spring-lc' to state that it carries 'relative period error[^']*' through its mapping/);
    const json: string[] = [];
    await runCli(['path', 'model-pendulum', 'model-lc', '--json'], { out: () => {}, err: () => {}, write: (s: string) => json.push(s) });
    const r = JSON.parse(json.join('')).result;
    expect(r.missing).toHaveLength(2);
    expect('bound' in r).toBe(false);
  });

  it('--json for a no-claim has NO bound key and names the reason', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-pendulum', 'model-lc', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.command).toBe('path');
    expect(parsed.result.kind).toBe('no-claim');
    expect(parsed.result.reason).toBe('no-composite-claim');
    expect(parsed.result.phrase).toBe('no composite claim');
    expect('bound' in parsed.result).toBe(false);
  });

  it('--json envelope matches confront’s shape for a bounded path', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10', '--json'],
      cap.io,
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.command).toBe('path');
    expect(typeof parsed.epistemics).toBe('string');
    expect(parsed.options.from).toBe('model-pendulum');
    expect(parsed.result.kind).toBe('bound');
    expect(parsed.result.relation).toBe('approximation');
    expect(parsed.result.bound.K).toBe(1);
    expect(parsed.result.bound.delta).toBeCloseTo(0.0158525311014, 10);
    expect(parsed.result.allHorizonsHold).toBe(true);
  });

  it('an unevaluated horizon is reported as unevaluated, not as holding', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-pendulum', 'model-spring', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.result.horizonsEvaluated).toBe(false);
    expect(parsed.result.allHorizonsHold).toBe(null);
    expect(parsed.result.horizons[0].holds).toBe(null);
  });

  it('an exact-equivalence path is traversable in both directions', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-lc', 'model-spring', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.result.kind).toBe('bound');
    expect(parsed.result.relation).toBe('exact-equivalence');
    expect(parsed.result.bound).toEqual({ K: 1, delta: 0 });
  });

  it('an unknown model id → exit 1', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-nope', 'model-spring'], cap.io);
    expect(code).toBe(1);
    expect(cap.lines.join('')).toMatch(/is not a model of family 'oscillators'/);
  });

  it('a wrong number of endpoints → exit 1', async () => {
    const cap = capture();
    expect(await runCli(['path', 'model-spring'], cap.io)).toBe(1);
    expect(await runCli(['path', 'a', 'b', 'c'], cap.io)).toBe(1);
  });

  it('a non-finite --at value → exit 1', async () => {
    const cap = capture();
    expect(await runCli(['path', 'model-pendulum', 'model-spring', '--at', 't=oops'], cap.io)).toBe(1);
  });

  it('an unknown flag is rejected by the parser → exit 2', async () => {
    const cap = capture();
    expect(await runCli(['path', 'model-pendulum', 'model-spring', '--bogus'], cap.io)).toBe(2);
  });

  it('identical endpoints compose nothing, and say so (exit 0)', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-spring', 'model-spring'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/the path is empty and composes nothing/);
  });

  it('a disconnected pair reports no chain rather than a bound (exit 0)', async () => {
    const cap = capture();
    const code = await runCli(['path', 'model-spring', 'model-cubic-spring'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/no chain of bridges connects these models/);
  });

  // Audit F01 (2026-09-26): `atlas ab-kg-schrodinger` lists a waves → diffusion bridge, and
  // `path` refused it because the endpoints sit in different families.
  describe('cross-family routes (audit F01)', () => {
    it('follows the listed KG → free-Schrödinger bridge and checks its regime and horizon', async () => {
      const cap = capture();
      const code = await runCli(
        ['path', 'model-klein-gordon', 'model-schrodinger-free', '--at', 'c=1', 'omega0=1', 'k=0.05', 't=1'],
        cap.io,
      );
      expect(code).toBe(0);
      const text = cap.lines.join('');
      expect(text).toMatch(/model-klein-gordon --\[approximation\]--> model-schrodinger-free {2}\(ab-kg-schrodinger\)/);
      expect(text).toMatch(/crosses families: waves → diffusion/);
      expect(text).toMatch(/composite relation: approximation/);
      expect(text).toMatch(/regimes at --at: all hold/);
      expect(text).toMatch(/horizons at t=1: all hold/);
    });

    it('at k = 1 the violated inequality is named and the check fails (exit 3)', async () => {
      const cap = capture();
      const code = await runCli(
        ['path', 'model-klein-gordon', 'model-schrodinger-free', '--at', 'c=1', 'omega0=1', 'k=1'],
        cap.io,
      );
      expect(code).toBe(3);
      expect(cap.lines.join('')).toMatch(/ab-kg-schrodinger: VIOLATED — c · omega0\^-1 · k <= 0\.1/);
    });

    it('--json records the family of each step and each endpoint', async () => {
      const cap = capture();
      await runCli(['path', 'model-klein-gordon', 'model-schrodinger-free', '--json'], cap.io);
      const r = JSON.parse(cap.lines.join('')).result;
      expect(r.families).toEqual({ from: 'waves', to: 'diffusion' });
      expect(r.path).toEqual([
        {
          id: 'ab-kg-schrodinger',
          relation: 'approximation',
          from: 'model-klein-gordon',
          to: 'model-schrodinger-free',
          family: 'waves',
        },
      ]);
    });

    it('a cross-family chain still refuses a composite the table does not define', async () => {
      const cap = capture();
      const code = await runCli(['path', 'model-klein-gordon', 'model-fick', '--json'], cap.io);
      expect(code).toBe(0);
      const r = JSON.parse(cap.lines.join('')).result;
      expect(r.path.map((s: { id: string }) => s.id)).toEqual(['ab-kg-schrodinger', 'ab-schrodinger-diffusion']);
      expect(r.kind).toBe('no-claim');
      expect('bound' in r).toBe(false);
    });

    it('an unbounded restriction followed by another step is a refusal, not a crash', async () => {
      const cap = capture();
      const code = await runCli(['path', 'model-klein-gordon', 'model-lc', '--json'], cap.io);
      expect(code).toBe(0);
      const r = JSON.parse(cap.lines.join('')).result;
      expect(r.path.map((s: { id: string }) => s.id)).toEqual(['ab-kg-oscillator', 'ab-spring-lc']);
      expect(r.kind).toBe('no-claim');
      expect(r.reason).toBe('missing-lipschitz');
      expect(r.detail).toMatch(/'ab-kg-oscillator' \(restriction\) states no Lipschitz constant/);
      expect('bound' in r).toBe(false);
    });

    it('an approximation is never traversed backwards across families', async () => {
      const cap = capture();
      const code = await runCli(['path', 'model-schrodinger-free', 'model-klein-gordon'], cap.io);
      expect(code).toBe(0);
      expect(cap.lines.join('')).toMatch(/no chain of bridges connects these models/);
    });
  });

  it('`upt help path` prints the command help', async () => {
    const cap = capture();
    expect(await runCli(['help', 'path'], cap.io)).toBe(0);
    expect(cap.lines.join('')).toMatch(/upt path <from> <to>/);
  });
});
