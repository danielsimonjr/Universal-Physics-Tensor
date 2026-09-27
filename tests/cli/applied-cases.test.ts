/**
 * `upt evaluate case-<id>` (audit §14 I20): an applied case prints its parent
 * and scalar equations, observable, checks and measurement route; a violated
 * regime check prints NOT QUALIFIED and exits 3. In-process against
 * dist/cli/main.js.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { APPLIED_CASES } from '../../dist/cases/index.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('upt evaluate <case-id>', () => {
  it('lists the applied cases with their inputs and a worked invocation', async () => {
    const r = await run(['evaluate']);
    expect(r.code).toBe(0);
    for (const c of APPLIED_CASES.values()) {
      expect(r.text).toContain(`  ${c.id}  ${c.title}\n`);
      expect(r.text).toContain(`e.g. upt evaluate ${c.id} ${c.examples.valid.args.join(' ')}`);
    }
    const env = JSON.parse((await run(['evaluate', '--json'])).text);
    expect(env.result.filter((e: any) => e.caseId !== undefined).map((e: any) => e.caseId)).toEqual([...APPLIED_CASES.keys()]);
    expect(env.result.find((e: any) => e.bridgeId === 58).name).toBe('Johnson-Nyquist noise');
  });

  it.each([...APPLIED_CASES.values()].map((c) => [c.id, c] as const))('%s: the valid example is QUALIFIED and exits 0', async (_, c) => {
    const r = await run(['evaluate', c.id, ...c.examples.valid.args]);
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/parent equations \(what the scalar result simplifies; not evaluated as the answer\):/);
    expect(r.text).toMatch(/scalar simplification evaluated:/);
    expect(r.text).toMatch(new RegExp(`\\n  observable: ${c.observable} = `));
    expect(r.text).toMatch(/QUALIFIED: every regime check holds at these inputs\./);
    expect(r.text).not.toMatch(/VIOLATED|NOT QUALIFIED/);
    expect(r.text).toMatch(/compare with a measurement:/);
  });

  it.each([...APPLIED_CASES.values()].map((c) => [c.id, c] as const))('%s: each failure example is NOT QUALIFIED and exits 3, text and --json', async (_, c) => {
    for (const ex of c.examples.failures) {
      const r = await run(['evaluate', c.id, ...ex.args]);
      expect(r.code, ex.args.join(' ')).toBe(3);
      expect(r.text).toMatch(new RegExp(`NOT QUALIFIED: ${ex.fails.join(', ')} violated`));
      for (const id of ex.fails) expect(r.text).toMatch(new RegExp(`VIOLATED {2}${id}: `));
      const j = await run(['evaluate', c.id, ...ex.args, '--json']);
      expect(j.code).toBe(3);
      const env = JSON.parse(j.text);
      expect(env.result.qualified).toBe(false);
      expect(env.result.failedChecks).toEqual(ex.fails);
    }
  });

  it('--json carries the whole case: equations, outputs with units, checks, links', async () => {
    const c = APPLIED_CASES.get('case-resistor-noise')!;
    const r = await run(['evaluate', c.id, ...c.examples.valid.args, '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.text);
    expect(env.result).toMatchObject({ caseId: c.id, qualified: true, failedChecks: [], observable: 'V_rms_V' });
    expect(env.result.governing.parent.length).toBeGreaterThan(0);
    const v = env.result.outputs.find((o: any) => o.key === 'V_rms_V');
    expect(v.unit).toBe('V');
    expect(v.value).toBeCloseTo(4.0683e-7, 10);
    expect(env.result.checks.map((k: any) => k.id)).toEqual(['classical', 'flat-band', 'amplifier']);
    expect(env.result.outputs.find((o: any) => o.key === 'V_rms_total_V').value).toBeCloseTo(4.3069e-7, 11);
    expect(env.result.conversions.find((x: any) => x.key === 'C_in_F').value).toBeCloseTo(2e-11, 22);
  });

  it('an optional input is declared as such and may be left out; its outputs are then undefined, not zero', async () => {
    const c = APPLIED_CASES.get('case-resistor-noise')!;
    const args = c.examples.valid.args.filter((a) => !/^(e_n2|i_n2)_/.test(a));
    const r = await run(['evaluate', c.id, ...args]);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/e_n2_V2_per_Hz \[V\^2\/Hz\] amplifier voltage-noise power density e_n² \(optional\)/);
    expect(r.text).toMatch(/V_rms_total_V = undefined here/);
    expect(r.text).not.toMatch(/amplifier: 1\/\(φ/);
  });

  it('--sigma propagates through a case and says the checks were taken at the given inputs only', async () => {
    const c = APPLIED_CASES.get('case-resistor-noise')!;
    const r = await run(['evaluate', c.id, ...c.examples.valid.args, '--sigma', 'T_K=0.3', '--sigma', 'R_ohm=1']);
    expect(r.code).toBe(0);
    // u(V)/V = ½ √((u_T/T)² + (u_R/R · R_in/(R+R_in))²) for V ∝ √(T R_eff).
    const rel = 0.5 * Math.hypot(0.3 / 300, (1 / 1000) * (1e6 / 1.001e6));
    const m = /V_rms_V = [\d.e-]+ ± ([\d.e-]+) \(1σ; relative ([\d.e-]+)%\)/.exec(r.text);
    expect(m).not.toBeNull();
    expect(Math.abs(Number(m![2]) / 100 / rel - 1)).toBeLessThan(0.01);
    expect(r.text).toMatch(/the regime checks are evaluated at the given inputs, not at ±u/);
  });

  it('case-brownian-sphere: a diameter is converted to the radius and says so; a radius key named twice is refused', async () => {
    const args = ['T_K=293.15', 'eta_Pa_s=1e-3', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2'];
    const r = await run(['evaluate', 'case-brownian-sphere', 'diameter_m=2um', ...args]);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/converted: diameter_m=2um is the diameter 2a of the sphere; a_m = 0\.5 × 0\.000002 = 0\.000001 m/);
    expect(r.text).toMatch(/D_m2_per_s = 2\.147197822774807\d*e-13 m\^2\/s/);
    expect((await run(['evaluate', 'case-brownian-sphere', 'diameter_m=2um', 'a_m=1um', ...args])).code).toBe(1);
  });

  it('an undeclared key exits 1; an unknown target is a usage error (exit 2)', async () => {
    const c = APPLIED_CASES.get('case-resistor-noise')!;
    expect((await run(['evaluate', c.id, ...c.examples.valid.args, 'B_Hz=1e4'])).code).toBe(1);
    expect((await run(['evaluate', 'case-nothing'])).code).toBe(2);
    expect((await run(['evaluate', c.id, 'T_K=300'])).code).toBe(1);
  });
});
