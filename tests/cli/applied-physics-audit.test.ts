/**
 * The CLI-only applied-physicist audit of 0.47.1 (docs/audit/Universal_Physics_Tensor_CLI_Audit.md,
 * §11 findings ledger). One block per finding not already pinned beside its command's own tests.
 * In-process against dist/cli/main.js.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
async function run(args: string[]): Promise<{ code: number; text: string }> {
  const c = capture();
  const code = await runCli(args, c.io);
  return { code, text: c.lines.join('') };
}

describe('F14 — help states no fixed isolated-bridge count', () => {
  it('top-level help does not hard-code "20 ISOLATED"', async () => {
    const { text } = await run(['help']);
    expect(text).not.toMatch(/\b20 ISOLATED\b/);
    expect(text).toMatch(/upt connectors \[--source=catalog\|canonical\|both\]/);
  });

  it('connectors help does not hard-code the catalog count either', async () => {
    const { text } = await run(['help', 'connectors']);
    expect(text).not.toMatch(/20-bridge/);
  });

  it('connectors prints its own count for the selected source', async () => {
    const both = await run(['connectors']);
    const catalog = await run(['connectors', '--source=catalog']);
    const count = (t: string) => {
      const m = /(\d+) of the isolated bridges share a name token with the core; (\d+) are truly unconnected/.exec(t);
      return m === null ? null : Number(m[1]) + Number(m[2]);
    };
    expect(count(both.text)).not.toBeNull();
    expect(count(catalog.text)).not.toBeNull();
    expect(count(both.text)).not.toBe(count(catalog.text));
  });
});

describe('F02 — the PROMISING count carries its evidential readiness', () => {
  it('discover states how many promising candidates have any mechanism or data test', async () => {
    const { text } = await run(['discover', '--source=canonical']);
    const promising = Number(/→ {2}(\d+) promising/.exec(text)![1]);
    const m = /readiness of the (\d+) promising: 0 mechanism-tested · 0 data-tested · (\d+) without magnitude evidence · (\d+) with axis unresolved · (\d+) with an entailed consequence/.exec(text);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(promising);
    for (const k of [2, 3, 4]) expect(Number(m![k])).toBeLessThanOrEqual(promising);
    expect(text).toMatch(/promising ≠ evidence: promotion to a bridge needs a mechanism and a falsifiable prediction/);
  });

  it('--json carries the same readiness, recounted from the candidates', async () => {
    const c = capture();
    await runCli(['discover', '--source=canonical', '--json'], c.io);
    const env = JSON.parse(c.lines.join(''));
    type Row = { verdict: string; magnitudeChecked: boolean; magnitudeAnchorInvariant?: boolean; axisChecked: boolean; consequence?: { signal: string }; grounding: { mechanismTested: boolean; dataTested: boolean } };
    const p = (env.result as Row[]).filter((r) => r.verdict === 'promising');
    expect(env.readiness).toEqual({
      promising: p.length,
      mechanismTested: p.filter((r) => r.grounding.mechanismTested).length,
      dataTested: p.filter((r) => r.grounding.dataTested).length,
      withoutMagnitudeEvidence: p.filter((r) => !r.magnitudeChecked || r.magnitudeAnchorInvariant === true).length,
      axisUnresolved: p.filter((r) => !r.axisChecked).length,
      entailedConsequence: p.filter((r) => r.consequence?.signal === 'entailed').length,
    });
    expect(env.readiness.withoutMagnitudeEvidence).toBeGreaterThan(0);
  });
});

describe('F08 — checked inequalities are kept apart from prose premises', () => {
  it('a VACUOUS exact analogy lists its premises as not machine-checked (regime)', async () => {
    const { text } = await run(['regime', 'oscillators']);
    expect(text).toMatch(
      /\[bridge\] ab-spring-lc: no machine condition evaluated \(VACUOUS — states no inequality; nothing was checked\)\n {4}premises not machine-checked: m, k, L, C > 0; lossless; unforced; x0, q0 nonzero/,
    );
  });

  it('Stokes–Einstein: the Reynolds and overdamped checks pass, and no-slip is still a declaration', async () => {
    const { text } = await run(['regime', 'diffusion', '--at', 'Re=0.05', 'm=1e-15', 'gamma=1e-8', 't=1']);
    const block = text.slice(text.indexOf('[bridge] ab-stokes-einstein'));
    expect(block).toMatch(/^\[bridge\] ab-stokes-einstein: valid\n( {4}satisfied: .*\n){2} {4}every inequality checked and satisfied\n {4}premises not machine-checked: .*no-slip boundary/);
  });

  it('--json carries premisesNotChecked for a bridge and none for a model', async () => {
    const c = capture();
    await runCli(['regime', 'oscillators', '--json'], c.io);
    const records = JSON.parse(c.lines.join('')).result.records as { id: string; premisesNotChecked?: string[] }[];
    expect(records.find((r) => r.id === 'ab-spring-lc')!.premisesNotChecked).toEqual([
      'm, k, L, C > 0',
      'lossless',
      'unforced',
      'x0, q0 nonzero',
    ]);
    expect(records.find((r) => r.id === 'model-spring')!.premisesNotChecked).toBeUndefined();
  });

  it('path lists each step\'s prose premises beside the regime verdict', async () => {
    const { text } = await run(['path', 'model-spring', 'model-lc', '--at', 't=1']);
    expect(text).toMatch(/regimes: VACUOUS/);
    expect(text).toMatch(/premises not machine-checked \(your judgment or measurement\):\n {4}ab-spring-lc: m, k, L, C > 0; lossless; unforced; x0, q0 nonzero/);
  });
});

describe('F09 — a proof badge carries its theorem scope', () => {
  it('the pendulum badge line says what the formal reference does not certify', async () => {
    const { text } = await run(['atlas', 'ab-pendulum-linear']);
    expect(text).toMatch(
      /formally-proved \(derived from formalRef\): YES — for the formal-reference statement only \(fidelity sanity-lemmas\); NOT the bound, regime, horizon or side conditions unless the statement says so/,
    );
  });

  it('a rank-1 reference is formally-proved for its statement only', async () => {
    const { text } = await run(['atlas', 'ab-kg-schrodinger']);
    expect(text).toMatch(
      /formally-proved \(derived from formalRef\): YES — for the formal-reference statement only \(fidelity sanity-lemmas\); NOT the bound, regime, horizon or side conditions unless the statement says so/,
    );
    expect(text).toMatch(/covers: bound\.delta exactly, at the dispersion relation — covers its statement only/);
  });

  it('a bridge with no formal reference is unchanged', async () => {
    const { text } = await run(['atlas', 'ab-chain-wave']);
    expect(text).toMatch(/formally-proved \(derived from formalRef\): no\n/);
  });

  it('the uniform-mode restriction is formally-proved for its statement only', async () => {
    const { text } = await run(['atlas', 'ab-kg-oscillator']);
    expect(text).toMatch(
      /formally-proved \(derived from formalRef\): YES — for the formal-reference statement only \(fidelity sanity-lemmas\); NOT the bound, regime, horizon or side conditions unless the statement says so/,
    );
    expect(text).toMatch(/covers: the restriction, in Physlib's own terms — covers its statement only/);
  });
});

// Already true when the audit ran (it read the text view only); pinned across every export so a
// later change cannot merge "no overlay metadata" into "did not match".
describe('F10 — an evidence-filtered export keeps absent evidence apart from non-matching evidence', () => {
  const split = /118 of 267 kept; 39 dropped \(did not match\); 110 dropped \(no overlay metadata\)/;
  // 94 kept and 63 dropped is the record from before the PhysJS manifest carried kind: twenty-four catalog
  // theorems that state their equations were labelled derivation-step.
  for (const format of ['text', 'mermaid', 'dot']) {
    it(`--format=${format}`, async () => {
      const { text } = await run(['map', '--source=both', '--evidence=formally-proved', `--format=${format}`]);
      expect(text).toMatch(split);
    });
  }
  it('--json', async () => {
    const c = capture();
    await runCli(['map', '--source=both', '--evidence=formally-proved', '--json'], c.io);
    expect(JSON.parse(c.lines.join('')).result.filter).toEqual({
      total: 267,
      kept: 118,
      droppedNotMatching: 39,
      droppedMissingMetadata: 110,
      evidence: 'formally-proved',
    });
  });
});

describe('F11 — DECOY is a failed dimensional reconstruction, not a physical refutation', () => {
  it('the heading names the reconstruction that failed and disclaims refutation', async () => {
    const { text } = await run(['audit']);
    expect(text).toMatch(
      /DIMENSIONAL-RECONSTRUCTION MISMATCH \(DECOY, 23\) — a set of constants closes the dimensions, but its monomial does not reproduce the evaluator/,
      // 16 is the record from before the catalog graph held every relation.
      // 15 is the record from before be-134..146. be-137 is the new decoy.
      // 11 is the record from before be-103..125. be-109, be-117, be-120, and be-121 are the four new decoys.
    );
    expect(text).toMatch(/NOT a physical refutation/);
    expect(text).not.toMatch(/DECOY \(5\) — dimensionally valid but wrong form/);
  });

  it('--json keeps the decoy key and defines it', async () => {
    const c = capture();
    await runCli(['audit', '--json'], c.io);
    const env = JSON.parse(c.lines.join(''));
    const r = env.result;
    expect(r.decoy.map((d: { id: string }) => d.id)).toContain('be-51');
    expect(r.decoy.map((d: { id: string }) => d.id)).not.toContain('be-69');
    expect(r.notAMonomial.map((d: { id: string }) => d.id)).toContain('be-69');
    expect(env.definitions.decoy).toMatch(/not a physical refutation/);
    expect(env.definitions['not-a-monomial']).toMatch(/not a proportionality/);
  });
});

describe('F12 — symbolic output groups every denominator and round-trips through eval', () => {
  it('CT-1b shows its whole denominator grouped', async () => {
    const { text } = await run(['symbolic']);
    expect(text).toMatch(/hawking-temperature\(mass\) = hbar·c \/ \(4pi·k_B·\(2·G·mass \/ c\^2\)\)/);
    expect(text).not.toMatch(/hbar·c \/ 4pi·/);
  });

  for (const simplify of [false, true]) {
    it(`every printed eval form reproduces its value${simplify ? ' (--simplify)' : ''}`, async () => {
      const c = capture();
      await runCli(['symbolic', '--json', ...(simplify ? ['--simplify'] : [])], c.io);
      const rows = JSON.parse(c.lines.join('')).result as { value: number; evalForm: { formula: string; bindings: string[] } }[];
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        const stdout: string[] = [];
        const stderr: string[] = [];
        expect(await runCli(['eval', row.evalForm.formula, ...row.evalForm.bindings, '--json'], {
          out: (l?: string) => stdout.push((l ?? '') + '\n'),
          err: (l?: string) => stderr.push((l ?? '') + '\n'),
          write: (s: string) => stdout.push(s),
        })).toBe(0);
        const value = JSON.parse(stdout.join('')).result.value as number;
        expect(Math.abs(value / row.value - 1)).toBeLessThan(1e-12);
        if (row.evalForm.formula.includes('hbar')) expect(stderr.join('')).toMatch(/HBAR_SI/);
      }
    });
  }

  it('the text view prints the eval form as a runnable command', async () => {
    const { text } = await run(['symbolic']);
    expect(text).toMatch(/eval form: {2}upt eval "hbar\*c\/\(\(4\*pi\)\*k_B\*\(2\*G\*mass\/c\^2\)\)" .*mass=1\.989e\+?30/);
  });
});

describe('top-level help agrees with the commands it summarizes', () => {
  it('confront: margin to the acceptance threshold, not "to exclusion" (F07)', async () => {
    const { text } = await run(['help']);
    expect(text).not.toMatch(/margin to exclusion/);
    expect(text).toMatch(/1σ acceptance threshold/);
  });

  it('ground: documents --source (F04)', async () => {
    const { text } = await run(['help']);
    expect(text).toMatch(/upt ground <quantityA> <quantityB> \[--source=catalog\|canonical\|both\]/);
  });

  it('path: says a route may cross families (F01)', async () => {
    const { text } = await run(['help']);
    expect(text).toMatch(/across families/);
  });
});
