/**
 * §14 improvements of the CLI-only applied-physicist audit
 * (docs/audit/Universal_Physics_Tensor_CLI_Audit.md). One block per improvement.
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
async function json(args: string[]): Promise<any> {
  const c = capture();
  const code = await runCli([...args, '--json'], c.io);
  expect(code).toBe(0);
  return JSON.parse(c.lines.join(''));
}
/** The lines of one record's block in `upt regime` text output. */
function block(text: string, id: string): string {
  const start = text.indexOf(`] ${id}:`);
  expect(start).toBeGreaterThan(-1);
  const rest = text.slice(start);
  const end = rest.search(/\n {2}\[|\n\n/);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('I11 — discovery readiness by dimension; connectivity alone is not evidence', () => {
  it('the audit example (a ≟ classical-electron-radius) states its premise, its missing inputs and an observation', async () => {
    const { text } = await run(['discover', '--source=canonical']);
    const row = text.slice(text.indexOf('    a ≟ classical-electron-radius'));
    const r = row.slice(0, row.slice(1).search(/\n {4}\S/) + 1);
    expect(r).toMatch(/^ {4}a ≟ classical-electron-radius .*\n {8}unlocks: a, perihelion-precession\n/);
    expect(r).toMatch(/\[readiness — structure: merges components, unlocks 2 · kind: dimension-only · independent falsifiers survived: none \(abstained: magnitude, axis, consequence\) · mechanism: none · data: none\]/);
    expect(r).toMatch(/\[to make it testable — premise: a and classical-electron-radius are the same physical quantity, not only both \[length\]/);
    expect(r).toMatch(/needs a representative magnitude for: a\b/);
    expect(r).toMatch(/observation: measure a and classical-electron-radius in one system that defines both/);
  });

  it('--json readiness agrees with the gate fields, and magnitudeMissing agrees with the sourced table', async () => {
    const { REPRESENTATIVE_VALUES } = await import('../../dist/cli-api.js');
    const env = await json(['discover', '--source=catalog']);
    const promising = env.result.filter((c: any) => c.verdict === 'promising');
    expect(promising.length).toBeGreaterThan(0);
    let survivedAny = 0;
    for (const c of promising) {
      const s = c.readiness.falsifiers.survived as string[];
      expect(s.includes('magnitude')).toBe(c.magnitudeChecked && c.magnitudeAnchorInvariant !== true);
      expect(s.includes('axis')).toBe(c.axisChecked && c.axisClashes.length === 0);
      expect(s.includes('consequence')).toBe(c.consequence?.signal === 'entailed');
      expect(c.readiness.falsifiers.abstained.filter((f: string) => s.includes(f))).toEqual([]);
      for (const e of c.magnitudeMissing) expect(REPRESENTATIVE_VALUES[e]).toBeUndefined();
      expect(c.readiness.mechanismTested).toBe(false);
      if (s.length > 0) survivedAny++;
    }
    expect(survivedAny).toBeGreaterThan(0);
  });

  it('--require-falsifier hides a row that only connectivity supports, and says how many', async () => {
    const all = await json(['discover', '--source=catalog']);
    const p = all.result.filter((c: any) => c.verdict === 'promising');
    const kept = p.filter((c: any) => c.readiness.falsifiers.survived.length > 0);
    const { text } = await run(['discover', '--source=catalog', '--require-falsifier']);
    const section = text.slice(text.indexOf('  PROMISING ('));
    const listed = (section.slice(0, section.indexOf('\n\n')).match(/^ {4}\S+ ≟ \S+/gm) ?? []).length;
    expect(text).toMatch(new RegExp(`--require-falsifier: ${p.length - kept.length} of the ${p.length} promising hidden — no independent falsifier ran and survived \\(connectivity alone is not evidence\\)`));
    expect(listed).toBeLessThanOrEqual(kept.length);
    expect(listed).toBeGreaterThan(0);
    const canonical = await run(['discover', '--source=canonical', '--require-falsifier']);
    const n = /→ {2}(\d+) promising/.exec(canonical.text)![1];
    expect(canonical.text).toContain(`--require-falsifier: ${n} of the ${n} promising hidden`);
  });
});

const STOKES_AT = ['--at', 'Re=0.05', 'm=1e-15', 'gamma=1e-8', 't=1'];

describe('I7 — a premise checklist: machine-checked, declared by you, denied by you, unspecified', () => {
  it('Stokes–Einstein names each satisfied inequality apart from a declared no-slip premise', async () => {
    const { text } = await run(['regime', 'diffusion', ...STOKES_AT, '--assume', 'no-slip']);
    const b = block(text, 'ab-stokes-einstein');
    expect(b).toMatch(/\n {4}satisfied: Re <= 0\.1 /);
    expect(b).toMatch(/\n {4}satisfied: m · gamma\^-1 · t\^-1 <= 0\.01 /);
    expect(b).toMatch(/\n {4}declared by you \(a declaration, not evidence\): no-slip boundary\n/);
    const unspecified = /\n {4}premises not machine-checked: (.*)/.exec(b)![1]!;
    expect(unspecified).not.toMatch(/no-slip/);
    expect(unspecified).toMatch(/creeping flow/);
  });

  it('without --assume nothing is declared: every prose premise stays unspecified', async () => {
    const { text } = await run(['regime', 'diffusion', ...STOKES_AT]);
    const b = block(text, 'ab-stokes-einstein');
    expect(b).not.toMatch(/declared by you/);
    expect(/\n {4}premises not machine-checked: (.*)/.exec(b)![1]).toMatch(/no-slip boundary/);
  });

  it('spring–LC: --deny lossless marks the premise contradicted, and the inequality verdict is untouched', async () => {
    const { text } = await run(['regime', 'oscillators', '--deny', 'lossless']);
    const b = block(text, 'ab-spring-lc');
    expect(b).toMatch(/^\] ab-spring-lc: valid \(VACUOUS/);
    expect(b).toMatch(/\n {4}CONTRADICTED by your --deny: lossless — this record does not apply as stated/);
    expect(/\n {4}premises not machine-checked: (.*)/.exec(b)![1]).not.toMatch(/lossless/);
  });

  it('a declaration that matches no side condition is named and ignored, not silently dropped', async () => {
    const { text } = await run(['regime', 'oscillators', '--assume', 'frictionless']);
    expect(text).toMatch(/--assume 'frictionless' matches no side condition in family 'oscillators'; ignored/);
  });

  it('the same premise cannot be both assumed and denied', async () => {
    const { code, text } = await run(['regime', 'oscillators', '--assume', 'lossless', '--deny', 'lossless']);
    expect(code).toBe(1);
    expect(text).toMatch(/'lossless' is both assumed and denied/);
  });

  it('--json keeps the states apart, with the basis of each', async () => {
    const env = await json(['regime', 'diffusion', ...STOKES_AT, '--assume', 'no-slip']);
    const r = env.result.records.find((x: any) => x.id === 'ab-stokes-einstein');
    expect(r.premises.machine.satisfied).toHaveLength(2);
    expect(r.premises.machine.violated).toEqual([]);
    expect(r.premises.machine.unchecked).toEqual([]);
    expect(r.premises.declaredByUser).toEqual(['no-slip boundary']);
    expect(r.premises.deniedByUser).toEqual([]);
    expect(r.premises.unspecified).toHaveLength(2);
    expect(env.options.assume).toEqual(['no-slip']);
    const model = env.result.records.find((x: any) => x.kind === 'model');
    expect(model.premises.declaredByUser).toEqual([]);
  });
});
