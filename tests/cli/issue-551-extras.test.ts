/**
 * The two extra outputs of issue 551: be-129's fin parameter `m_per_m` and
 * be-131's thin-wall (Korteweg) wave speed `c_m_per_s`.
 *
 * Both records already stated the quantities on the same result ("m is on the
 * same result and is not a second edge") before the record carried the output;
 * this pins the record's output against an independently computed value. The
 * bindings go through the one evaluation `upt evaluate` makes:
 * `evaluateResolved` at `want: 'all'`, so an input only an output reads would
 * be required. It is not here: every parameter of both evaluators owns a
 * relation source, so every binding is a value input.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { evaluateResolved, resolveEvaluable } from '../../src/composition/evaluate-relation.js';
import type { Evaluation } from '../../src/composition/evaluate-relation.js';

const REL = (a: number, b: number): number => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

async function cli(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, text: cap.lines.join(''), err: cap.err.join('') };
}

describe('issue 551: the two extra outputs evaluate through `upt evaluate` (want all)', () => {
  it('be-129 returns m_per_m = sqrt(2 h/(k t)) beside the efficiency value', () => {
    const inputs = { h_W_per_m2_K: 20, k_W_per_m_K: 200, t_m: 0.001, L_fin_m: 0.05 };
    const result: Evaluation = evaluateResolved(resolveEvaluable('be-129'), inputs, 'all');
    expect(result.kind).toBe('value');
    if (result.kind !== 'value') return;
    const mPerM = result.extras.find((extra) => extra.name === 'm_per_m');
    expect(mPerM).toBeDefined();
    expect(mPerM!.unit).toBe('1/m');
    expect(mPerM!.meaning).toContain('sqrt(2 h/(k t))');
    expect(REL(mPerM!.value, Math.sqrt(200))).toBeLessThan(1e-12);
    // m is not a second edge: the value stays the efficiency η = tanh(m L)/(m L), m L = √200 · 0.05.
    const mL = Math.sqrt(200) * 0.05;
    expect(REL(result.value, Math.tanh(mL) / mL)).toBeLessThan(1e-12);
  });

  it('be-131 returns c_m_per_s beside the pressure value ρ c Δv', () => {
    const inputs = { rho_kg_per_m3: 1000, dv_m_per_s: 1, K_Pa: 2.2e9, E_Pa: 2e9, pipe_D_m: 0.05, wall_m: 0.002 };
    const result: Evaluation = evaluateResolved(resolveEvaluable('be-131'), inputs, 'all');
    expect(result.kind).toBe('value');
    if (result.kind !== 'value') return;
    const cKorteweg = result.extras.find((extra) => extra.name === 'c_m_per_s');
    expect(cKorteweg).toBeDefined();
    expect(cKorteweg!.unit).toBe('m/s');
    expect(cKorteweg!.meaning).toContain('sqrt(K/rho)');
    // c = √(K/ρ) / √(1 + (K/E)(D/e)) with K = 2.2 GPa, E = 2 GPa, D = 5 cm, e = 2 mm.
    expect(REL(cKorteweg!.value, 277.83625115549687)).toBeLessThan(1e-12);
    expect(REL(result.value, 1000 * cKorteweg!.value * 1)).toBeLessThan(1e-12);
  });

  it('the CLI command prints and serializes both extras', async () => {
    const finInputs = { h_W_per_m2_K: 20, k_W_per_m_K: 200, t_m: 0.001, L_fin_m: 0.05 };
    const finLibrary = evaluateResolved(resolveEvaluable('be-129'), finInputs, 'all');
    const fin = await cli(['evaluate', 'be-129', 'h_W_per_m2_K=20', 'k_W_per_m_K=200', 't_m=0.001', 'L_fin_m=0.05']);
    expect(fin.code).toBe(0);
    const finM = finLibrary.kind === 'value' ? finLibrary.extras.find((extra) => extra.name === 'm_per_m') : undefined;
    expect(fin.text).toContain(`m_per_m [1/m] = ${finM!.value}`);

    const joukowskyInputs = { rho_kg_per_m3: 1000, dv_m_per_s: 1, K_Pa: 2.2e9, E_Pa: 2e9, pipe_D_m: 0.05, wall_m: 0.002 };
    const joukowskyLibrary = evaluateResolved(resolveEvaluable('be-131'), joukowskyInputs, 'all');
    const joukowsky = await cli([
      'evaluate', 'be-131',
      'rho_kg_per_m3=1000', 'dv_m_per_s=1', 'K_Pa=2.2e9', 'E_Pa=2e9', 'pipe_D_m=0.05', 'wall_m=0.002',
    ]);
    expect(joukowsky.code).toBe(0);
    const joukowskyC = joukowskyLibrary.kind === 'value' ? joukowskyLibrary.extras.find((extra) => extra.name === 'c_m_per_s') : undefined;
    expect(joukowsky.text).toContain(`c_m_per_s [m/s] = ${joukowskyC!.value}`);
  });
});

describe('issue 551 part two: the be-63 help example states what is printed', () => {
  const M_SUN = 1.989e30;

  it('`upt evaluate be-63 mu_e=2` prints a kg mass that rounds to 1.456 solar masses', async () => {
    const { code, text } = await cli(['evaluate', 'be-63', 'mu_e=2']);
    expect(code).toBe(0);
    const line = text.split('\n').find((l) => l.includes('mass [kg] ='));
    expect(line).toBeDefined();
    const value = Number(line!.match(/mass \[kg\] = (\S+)/)![1]);
    expect(Number.isFinite(value)).toBe(true);
    // The help example's solar-mass figure: M / M_⊙, rounded to four significant figures.
    expect(Number((value / M_SUN).toPrecision(4))).toBe(1.456);
  });

  it('`upt help evaluate` states the kg value alongside the solar-mass figure', async () => {
    const { code, text } = await cli(['help', 'evaluate']);
    expect(code).toBe(0);
    expect(text).toContain('2.896e30 kg');
    expect(text).toContain('1.456 M_⊙');
  });
});