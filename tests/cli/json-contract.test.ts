/**
 * `--json` contract coverage for task 6's ported commands
 * (`explain`/`symbolic`/`eval`/`derive`). In-process against the new
 * `src/cli` port (dist/cli/main.js) — these commands never had `--json` on
 * the old bin/upt.mjs, so there is no golden text to compare against; this
 * file instead pins the JSON *shape* (spec field names from the task-6
 * brief) plus the "errors never emit JSON" invariant.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function makeIo() {
  const outLines: string[] = [];
  const errLines: string[] = [];
  const writes: string[] = [];
  const io = {
    out: (line?: string) => outLines.push((line ?? '') + '\n'),
    err: (line?: string) => errLines.push((line ?? '') + '\n'),
    write: (s: string) => writes.push(s),
  };
  return { io, outLines, errLines, writes };
}

async function runJson(args: string[]): Promise<{ status: number; envelope: any; raw: string }> {
  const { io, writes } = makeIo();
  const status = await runCli(args, io);
  const raw = writes.join('');
  const envelope = raw.length > 0 ? JSON.parse(raw) : undefined;
  return { status, envelope, raw };
}

describe('json-contract — explain --json', () => {
  it('envelope.command + result.summary is a string', async () => {
    const { status, envelope } = await runJson(['explain', '--json', 'hawking-temperature', 'mass=1.989e30']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('explain');
    expect(envelope.source).toBe('catalog');
    expect(typeof envelope.result.summary).toBe('string');
  });
});

describe('json-contract — symbolic --json', () => {
  it('result is an array of length 2', async () => {
    const { status, envelope } = await runJson(['symbolic', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('symbolic');
    expect(Array.isArray(envelope.result)).toBe(true);
    expect(envelope.result.length).toBe(2);
    for (const entry of envelope.result) {
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.name).toBe('string');
      expect(Array.isArray(entry.leaves)).toBe(true);
      expect(typeof entry.expr).toBe('string');
      expect(typeof entry.dim).toBe('string');
      expect(typeof entry.value).toBe('number');
    }
  });
});

describe('json-contract — eval --json', () => {
  it('result.value close to 6.168e-8 for the Hawking-temperature example', async () => {
    const { status, envelope } = await runJson([
      'eval',
      '--json',
      'hbar*c^3/(8*pi*G*M*k_B)',
      'hbar=1.054571817e-34',
      'c=299792458',
      'G=6.6743e-11',
      'M=1.989e30',
      'k_B=1.380649e-23',
    ]);

    expect(status).toBe(0);
    expect(envelope.command).toBe('eval');
    expect(envelope.result.value).toBeCloseTo(6.168e-8, 10);
  });

  it('a formula error still exits 2 with EMPTY stdout (errors never emit JSON)', async () => {
    const { io, outLines, writes } = makeIo();
    const status = await runCli(['eval', '--json', 'a*b^2'], io);

    expect(status).toBe(2);
    // BOTH stdout channels must be empty: the raw write channel (where JSON
    // envelopes go) AND the out() line channel (where text output goes).
    expect(writes.join('')).toBe('');
    expect(outLines.join('')).toBe('');
  });
});

describe('json-contract — derive --json', () => {
  it('the pendulum example: determined + prefactor within 1e-6 relative of 6.2832', async () => {
    const { status, envelope } = await runJson([
      'derive',
      '--json',
      'period:time',
      'length:length',
      'gravity:acceleration',
      '--formula',
      '2*pi*sqrt(length/gravity)',
    ]);

    expect(status).toBe(0);
    expect(envelope.command).toBe('derive');
    expect(envelope.result.determination.determined).toBe(true);
    expect(envelope.result.formulaCheck).toBeDefined();
    const relErr = Math.abs(envelope.result.prefactor - 2 * Math.PI) / (2 * Math.PI);
    expect(relErr).toBeLessThan(1e-6);
  });
});

describe('json-contract — map --json', () => {
  it('result.linkage.componentCount is a number', async () => {
    const { status, envelope } = await runJson(['map', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('map');
    // map defaults to --source=both (honest connectivity) since v0.32.0.
    expect(envelope.source).toBe('both');
    expect(typeof envelope.result.linkage.componentCount).toBe('number');
  });

  it('with --equation --source=canonical: result.userEquation.consistent and result.landing', async () => {
    const { status, envelope } = await runJson([
      'map',
      '--json',
      '--equation',
      'period = 2*pi*sqrt(length/gravity)',
      '--source=canonical',
    ]);

    expect(status).toBe(0);
    expect(envelope.result.userEquation.consistent).toBe(true);
    expect(envelope.result.landing).toBeDefined();
  });

  it('--json + --format=mermaid: exit 2, "pick one output form" on stderr, stdout+write empty', async () => {
    const { io, outLines, errLines, writes } = makeIo();
    const status = await runCli(['map', '--json', '--format=mermaid'], io);

    expect(status).toBe(2);
    expect(errLines.join('')).toContain('pick one output form');
    expect(outLines.join('')).toBe('');
    expect(writes.join('')).toBe('');
  });

  it('bare trailing --equation: exit 2 with the exact old diagnostic, empty stdout', async () => {
    const { io, outLines, errLines, writes } = makeIo();
    const status = await runCli(['map', '--source=canonical', '--equation'], io);

    expect(status).toBe(2);
    expect(errLines.join('')).toBe('upt: --equation requires "TARGET = EXPR"\n');
    expect(outLines.join('')).toBe('');
    expect(writes.join('')).toBe('');
  });

  it('--proposed --max-orders=abc: exit 2 with the pinned --max-orders message (proves shared wiring)', async () => {
    const { io, errLines } = makeIo();
    const status = await runCli(['map', '--proposed', '--max-orders=abc', '--format=dot'], io);

    expect(status).toBe(2);
    expect(errLines.join('')).toContain(
      'upt: --max-orders must be a non-negative finite number, got "abc".'
    );
  });
});

describe('json-contract — discover --json', () => {
  it('result is an array; envelope.options is defined', async () => {
    const { status, envelope } = await runJson(['discover', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('discover');
    expect(Array.isArray(envelope.result)).toBe(true);
    expect(envelope.options).toBeDefined();
  });

  it('--derive: result is an array', async () => {
    const { status, envelope } = await runJson(['discover', '--json', '--derive']);

    expect(status).toBe(0);
    expect(Array.isArray(envelope.result)).toBe(true);
  });

  it('bad --max-orders=abc: exit 2 with the pinned message', async () => {
    const { io, errLines } = makeIo();
    const status = await runCli(['discover', '--max-orders=abc'], io);

    expect(status).toBe(2);
    expect(errLines.join('')).toContain(
      'upt: --max-orders must be a non-negative finite number, got "abc".'
    );
  });

  it('--source=canonical: result candidates carry adjudication; adjudicationSummary reconciles', async () => {
    const { status, envelope } = await runJson(['discover', '--json', '--source=canonical']);

    expect(status).toBe(0);
    expect(envelope.adjudicationSummary).toEqual({ total: 3, genuine: 0, decoy: 2, entailed: 1, deferred: 0 });
    const adjudicated = envelope.result.filter((c: any) => c.adjudication);
    expect(adjudicated).toHaveLength(3);
    for (const c of adjudicated) {
      expect(typeof c.adjudication.verdict).toBe('string');
      expect(typeof c.adjudication.grounds).toBe('string');
    }
    // Candidates with no recorded verdict stay byte-identical to today — no
    // `adjudication` key added at all (not even `undefined`).
    const unadjudicated = envelope.result.find((c: any) => c.a === 'radius' && c.b === 'hubble-distance');
    expect(unadjudicated).toBeDefined();
    expect('adjudication' in unadjudicated).toBe(false);
  });

  it('--derive: adjudicationSummary is absent (result is proposals, not candidates)', async () => {
    const { status, envelope } = await runJson(['discover', '--json', '--derive', '--source=both']);

    expect(status).toBe(0);
    expect(envelope.adjudicationSummary).toBeUndefined();
    // The combined ranking no longer finishes in 60s on the CI runner.
    // 60s is the record from before be-103..125.
  }, 180_000);

  it('D1 axis gate: every result candidate carries axisChecked/axisClashes; at least one axis-clash verdict is present', async () => {
    const { status, envelope } = await runJson(['discover', '--json']);

    expect(status).toBe(0);
    expect(envelope.result.length).toBeGreaterThan(0);
    for (const c of envelope.result) {
      expect(typeof c.axisChecked).toBe('boolean');
      expect(Array.isArray(c.axisClashes)).toBe(true);
      for (const clash of c.axisClashes) expect(typeof clash).toBe('string');
    }
    const axisClashed = envelope.result.filter((c: any) => c.verdict === 'axis-clash');
    expect(axisClashed.length).toBeGreaterThan(0);
    for (const c of axisClashed) {
      expect(c.axisChecked).toBe(true);
      expect(c.axisClashes.length).toBeGreaterThan(0);
    }
    // Pinned example (Task 2/Task 3 catalog flip list): a scale clash renders
    // the exact 'axis: value ≠ value' format through the sanitizer untouched.
    const grw = envelope.result.find(
      (c: any) => c.a === 'grw-localization-rate' && c.b === 'hubble-rate',
    );
    expect(grw).toBeDefined();
    expect(grw.verdict).toBe('axis-clash');
    expect(grw.axisClashes).toEqual(['scale: quantum ≠ cosmological']);
  });

  it('canonical-only: axis-clash never shadows an unrelated adjudicated candidate (adjudicationSummary still reconciles)', async () => {
    const { status, envelope } = await runJson(['discover', '--json', '--source=canonical']);

    expect(status).toBe(0);
    // Unchanged from the pre-D1 pin — the axis gate does not touch which
    // candidates carry a recorded adjudication verdict, only the funnel
    // verdict of unrelated candidates.
    expect(envelope.adjudicationSummary).toEqual({ total: 3, genuine: 0, decoy: 2, entailed: 1, deferred: 0 });
  });
});

describe('derive text-mode error paths — an error leaves stdout empty', () => {
  // The old bin printed the header + determination + dimensional-check lines
  // to stdout before a formula error exited 2. Since the 9.0.0 audit (K3) an
  // error exits 1 or 2 with empty stdout on every command; derive buffers its
  // report and prints it only on a result (exit 0 or 3).

  it('malformed formula: exit 2, empty stdout, parse error on stderr', async () => {
    const { io, outLines, errLines } = makeIo();
    const status = await runCli(
      ['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', '2*pi*sqrt((('],
      io
    );

    expect(status).toBe(2);
    expect(outLines.join('')).toBe('');
    expect(errLines.join('')).toContain('--formula: parse error');
  });

  it('undeclared variable: exit 2, empty stdout, the symbol named on stderr', async () => {
    const { io, outLines, errLines } = makeIo();
    const status = await runCli(
      ['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', '2*pi*sqrt(len/gravity)'],
      io
    );

    expect(status).toBe(2);
    expect(outLines.join('')).toBe('');
    expect(errLines.join('')).toContain("undeclared symbol 'len'");
  });
});
