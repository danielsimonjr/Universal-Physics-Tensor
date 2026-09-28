/**
 * §14 improvements of the CLI-only applied-physicist audit
 * (docs/audit/Universal_Physics_Tensor_CLI_Audit.md). One block per improvement.
 * In-process against dist/cli/main.js.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { measuredHorizon } from '../atlas/_phase-drift.js';

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
/**
 * Run one command with a patched api (test-only): the way to reach a state the
 * shipped registry never produces, such as a bridge with no registered witness.
 */
async function runPatched(name: string, args: string[], patch: Record<string, unknown>): Promise<{ code: number; text: string }> {
  const [{ resolveCommand }, { parseArgs }, api] = await Promise.all([
    import('../../dist/cli/command.js'),
    import('../../dist/cli/args.js'),
    import('../../dist/cli-api.js'),
    import('../../dist/cli/commands/index.js'),
  ]);
  const command = resolveCommand(name)!;
  const c = capture();
  const code = await command.run({ args: parseArgs(command.name, args, command.flags), api: { ...api, ...patch }, ...c.io } as any);
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

/** One titled section of `upt search` text output. */
function section(text: string, title: string): string {
  const start = text.indexOf(`\n${title}:`);
  if (start === -1) return '';
  const rest = text.slice(start + 1);
  const end = rest.search(/\n\S/);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('I5 — search by law, model, symbol, alias or description; never by equal dimension', () => {
  it('"Schrödinger" finds the free-particle atlas model and the command that inspects it', async () => {
    const r = await run(['search', 'Schrödinger']);
    expect(r.code).toBe(0);
    const models = section(r.text, 'atlas models');
    expect(models).toMatch(/\n {2}model-schrodinger-free \[diffusion\] {2}\[words in: id\]\n {6}inspect: upt regime diffusion · upt path model-schrodinger-free <to-model>/);
    expect(section(r.text, 'atlas bridges')).toMatch(/\n {2}ab-kg-schrodinger /);
  });

  it('"thermal noise" finds BE-58 with its evaluator inputs and where the words matched', async () => {
    const r = await run(['search', 'thermal', 'noise']);
    expect(r.code).toBe(0);
    const bridges = section(r.text, 'catalog bridges');
    expect(bridges).toMatch(/\n {2}be-58 Johnson-Nyquist noise[^\n]*\[words in: name, description\]\n {6}evaluate: upt evaluate be-58 T_K=… R_ohm=… \(units: T_K in K, R_ohm in ohm; a value may carry its own unit\)/);
  });

  it('control: "radius" never returns a quantity only because its dimension is a length', async () => {
    const r = await run(['search', 'radius']);
    const q = section(r.text, 'quantities');
    expect(q).not.toBe('');
    const names = [...q.matchAll(/\n {2}(\S+) \[/g)].map((m) => m[1]!);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n).toMatch(/radius/);
    expect(q).not.toMatch(/wavelength/);
  });

  it('a one-letter word matches a symbol or genuine alias only, never a stray letter in a description', async () => {
    const r = await run(['search', 'T']);
    expect(section(r.text, 'quantities')).toMatch(/\n {2}temperature \[temperature\][^\n]*\(alias T\)/);
    expect(section(r.text, 'catalog bridges')).toBe('');
  });

  it('no match exits 1 and states the scope searched: an empty result is not an absence from physics', async () => {
    const r = await run(['search', 'zzqqxx']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/no entry matches every word of 'zzqqxx' — searched \d+ catalog bridges, \d+ canonical equations, \d+ atlas models, \d+ atlas bridges, \d+ quantities; this registry only/);
  });

  it('--json lists every match with its kind, the fields its words matched in, and its command', async () => {
    const env = await json(['search', 'thermal', 'noise']);
    expect(env.options.query).toEqual(['thermal', 'noise']);
    const be58 = env.result.matches.find((m: any) => m.id === 'be-58');
    expect(be58.kind).toBe('catalog-bridge');
    expect(be58.matchedIn).toEqual(['name', 'description']);
    expect(be58.command).toBe('upt evaluate be-58 T_K=… R_ohm=…');
  });
});

/** T/T0 − 1 of the pendulum, independently: T/T0 = 1 / AGM(1, cos(θ0/2)). */
function pendulumPeriodError(theta0: number): number {
  let a = 1;
  let b = Math.cos(theta0 / 2);
  for (let i = 0; i < 30; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return 1 / a - 1;
}

const PENDULUM_SWEEP = ['path', 'model-pendulum', 'model-spring', '--at', 'T0=1', 't=10', '--sweep', 'theta0=0.1:0.8:8'];

describe('I18 — a bounded sweep: each row is the point verdict, and an unclaimed row carries no number', () => {
  it('pendulum amplitude sweep: the error grows with θ0 and matches the exact period, and stops at the regime edge', async () => {
    const env = await json(PENDULUM_SWEEP);
    const rows = env.result.rows;
    expect(rows).toHaveLength(8);
    const inside = rows.filter((r: any) => r.value <= 0.5 + 1e-12);
    expect(inside).toHaveLength(5);
    for (const r of inside) {
      expect(r.regime).toBe('holds');
      expect(r.error).toBeCloseTo(pendulumPeriodError(r.value), 12);
    }
    for (let i = 1; i < inside.length; i++) expect(inside[i].error).toBeGreaterThan(inside[i - 1].error);
    for (const r of rows.slice(5)) {
      expect(r.regime).toBe('violated');
      expect(r.error).toBeNull();
    }
    expect(env.result.tally).toEqual({ inRegime: 5, outsideRegime: 3, regimeUnknown: 0, pastHorizon: 2 });
  });

  it('control: inside the regime but past the horizon, the row still carries no error', async () => {
    const env = await json(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', '--sweep', 't=1:200:3']);
    const last = env.result.rows[2];
    expect(last.regime).toBe('holds');
    expect(last.horizon).toBe('violated');
    expect(last.error).toBeNull();
    expect(last.reason).toMatch(/past the horizon/);
    expect(env.result.rows[0].error).not.toBeNull();
  });

  it('KG log sweep covers the low-x region and the violated transition, and says what was evaluated', async () => {
    const r = await run(['path', 'model-klein-gordon', 'model-schrodinger-free', '--at', 'c=1', 'omega0=1', 't=1', '--sweep', 'k=0.01:1:5:log']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/evaluated: the path's closed-form point bound at each sample .* nothing is integrated and no trajectory is produced/);
    expect(r.text).toMatch(/\n {2}0\.01 +holds +holds +0\.0000249\d*\n/);
    expect(r.text).toMatch(/\n {2}1 +violated +holds +— a regime on the path is violated or unchecked\n/);
  });

  it('a path with no composite claim sweeps its status only; no number appears', async () => {
    // model-rlc → model-first-order: exact then approximation, a silent cell. (pendulum → lc
    // composes since the owner decision of 2026-09-27, through ab-spring-lc's norm transport.)
    const env = await json(['path', 'model-rlc', 'model-first-order', '--at', 'm · b^-2 · k=0.01', '--sweep', 't=0.1:1:3']);
    expect(env.result.kind).toBe('no-claim');
    expect(env.result.rows).toHaveLength(3);
    expect(env.result.rows.every((r: any) => r.error === null && r.reason === 'no composite claim')).toBe(true);
  });

  it('--csv writes one header and one line per sample', async () => {
    const r = await run([...PENDULUM_SWEEP, '--csv']);
    const lines = r.text.trim().split('\n');
    expect(lines[0]).toBe('theta0,regime,horizon,error,reason');
    expect(lines).toHaveLength(9);
  });

  it('the sweep is bounded and every role is single', async () => {
    const bad = async (spec: string[], msg: RegExp) => {
      const r = await run(['path', 'model-pendulum', 'model-spring', ...spec]);
      expect(r.code).toBe(1);
      expect(r.text).toMatch(msg);
    };
    await bad(['--sweep', 'theta0=0.1:0.5:1'], /integer sample count from 2 to 200/);
    await bad(['--sweep', 'theta0=0.1:0.5:201'], /integer sample count from 2 to 200/);
    await bad(['--sweep', 'theta0=0.5:0.1:5'], /finite lo < hi/);
    await bad(['--sweep', 'theta0=0:1:5:log'], /log-spaced, so lo must be > 0/);
    await bad(['--at', 'theta0=0.2', '--sweep', 'theta0=0.1:0.5:3'], /'theta0' is both swept and fixed by --at/);
    await bad(['--at', 'theta0=0.2', '--csv'], /--csv needs --sweep/);
  });
});

const JOHNSON = ['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--sigma', 'T_K=3', '--sigma', 'R_ohm=10'];

describe('I9 — uncertainty propagation, kept apart from sensitivity', () => {
  // S_V = 4 k_B T R is a product, so its relative variance is exactly
  // rT² + rR² + 2ρ rT rR; each input here carries 1%.
  it('Johnson noise, independent inputs: relative σ is √2 % (analytic, S ∝ T·R)', async () => {
    const env = await json(JOHNSON);
    const s = env.result.uncertainty.outputs.S_V_V2_per_Hz;
    expect(s.relative).toBeCloseTo(Math.SQRT2 / 100, 8);
    expect(s.contributions.T_K.sensitivity).toBeCloseTo(s.value / 300, 25);
    expect(s.unreliable).toEqual([]);
    expect(env.result.uncertainty.notIncluded).toMatch(/model discrepancy/);
  });

  it('a correlated-input result differs from the independent one, by the analytic amount', async () => {
    const pos = (await json([...JOHNSON, '--corr', 'T_K,R_ohm=0.5'])).result.uncertainty.outputs.S_V_V2_per_Hz;
    const neg = (await json([...JOHNSON, '--corr', 'T_K,R_ohm=-1'])).result.uncertainty.outputs.S_V_V2_per_Hz;
    expect(pos.relative).toBeCloseTo(Math.sqrt(3) / 100, 8);
    expect(neg.relative).toBeCloseTo(0, 10);
  });

  it('control: a strongly nonlinear case is flagged, a linear one is not', async () => {
    const r = await run(['evaluate', 'be-56', 'd_m=1e-6', '--sigma', 'd_m=5e-7']);
    expect(r.text).toMatch(/LINEARIZATION UNRELIABLE for d_m/);
    const lin = await run(JOHNSON);
    expect(lin.text).not.toMatch(/UNRELIABLE/);
  });

  it('an input without σ is named as treated-exact; the text separates sensitivity from contribution', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--sigma', 'T_K=3']);
    expect(r.text).toMatch(/treated as exact \(no --sigma\): R_ohm — a choice, not a measurement/);
    expect(r.text).toMatch(/from T_K: c = [^,]+, c·u = /);
  });

  it('malformed or inconsistent uncertainty input is refused', async () => {
    const bad = async (extra: string[], msg: RegExp) => {
      const r = await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', ...extra]);
      expect(r.code).toBe(1);
      expect(r.text).toMatch(msg);
    };
    await bad(['--sigma', 'T_K=-1'], /is not key=<finite u ≥ 0>/);
    await bad(['--sigma', 'mass=1'], /'mass' is not one of the inputs given/);
    await bad(['--sigma', 'T_K=1', '--corr', 'T_K,R_ohm=0.5'], /names 'R_ohm', which has no --sigma/);
    await bad(['--sigma', 'T_K=1', '--sigma', 'R_ohm=1', '--corr', 'T_K,R_ohm=1.5'], /rho in \[-1, 1\]/);
    await bad(['--corr', 'T_K,R_ohm=0.5'], /--corr needs --sigma/);
  });
});

describe('I6 — every evaluator declares its inputs; units convert only when the dimension agrees', () => {
  const out = async (args: string[]) => (await json(args)).result.output;

  it('a value with a unit gives the same result as the bare SI number', async () => {
    expect(await out(['evaluate', 'be-56', 'd_m=1um'])).toEqual(await out(['evaluate', 'be-56', 'd_m=1e-6']));
    const r = await run(['evaluate', 'be-56', 'd_m=1um']);
    expect(r.text).toMatch(/\n {4}d_m \[m\] plate separation d \(geometry: separation\) — the gap between the facing plate surfaces, > 0\n {6}converted: 1um → 0\.000001 m\n/);
  });

  it('an absolute temperature in degC adds 273.15 K; its σ in degC does not', async () => {
    const c = await out(['evaluate', 'be-58', 'T_K=26.85degC', 'R_ohm=1kohm']);
    const k = await out(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000']);
    expect(c.S_V_V2_per_Hz).toBeCloseTo(k.S_V_V2_per_Hz, 28);
    const env = await json(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--sigma', 'T_K=3degC']);
    expect(env.result.uncertainty.sigma.T_K).toBe(3);
    expect(env.result.uncertainty.outputs.S_V_V2_per_Hz.relative).toBeCloseTo(0.01, 10);
  });

  it('the full major axis is a declared alternate of the semi-major axis, halved and said so', async () => {
    const viaMajor = await json(['evaluate', 'be-52', 'M_kg=1Msun', 'major_axis_m=1.158e11', 'e=0.2056', 'T_yr=88d']);
    const direct = await json(['evaluate', 'be-52', 'M_kg=1.989e30', 'a_m=5.79e10', 'e=0.2056', `T_yr=${88 / 365.25}`]);
    expect(viaMajor.result.inputs.a_m).toBeCloseTo(5.79e10, 0);
    expect(viaMajor.result.output.dphi_rad_per_orbit).toBeCloseTo(direct.result.output.dphi_rad_per_orbit, 18);
    expect(viaMajor.result.conversions.find((c: any) => c.key === 'a_m').via).toBe('major_axis_m');
  });

  it('control: a unit of the wrong dimension, a unit on a pure number and an undeclared key all exit 1', async () => {
    const bad = async (args: string[], msg: RegExp) => {
      const r = await run(['evaluate', ...args]);
      expect(r.code).toBe(1);
      expect(r.text).toMatch(msg);
    };
    await bad(['be-56', 'd_m=1kg'], /be-56: 'kg' is \[mass\], but this input is \[length\] \(m\)/);
    await bad(['be-63', 'mu_e=2m'], /'m' is \[length\], but this input is \[1\] \(dimensionless\)/);
    await bad(['be-56', 'radius_m=1um'], /'radius_m' is not an input here; the inputs are: d_m/);
    await bad(['be-52', 'M_kg=1Msun', 'a_m=5.79e10', 'major_axis_m=1.158e11', 'e=0.2', 'T_yr=0.24'], /'a_m' is given twice \(once through an alternate\)/);
    await bad(['be-58', 'T_K=80degF', 'R_ohm=1'], /Fahrenheit is not accepted/);
  });

  it('the listing declares every input with its unit and meaning', async () => {
    const r = await run(['evaluate']);
    expect(r.text).toMatch(/\n {2}be-58 {2}Johnson-Nyquist noise\n {6}T_K \[K\] temperature T \(an absolute temperature; degC adds 273\.15\) — /);
    const env = await json(['evaluate']);
    expect(env.result.find((s: any) => s.bridgeId === 51).parameters[1]).toMatchObject({ key: 'b_m', unit: 'm', geometry: 'impact-parameter' });
  });
});

const PENDULUM_AT = ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1'];

describe('I8 — a tolerance is judged in the bound\'s own norm, with regime and horizon first', () => {
  it('adequate just above the exact error, inadequate (exit 3) just below it', async () => {
    const exact = pendulumPeriodError(0.2);
    const above = await run([...PENDULUM_AT, 't=10', `--tolerance=${exact * 1.01}`]);
    expect(above.code).toBe(0);
    expect(above.text).toMatch(/tolerance [\d.e-]+: ADEQUATE — error [\d.e-]+ <= tolerance/);
    const below = await run([...PENDULUM_AT, 't=10', `--tolerance=${exact * 0.99}`]);
    expect(below.code).toBe(3);
    expect(below.text).toMatch(/INADEQUATE — error [\d.e-]+ exceeds tolerance/);
  });

  it('control: just past the horizon the verdict is inadequate even though the error is within tolerance', async () => {
    const r = await run([...PENDULUM_AT, 't=101', '--tolerance=0.1']);
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/INADEQUATE — past the horizon: the bound is not claimed there/);
    const inside = await run([...PENDULUM_AT, 't=99', '--tolerance=0.1']);
    expect(inside.code).toBe(0);
  });

  it('without t the horizon is unevaluated, so the verdict is undetermined, never adequate', async () => {
    const env = await json([...PENDULUM_AT, '--tolerance=0.1']);
    expect(env.result.tolerance.verdict).toBe('undetermined');
    expect(env.result.tolerance.scope).toMatch(/judged in the bound's own norm only; ab-pendulum-linear declares a translation, asked with --tolerance=phase:EPS \(rad\)/);
  });

  it("control: a path with no declared translation says none is encoded in the bound-norm scope", async () => {
    const env = await json([...DAMPED_AT, 't=1', '--tolerance=0.1']);
    expect(env.result.tolerance.scope).toMatch(/no translation to another observable \(phase, trajectory, amplitude\) is encoded for this path/);
  });

  it('a sweep with a tolerance marks each row, and the edge falls where the exact error crosses it', async () => {
    const env = await json(['path', 'model-pendulum', 'model-spring', '--at', 'T0=1', 't=10', '--sweep', 'theta0=0.1:0.8:8', '--tolerance=0.01']);
    for (const r of env.result.rows) {
      const expected = r.value > 0.5 + 1e-12 ? 'inadequate' : pendulumPeriodError(r.value) <= 0.01 ? 'adequate' : 'inadequate';
      expect(r.adequacy).toBe(expected);
    }
    expect(env.result.rows.map((r: any) => r.adequacy).filter((a: string) => a === 'adequate')).toHaveLength(3);
  });

  it('a tolerance that is not a positive number is refused', async () => {
    const r = await run([...PENDULUM_AT, '--tolerance=0']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/--tolerance=0 must be a finite number > 0/);
  });
});

const DAMPED_AT = ['path', 'model-damped-spring', 'model-first-order', '--at', 'm=0.01', 'b=1', 'k=1', 'x0=1', 'v0=0'];
const PHASE_AT = ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.3', 'T0=2'];

describe('I8 — a phase tolerance gets a phase-based horizon through the declared translation', () => {
  it('the phase horizon t* matches the time an independent RK4 integration of both motions reaches the tolerance', async () => {
    const env = await json([...PHASE_AT, '--tolerance=phase:0.1']);
    const tol = env.result.tolerance;
    expect(tol.verdict).toBe('undetermined');
    expect(tol.reason).toMatch(/^no t= given; the phase horizon here is t\* = [\d.]+ \(the unit of T0\)$/);
    const measured = measuredHorizon(0.3, 2, 0.1, tol.horizon + 4, 400);
    expect(Math.abs(measured - tol.horizon) / tol.horizon).toBeLessThan(1e-5);
    expect(tol.horizon).not.toBeCloseTo(0.1 * 2 / (2 * Math.PI * tol.boundErrorAtPoint), 2);
    expect(tol.boundErrorAtPoint).toBeCloseTo(pendulumPeriodError(0.3), 12);
    expect(tol.domainSupremum).toBeCloseTo(pendulumPeriodError(0.5), 12);
    expect(tol.domainHorizon).toBeLessThan(tol.horizon);
    expect(tol.horizonConvention).toBe('inclusive: adequate iff t ≤ t*, i.e. Δφ(t) ≤ the tolerance');
    expect(tol.thresholdOrigin).toMatch(/^t\* is derived from the requested tolerance 0\.1 rad through the translation; ab-pendulum-linear's own horizon .* is the record's fixed threshold, judged separately$/);
    expect(tol.translation.notCovered[0]).toMatch(/^the pointwise position error \|θ\(t\) − θ_lin\(t\)\|/);
  });

  it('ADEQUATE at t = t* (the boundary is inclusive); INADEQUATE with exit 3 just beyond it', async () => {
    const tStar = (await json([...PHASE_AT, '--tolerance=phase:0.1'])).result.tolerance.horizon;
    const at = await run([...PHASE_AT, `t=${tStar}`, '--tolerance=phase:0.1']);
    expect(at.code).toBe(0);
    expect(at.text).toMatch(/\n {2}tolerance phase:0\.1 rad: ADEQUATE — t = [\d.]+ <= t\* = [\d.]+: accumulated phase error [\d.]+ rad <= 0\.1\n/);
    const beyond = await run([...PHASE_AT, `t=${tStar * (1 + 1e-9)}`, '--tolerance=phase:0.1']);
    expect(beyond.code).toBe(3);
    expect(beyond.text).toMatch(/\n {2}tolerance phase:0\.1 rad: INADEQUATE — t = [\d.]+ > t\* = [\d.]+: accumulated phase error [\d.]+ rad exceeds 0\.1\n/);
  });

  it("the translation's evidence is derived by running W7p now, and it is not the bound's", async () => {
    const env = await json([...PHASE_AT, 't=5', '--tolerance=phase:0.1']);
    const ev = env.result.tolerance.evidence;
    expect(ev.tags).toEqual(['numerically-supported']);
    expect(ev.witnesses).toEqual([expect.objectContaining({ id: 'W7p', status: 'checked' })]);
    expect(ev.carriages).toEqual([]);
    expect(ev.note).toMatch(/distinct from the bound's; it carries no formal reference/);
  });

  it("control: a tolerance the phase would meet is still INADEQUATE past the bridge's own horizon", async () => {
    const r = await run(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=101', '--tolerance=phase:3']);
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/tolerance phase:3 rad: INADEQUATE — past ab-pendulum-linear's own horizon \(.*\): the bound is not claimed there/);
  });

  it('a bridge with no declared translation refuses: UNDETERMINED, naming that none is encoded', async () => {
    const r = await run([...DAMPED_AT, 't=1', '--tolerance=phase:0.1']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/\n {2}tolerance phase:0\.1: UNDETERMINED — no translation from 'sup \|x − x_reduced\| for t ≥ 5 m\/b' into 'phase' is encoded for ab-damped-massless\n/);
    const env = await json([...DAMPED_AT, 't=1', '--tolerance=phase:0.1']);
    expect(env.result.tolerance).toEqual(expect.objectContaining({ verdict: 'undetermined', translation: null }));
    expect(env.result.tolerance.horizon).toBeUndefined();
  });

  it('a later bridge without a carriage of the observable, and an undeclared observable, refuse the same way', async () => {
    const lc = await run(['path', 'model-pendulum', 'model-lc', '--at', 'theta0=0.3', 'T0=2', 't=1', '--tolerance=position:0.1']);
    expect(lc.code).toBe(0);
    expect(lc.text).toMatch(
      /UNDETERMINED — ab-pendulum-linear's translation into 'position' does not reach the end of this path: 'ab-spring-lc' declares no carriage of 'position' through its map/,
    );
    const amp = await run([...PHASE_AT, 't=1', '--tolerance=amplitude:0.1']);
    expect(amp.text).toMatch(/UNDETERMINED — no translation from 'relative period error, normalized by the value of the reduced model' into 'amplitude' is encoded for ab-pendulum-linear \(it declares: phase, position\)/);
  });

  it('a sweep judges each row through the translation', async () => {
    const env = await json(['path', 'model-pendulum', 'model-spring', '--at', 'T0=1', 't=10', '--sweep', 'theta0=0.1:0.5:5', '--tolerance=phase:0.5']);
    for (const r of env.result.rows) {
      const eps = pendulumPeriodError(r.value);
      expect(r.adequacy).toBe(10 <= (0.5 * (1 + eps)) / (2 * Math.PI * eps) ? 'adequate' : 'inadequate');
    }
    expect(env.result.rows.map((r: any) => r.adequacy)).toEqual(['adequate', 'adequate', 'adequate', 'inadequate', 'inadequate']);
    expect(env.result.translation.evidence.tags).toEqual(['numerically-supported']);
  });

  it('a malformed observable tolerance is refused', async () => {
    const r = await run([...PHASE_AT, '--tolerance=phase:']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/--tolerance=phase: must be a finite number > 0/);
  });
});

const LC_AT = ['path', 'model-pendulum', 'model-lc', '--at', 'theta0=0.3', 'T0=2'];

describe("I8 — the translation's witness runs at the caller's point as well as the fixture", () => {
  it('both are reported: W7p at the fixture θ0 = 0.2, W7p@point at θ0 = 0.3, with a control refuted there', async () => {
    const tol = (await json([...PHASE_AT, 't=1', '--tolerance=phase:0.1'])).result.tolerance;
    expect(tol.evidence.witnesses[0]).toMatchObject({ id: 'W7p', status: 'checked', claim: expect.stringMatching(/θ0 = 0\.2 /) });
    expect(tol.pointWitness).toMatchObject({ id: 'W7p@point', status: 'checked', claim: expect.stringMatching(/θ0 = 0\.3 \(recovered from ε\)/) });
    expect(tol.pointWitness.control).toMatchObject({ status: 'refuted', discriminates: true });
  });

  it('where the control cannot fail at this point, the text says so rather than implying it can', async () => {
    const r = await run(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.00075', 'T0=1', 't=1', '--tolerance=phase:0.1']);
    expect(r.text).toMatch(/control W7p@point-control \[.*\]: checked — NOT refuted: at this point the witness cannot tell the wrong map from the declared one/);
    const tiny = await run(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.0001', 'T0=1', 't=1', '--tolerance=phase:0.1']);
    expect(tiny.text).toMatch(/witness at this point: not run — the drift within 512 T0 at θ0 = [\d.]+ is [\d.e-]+ rad, below the 0\.0001 rad this witness resolves/);
    const small = await run(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.003', 'T0=1', 't=1', '--tolerance=phase:0.1']);
    expect(small.text).toMatch(/control W7p@point-control \[.*\]: refuted/);
  });

  it('a sweep reports the point witness per judged row', async () => {
    const env = await json(['path', 'model-pendulum', 'model-spring', '--at', 'T0=1', 't=10', '--sweep', 'theta0=0.1:0.8:3', '--tolerance=phase:0.5']);
    expect(env.result.rows.map((r: any) => r.pointWitness?.status ?? null)).toEqual(['checked', 'checked', null]);
  });

  it('a point witness refuted at this point withdraws the verdict to undetermined', async () => {
    const api = await import('../../dist/cli-api.js');
    const { judgeAtPoint } = await import('../../dist/cli/commands/path.js');
    const [phase] = api.translationsOf('ab-pendulum-linear');
    const broken = {
      ...phase,
      pointCheck: (eps: number) => {
        const pc = phase.pointCheck(eps);
        return 'unavailable' in pc ? pc : { ...pc, check: pc.control };
      },
    };
    const fake = { ...api, translationsOf: () => [broken] };
    const bridge = api.ATLAS_FAMILIES.flatMap((f: any) => f.bridges).find((b: any) => b.id === 'ab-pendulum-linear');
    const e = { allRegimesHold: true, horizons: [], allHold: true, pointBound: null, pointBoundReason: null };
    const at = { theta0: 0.3, T0: 2, t: 1 };
    const honest = judgeAtPoint(api, { observable: 'phase', value: 0.1 }, [bridge], e, at, false);
    expect(honest.verdict).toBe('adequate');
    const j = judgeAtPoint(fake, { observable: 'phase', value: 0.1 }, [bridge], e, at, false);
    expect(j.verdict).toBe('undetermined');
    expect(j.reason).toMatch(/the translation's witness at this point \(W7p@point-control\) is refuted/);
  });
});

describe('I8 — a position tolerance through a declared UPPER BOUND on |θ − θ_lin|', () => {
  const POS_AT = ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.3', 'T0=2'];

  it('ADEQUATE up to t*; just past t* UNDETERMINED (exit 0), because only the bound exceeds the tolerance', async () => {
    const tStar = (await json([...POS_AT, '--tolerance=position:0.05'])).result.tolerance.horizon;
    const at = await run([...POS_AT, `t=${tStar}`, '--tolerance=position:0.05']);
    expect(at.code).toBe(0);
    expect(at.text).toMatch(/tolerance position:0\.05 rad: ADEQUATE — t = [\d.]+ <= t\* = [\d.]+: bound on the position error [\d.]+ rad <= 0\.05/);
    const beyond = await run([...POS_AT, `t=${tStar * 1.001}`, '--tolerance=position:0.05']);
    expect(beyond.code).toBe(0);
    expect(beyond.text).toMatch(/UNDETERMINED — t = [\d.]+ > t\* = [\d.]+: the bound on the position error is [\d.]+ rad, above 0\.05; the error itself may still be within it/);
  });

  it('the bound and its horizon agree with an independent RK4 of both motions', async () => {
    // t = 2.55 T0/2 is just past the zero crossing at 2.5, where the drift envelope is attained.
    const tol = (await json([...POS_AT, 't=2.55', '--tolerance=position:0.05'])).result.tolerance;
    const theta0 = 0.3;
    const w2 = Math.PI ** 2;
    const { rk4 } = await import('../atlas/_ode.js');
    const { samples } = rk4((_t, y) => [y[1]!, -w2 * Math.sin(y[0]!), y[3]!, -w2 * y[2]!], [theta0, 0, theta0, 0], 0, 2.55, 5100);
    const worst = samples.reduce((m, s) => Math.max(m, Math.abs(s.y[0]! - s.y[2]!)), 0);
    expect(worst).toBeLessThanOrEqual(tol.observableErrorAt);
    expect(worst).toBeGreaterThan(0.95 * tol.observableErrorAt);
    expect(tol.translation.errorKind).toBe('upper-bound');
    expect(tol.pointWitness).toMatchObject({ id: 'W7x@point', status: 'checked', control: { status: 'refuted' } });
    expect(tol.evidence.tags).toEqual(['numerically-supported']);
    expect(tol.evidence.witnesses.map((w: any) => [w.id, w.status])).toEqual([['W7x', 'checked'], ['W7xa', 'checked'], ['W7xs', 'checked']]);
  });

  it('a tolerance below the waveform floor W̄ is UNDETERMINED, not inadequate: the bound certifies no t', async () => {
    const r = await run([...POS_AT, 't=0.1', '--tolerance=position:1e-4']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/UNDETERMINED — the translation's time-independent term is [\d.e-]+ rad at this point, above the tolerance: this bound certifies no t, which is not a finding that the error exceeds the tolerance/);
  });
});

describe('I8 — a translation composes across a bridge only through its declared carriage', () => {
  it('pendulum → spring → LC: the phase horizon is the pendulum → spring one, carried by ab-spring-lc', async () => {
    const direct = (await json([...PHASE_AT, 't=1', '--tolerance=phase:0.1'])).result.tolerance;
    const env = await json([...LC_AT, 't=1', '--tolerance=phase:0.1']);
    const tol = env.result.tolerance;
    // Since the owner decision of 2026-09-27 the composite is a bound in relative period
    // error (ab-spring-lc's norm transport); the phase judgement is a separate claim.
    expect(env.result.kind).toBe('bound');
    expect(env.result.norm).toMatch(/^relative period error/);
    expect(tol.verdict).toBe('adequate');
    expect(tol.horizon).toBe(direct.horizon);
    expect(tol.translation.carriedBy).toEqual(['ab-spring-lc']);
    expect(tol.evidence.carriages[0]).toMatchObject({ bridgeId: 'ab-spring-lc', tags: ['numerically-supported'] });
    expect(tol.evidence.carriages[0].witnesses).toEqual([expect.objectContaining({ id: 'W1φ', status: 'checked' })]);
  });

  it('the composite bound and the carried phase are separate claims, and past t* the phase is INADEQUATE (exit 3)', async () => {
    const tStar = (await json([...LC_AT, '--tolerance=phase:0.1'])).result.tolerance.horizon;
    const r = await run([...LC_AT, `t=${tStar * 1.001}`, '--tolerance=phase:0.1']);
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/\n {2}composite relation: approximation\n/);
    expect(r.text).toMatch(/the composite bound above is in 'relative period error[^']*', carried by a declared norm transport; this judgement is a separate claim in phase/);
    expect(r.text).not.toMatch(/the composite bound is still 'no composite claim'/);
    expect(r.text).toMatch(/carried by ab-spring-lc \(its declared carriage of phase\)/);
  });
});

const TELEGRAPH = ['path', 'model-telegraph', 'model-fick', '--compare=model-wave-1d', '--at', 'D=1', 'q=1', 't=1', '--sweep', 'tau=0.001:1000:13:log'];

describe('I18 — two limits swept side by side; where NEITHER applies there is no number', () => {
  it('telegraph: each row matches the regimes and horizons computed independently, and NEITHER rows carry no error', async () => {
    const env = await json(TELEGRAPH);
    const t = 1;
    checkTelegraphRows(env.result.rows, t);
    expect(env.result.tally).toMatchObject({ covered: 8, neither: 5, unsettled: 0, claimedByAll: 0 });
    expect(env.result.rows.find((r: any) => Math.abs(r.value - 1) < 1e-9).coverage).toBe('neither');
  });

  it('control: at t = 1000 rows inside a regime but past its horizon are not claimed, and every row is NEITHER', async () => {
    const env = await json(TELEGRAPH.map((a) => (a === 't=1' ? 't=1000' : a)));
    checkTelegraphRows(env.result.rows, 1000);
    const pastHorizonInRegime = env.result.rows.flatMap((r: any) => r.paths).filter((p: any) => p.regime === 'holds' && p.horizon === 'violated');
    expect(pastHorizonInRegime.length).toBeGreaterThan(0);
    expect(pastHorizonInRegime.every((p: any) => p.state === 'not-claimed' && p.error === null)).toBe(true);
    expect(env.result.tally).toMatchObject({ covered: 0, neither: 13 });
  });

  function checkTelegraphRows(rows: any[], t: number): void {
    for (const row of rows) {
      const eps = row.value;
      const [fick, wave] = row.paths;
      const slow = (1 - Math.sqrt(1 - 4 * eps)) / (2 * eps) - 1;
      const fickClaimed = eps <= 0.05 && t > 5 * eps && t < 0.1 / slow;
      const waveClaimed = eps >= 25 && t < 2 * eps * Math.log(10 / 9);
      expect(fick.state === 'claimed').toBe(fickClaimed);
      expect(wave.state === 'claimed').toBe(waveClaimed);
      if (fickClaimed) expect(fick.error).toBeCloseTo(slow, 12);
      if (waveClaimed) expect(wave.error).toBeCloseTo(1 - Math.sqrt(1 - 1 / (4 * eps)), 12);
      expect(row.coverage).toBe(fickClaimed || waveClaimed ? 'covered' : 'neither');
      if (row.coverage === 'neither') expect(row.paths.every((p: any) => p.error === null)).toBe(true);
    }
  }

  it('the text marks NEITHER rows with no number and says the two norms are not compared', async () => {
    const r = await run(TELEGRAPH);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/the two errors are different quantities and are not compared with each other/);
    expect(r.text).toMatch(/\n {2}1 +violated\/violated — +violated\/violated — +NEITHER — no encoded limit applies: the parent model-telegraph is the model to use there/);
    expect(r.text).toMatch(/NEITHER: 5 · unsettled: 0 of 13/);
  });

  it('without t the in-regime rows are UNSETTLED, not covered; rows outside both regimes are still NEITHER', async () => {
    const env = await json(['path', 'model-telegraph', 'model-fick', '--compare=model-wave-1d', '--at', 'D=1', 'q=1', '--sweep', 'tau=0.01:100:3:log']);
    expect(env.result.rows.map((r: any) => r.coverage)).toEqual(['unsettled', 'neither', 'unsettled']);
    expect(env.result.rows[0].paths[0]).toMatchObject({ state: 'unsettled', error: null });
  });

  it('Klein–Gordon across low-x, transition and high-x: Schrödinger, NEITHER, massless wave', async () => {
    const env = await json(['path', 'model-klein-gordon', 'model-schrodinger-free', '--compare=model-wave-1d', '--at', 'c=1', 'omega0=1', 't=1', '--sweep', 'k=0.01:100:9:log']);
    for (const row of env.result.rows) {
      const x = row.value;
      const [nr, wave] = row.paths;
      if (nr.state === 'claimed') expect(nr.error).toBeCloseTo((x * x / 2 - (Math.sqrt(1 + x * x) - 1)) / (x * x / 2), 12);
      if (wave.state === 'claimed') expect(wave.error).toBeCloseTo(Math.sqrt(1 + 1 / (x * x)) - 1, 12);
      expect(nr.state === 'claimed').toBe(x <= 0.1 + 1e-12);
      expect(wave.state === 'claimed').toBe(x >= 10 - 1e-9);
    }
    expect(env.result.rows.map((r: any) => (r.coverage === 'covered' ? r.claimedBy[0] : r.coverage))).toEqual([
      'model-schrodinger-free', 'model-schrodinger-free', 'model-schrodinger-free',
      'neither', 'neither', 'neither',
      'model-wave-1d', 'model-wave-1d', 'model-wave-1d',
    ]);
  });

  it('--csv writes each route\'s columns and the coverage', async () => {
    const r = await run([...TELEGRAPH, '--csv']);
    const lines = r.text.trim().split('\n');
    expect(lines[0]).toBe('tau,model-fick_regime,model-fick_horizon,model-fick_state,model-fick_error,model-wave-1d_regime,model-wave-1d_horizon,model-wave-1d_state,model-wave-1d_error,coverage');
    expect(lines).toHaveLength(14);
    expect(lines[7]).toBe('1,violated,violated,not-claimed,,violated,violated,not-claimed,,neither');
  });

  it('unsupported comparisons are refused, not fabricated', async () => {
    const bad = async (args: string[], msg: RegExp) => {
      const r = await run(['path', 'model-telegraph', 'model-fick', ...args]);
      expect(r.code).toBe(1);
      expect(r.text).toMatch(msg);
    };
    await bad(['--compare=model-wave-1d'], /--compare needs --sweep/);
    await bad(['--compare=model-wave-1d', '--sweep', 'tau=0.1:1:3', '--tolerance=0.1'], /--compare does not take --tolerance/);
    await bad(['--compare=model-fick', '--sweep', 'tau=0.1:1:3'], /is the same target as the path/);
    await bad(['--compare=model-pendulum', '--sweep', 'tau=0.1:1:3'], /no chain of bridges connects model-telegraph to model-pendulum; there is nothing to compare/);
  });
});

describe('I16 — a focused map states its denominator', () => {
  it('--around keeps exactly the edges that use the quantity, counted against the whole source', async () => {
    const { CATALOG_GRAPH } = await import('../../dist/cli-api.js');
    const uses = CATALOG_GRAPH.filter((e: any) => [...e.sources.map((q: any) => q.name), e.target.name].includes('temperature'));
    const env = await json(['map', '--around=temperature', '--source=catalog']);
    expect(env.result.focus).toEqual({ around: 'temperature', depth: 1, kept: uses.length, of: CATALOG_GRAPH.length });
    const shown = env.result.linkage.clusters.flatMap((c: any) => c.edges).concat(env.result.linkage.isolated);
    expect(new Set(shown)).toEqual(new Set(uses.map((e: any) => e.id)));
  });

  it('a deeper focus contains the shallower one', async () => {
    const d1 = (await json(['map', '--around=temperature', '--source=catalog'])).result.focus.kept;
    const d2 = (await json(['map', '--around=temperature', '--depth=2', '--source=catalog'])).result.focus.kept;
    expect(d2).toBeGreaterThan(d1);
  });

  it('the text and the visual forms both print the focus with its denominator', async () => {
    const t = await run(['map', '--around=temperature', '--source=catalog']);
    expect(t.text).toMatch(/focused: \d+ of \d+ edges within 1 hop\(s\) of 'temperature' \[catalog \(\d+-bridge\)\]; the rest are omitted from this view, not absent from the graph/);
    const v = await run(['map', '--around=temperature', '--source=catalog', '--format=mermaid']);
    expect(v.text).toMatch(/upt: focused: \d+ of \d+ edges/);
  });

  it('an unknown quantity, a stray --depth and a poster focus are refused', async () => {
    const a = await run(['map', '--around=temprature']);
    expect(a.code).toBe(1);
    expect(a.text).toMatch(/'temprature' is not a quantity of the .* graph; did you mean: temperature/);
    expect((await run(['map', '--depth=2'])).text).toMatch(/--depth needs --around/);
    expect((await run(['map', '--around=temperature', '--depth=0'])).text).toMatch(/--depth=0 must be an integer from 1 to 10/);
    expect((await run(['map', '--source=poster', '--around=temperature'])).text).toMatch(/the poster index has statements, not quantities/);
  });
});

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

describe('I12 — a derived relation carries its premise, meaning and status wherever it goes', () => {
  it('m = hν/c² names mass as an equal-energy scale, not a photon rest mass', async () => {
    const { text } = await run(['discover', '--source=canonical', '--derive']);
    const p = text.slice(text.indexOf('  IC-photon-energy--rest-energy--mass'));
    const r = p.slice(0, p.indexOf('\n  IC-', 5) === -1 ? undefined : p.indexOf('\n  IC-', 5));
    expect(r).toMatch(/status: conditional identity — holds only if rest-energy ≡ photon-energy \(unadjudicated\); untested/);
    expect(r).toMatch(/meaning: mass is the mass of CE-mass-energy .*: the mass for which rest-energy equals photon-energy \(CE-planck-einstein\) — an equal-\[energy\] scale; the photon-energy side is not given a mass/);
    expect(r).toMatch(/canonical match: none — \d+ registry equation\(s\) target mass, \d+ with governing \{.*\}; scope: this registry only, not physics at large/);
    expect(r).toMatch(/assumptions carried: CE-planck-einstein: .*; CE-mass-energy: /);
  });

  it('--json carries the claim per proposal and the derive warning in the envelope, not the discover banner', async () => {
    const env = await json(['discover', '--source=canonical', '--derive']);
    expect(env.epistemics).toMatch(/ALGEBRAIC CONSEQUENCE of an unadjudicated identification/);
    expect(env.epistemics).not.toMatch(/`promising` means/);
    for (const p of env.result) {
      expect(p.claim.premise).toBe(`${p.derivedFrom.identification.a} ≡ ${p.derivedFrom.identification.b}`);
      expect(['known-law', 'conditional-identity']).toContain(p.claim.relation);
      expect(p.claim.tested).toBe(false);
      expect(p.claim.canonicalMatch.scope).toBe('the canonical registry only');
      expect(p.claim.symbol.name).toBe(p.derivedFrom.solvedFor);
      expect(p.derivedFrom.sourceEquationIds).toContain(p.claim.symbol.fromEquation);
    }
  });

  it('control: a proposal whose normal form is a registry entry is labelled a known law', async () => {
    const api = await import('../../dist/cli-api.js');
    const [p] = api.deriveProposedBridges(
      api.rankDiscoveries(api.CANONICAL_GRAPH).filter((c: any) => c.verdict === 'promising'),
    );
    const planted = { id: 'CE-planted', name: 'planted', assumptions: [], dimensional: { target: p.target, governing: p.governing }, scalarAst: p.scalarAst };
    const known = api.describeDerivedClaim(p, [...api.CANONICAL_EQUATIONS, planted]);
    expect(known.relation).toBe('known-law');
    expect(known.canonicalMatch.id).toBe('CE-planted');
    expect(api.describeDerivedClaim(p).relation).toBe('conditional-identity');
  });
});

describe('I14 — each confrontation names its statistical object, criterion and data origin', () => {
  it('a σ-test, a limit and a consistency ratio each state what kind of comparison they are', async () => {
    const { text } = await run(['confront']);
    const rec = (id: string) => {
      const s = text.slice(text.indexOf(`  ${id} [`));
      return s.slice(0, s.indexOf('\n  be-', 3) === -1 ? undefined : s.indexOf('\n  be-', 3));
    };
    expect(rec('be-37')).toMatch(/\n {4}statistic: point estimate ± 1σ · criterion: residual ≤ 1σ · observed: as reported by the source \(no derivation recorded\)/);
    expect(rec('be-51')).toMatch(/\n {4}statistic: point estimate ± 1σ · criterion: residual ≤ 1σ · observed: derived from PPN γ/);
    expect(rec('be-48')).toMatch(/\n {4}statistic: one-sided upper limit · criterion: predicted ≤ limit/);
    expect(rec('be-11')).toMatch(/\n {4}statistic: reference value with no σ · criterion: \|actual difference\| ≤ the record's stated agreement bound/);
    expect(rec('be-21')).toMatch(/\n {4}statistic: lower limit claimed by the bridge, against a reference value with no σ · criterion: observed ≥ predicted lower limit — one-sided, not a σ-residual; not a precision test/);
    expect(rec('be-65')).toMatch(/\n {4}statistic: reference value with no σ · criterion: \|actual difference\| ≤ the record's stated agreement bound — a tolerance, not a σ-residual; not a precision test/);
  });

  it('the notes (preprocessing, independence, circularity) are printed, not left in the JSON only', async () => {
    const { text } = await run(['confront', '--bridge=be-58']);
    expect(text).toMatch(/\n {4}notes: k_B measured via S_V=4k_BTR .*NON-CIRCULAR/);
    const none = await run(['confront', '--bridge=be-23']);
    expect(none.text).not.toMatch(/\n {4}notes:/);
  });

  it('the summary counts σ-tests apart from limits and consistency ratios, recounted from --json', async () => {
    const env = await json(['confront']);
    const count = (k: string) => env.result.filter((r: any) => r.kind === k).length;
    expect(env.statisticDistribution).toEqual({
      sigmaTests: count('value'),
      limits: count('upper-bound'),
      consistencyRatios: count('consistency'),
      tables: count('table'),
    });
    for (const r of env.result) expect(typeof r.statistic.object).toBe('string');
    const { text } = await run(['confront']);
    expect(text).toContain(
      `by statistic: ${count('value')} σ-residual tests · ${count('upper-bound')} limits · ${count('consistency')} consistency ratios (no σ; never counted as precision tests)`,
    );
  });

  const NOT_RECORDED = 'not recorded — the record states nothing on this; that is not "none"';

  it('every record prints preprocessing and independence; a not-recorded field is printed as not recorded, never as a statement', async () => {
    const env = await json(['confront']);
    const { text } = await run(['confront']);
    const lineOf = (id: number, field: string) => {
      const start = text.indexOf(`\n  be-${id} [`);
      expect(start, `be-${id} block`).toBeGreaterThan(-1);
      const next = text.indexOf('\n  be-', start + 1);
      const blockText = text.slice(start, next === -1 ? undefined : next);
      const lines = blockText.split('\n').filter((l) => l.startsWith(`    ${field}: `));
      expect(lines, `be-${id} ${field}`).toHaveLength(1);
      return lines[0].slice(`    ${field}: `.length);
    };
    const src = (refs: any[]) =>
      `[source: ${refs.map((q) => (q.quote !== undefined ? `${q.file} "${q.quote}"` : `${q.file} #${q.symbol}`)).join('; ')}]`;
    let notRecorded = 0;
    for (const r of env.result) {
      const pre = lineOf(r.bridgeId, 'preprocessing');
      if (r.preprocessing.state === 'not-recorded') {
        notRecorded++;
        expect(pre, `be-${r.bridgeId}`).toBe(NOT_RECORDED);
      } else {
        expect(pre, `be-${r.bridgeId}`).toBe(`${r.preprocessing.statement} ${src(r.preprocessing.source)}`);
      }
      const ind = lineOf(r.bridgeId, 'independence');
      const i = r.independence;
      if (i.state === 'not-recorded') {
        notRecorded++;
        expect(ind, `be-${r.bridgeId}`).toBe(NOT_RECORDED);
      } else if (i.state === 'shares-input') {
        expect(ind, `be-${r.bridgeId}`).toBe(`shares ${i.shared} — ${i.statement} ${src(i.source)}`);
      } else {
        expect(i.state).toBe('no-fitted-parameter');
        expect(ind, `be-${r.bridgeId}`).toBe(`no parameter fitted to this measurement — ${i.statement} ${src(i.source)}`);
      }
    }
    // Both states must occur, or the not-recorded branch above proves nothing.
    expect(notRecorded).toBeGreaterThan(0);
    expect(env.result.some((r: any) => r.preprocessing.state === 'recorded')).toBe(true);
  });

  it('recorded and not-recorded are counted apart, and the counts are recounted from --json', async () => {
    const env = await json(['confront']);
    const pre = (s: string) => env.result.filter((r: any) => r.preprocessing.state === s).length;
    const ind = (s: string) => env.result.filter((r: any) => r.independence.state === s).length;
    expect(env.dataHandlingDistribution).toEqual({
      preprocessing: { recorded: pre('recorded'), notRecorded: pre('not-recorded') },
      independence: {
        noFittedParameter: ind('no-fitted-parameter'),
        sharesInput: ind('shares-input'),
        notRecorded: ind('not-recorded'),
      },
    });
    expect(pre('recorded') + pre('not-recorded')).toBe(env.result.length);
    expect(ind('no-fitted-parameter') + ind('shares-input') + ind('not-recorded')).toBe(env.result.length);
    const { text } = await run(['confront']);
    expect(text).toContain(
      `preprocessing: recorded for ${pre('recorded')} · not recorded for ${pre('not-recorded')}; ` +
        `independence: ${ind('no-fitted-parameter')} no fitted parameter · ${ind('shares-input')} share an input · ` +
        `${ind('not-recorded')} not recorded (independence is not goodness of fit)`,
    );
  });

  it('be-61 and be-51 name what their observed value shares with the prediction', async () => {
    const env = await json(['confront']);
    const rec = (id: number) => env.result.find((r: any) => r.bridgeId === id);
    expect(rec(61).approaches).toBe(rec(61).predicted);
    expect(rec(61).independence.state).toBe('shares-input');
    expect(rec(51).measured.quantity).toBe('PPN γ');
    expect(rec(51).independence.state).toBe('shares-input');
  });
});

describe('I15 — evidence by claim, and a witness name is not its result', () => {
  it('pendulum: the correspondence is formally referenced; bound and horizon keep their own evidence', async () => {
    const { text } = await run(['atlas', 'ab-pendulum-linear']);
    const s = text.slice(text.indexOf('evidence by claim'));
    expect(s).toMatch(/^evidence by claim \(derived from the record's structure\):\n/);
    expect(s).toMatch(/\n {2}correspondence: formal reference lean4-physlib, fidelity sanity-lemmas — covers its statement only/);
    expect(s).toMatch(/\n {2}bound: basis closed-form \(deltaAt is the exact error\); the formal reference is not attributed to it/);
    expect(s).toMatch(/\n {2}horizon: machine form recorded; the formal reference is not attributed to it/);
    expect(s).toMatch(/\n {2}regime: 1 machine inequality — check a point with `upt regime oscillators --at …`/);
    expect(s).toMatch(/\n {2}preserves: no evidence is attributed to a preserved property/);
    expect(s).toMatch(
      /\n {2}bound: basis closed-form \(deltaAt is the exact error\); the formal reference is not attributed to it\n {4}- W7 \[numeric\] tests it at theta0 = 0\.2 \(its error there is the bound's norm; tolerance ≤ delta\): registered in-process, not run — `upt atlas ab-pendulum-linear --run` runs it\n/,
    );
    expect(s).toMatch(/\nwitness execution, witnesses not attributed to a claim:\n {2}- W7b \[numeric\]: result not observed by this command — its repository test file: bunx vitest run tests\/atlas\/oscillators-limits\.test\.ts\n/);
    expect(s).not.toMatch(/W7.*checked/);
  });

  it('--run on the pendulum runs W7 in-process and reports it under the bound (audit I15 limit closed)', async () => {
    const r = await run(['atlas', 'ab-pendulum-linear', '--run']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/\n {4}- W7 \[numeric\] tests it at theta0 = 0\.2 .*: checked \(run now\) — Fine error /);
    expect(r.text).toMatch(/witnesses run: 1 checked · 0 refuted · 0 unresolved/);
  });

  it('a bound that is not sharp is tested at one point, and a preserved property can carry a witness', async () => {
    const damped = await run(['atlas', 'ab-damped-massless']);
    expect(damped.text).toMatch(
      /\n {4}- W8b \[numeric\] tests it at b = 1, k = 1, m = 0\.01, v0 = 5, x0 = 1 \(its error there is in the bound's norm; tolerance = deltaAt there, the bound is not sharp\): registered in-process/,
    );
    const chain = await run(['atlas', 'ab-chain-wave', '--run']);
    expect(chain.code).toBe(0);
    expect(chain.text).toMatch(/\n {2}preserves: 1 of 3 stated properties has an attributed witness\n {4}- W9 \[numeric\] tests 'long-wavelength dispersion ω ≈ c q' at qa = 0\.19634954084936207: checked \(run now\)/);
    const env = await json(['atlas', 'ab-chain-wave']);
    expect(env.result.claims.preserves.evidence).toEqual([{ id: 'W9', item: 'long-wavelength dispersion ω ≈ c q', at: { qa: (2 * Math.PI) / 32 } }]);
    expect(env.result.witnessExecution.map((w: any) => [w.id, w.claim])).toEqual([['W9', 'preserves'], ['W9b', null]]);
  });

  it('--run executes the registered witnesses and reports each status; exit 0 when none is refuted', async () => {
    const r = await run(['atlas', 'ab-walk-diffusion', '--run']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/\n {2}- WD1 \[numeric\]: checked \(run now\) — Fine error .* within tolerance/);
    expect(r.text).toMatch(/witnesses run: 1 checked · 0 refuted · 0 unresolved/);
  });

  it('--run on a bridge with no registered witness says so rather than reporting a pass', async () => {
    // Every shipped bridge now has one, so the state is reached through a registry with the pendulum's removed.
    const all = (await import('../../dist/cli-api.js')).WITNESS_REGISTRY;
    const without = all.filter((e: any) => e.recordId !== 'ab-pendulum-linear');
    expect(without.length).toBeLessThan(all.length);
    const r = await runPatched('atlas', ['ab-pendulum-linear', '--run'], { WITNESS_REGISTRY: without });
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/witnesses run: none — no witness of ab-pendulum-linear is registered to run in-process/);
  });

  it('every atlas bridge has at least one witness registered to run in-process', async () => {
    const env = await json(['atlas']);
    const reg = (await import('../../dist/cli-api.js')).WITNESS_REGISTRY;
    const ids: string[] = env.result.bridges.map((b: any) => b.id);
    expect(ids.length).toBe(20);
    expect(ids.filter((id) => !reg.some((e: any) => e.recordId === id))).toEqual([]);
  });

  it('control: a refuted result is counted as refuted, never merged with unresolved, and fails the check', async () => {
    const { summarizeWitnessRuns } = await import('../../dist/cli/commands/atlas.js');
    const s = summarizeWitnessRuns([
      { witnessId: 'X1', kind: 'numeric', status: 'refuted', detail: 'off' },
      { witnessId: 'X2', kind: 'symbolic', status: 'unresolved', reason: 'peer-absent', detail: 'no peer' },
      { witnessId: 'X3', kind: 'numeric', status: 'checked', detail: 'ok' },
    ]);
    expect(s).toEqual({ checked: 1, refuted: 1, unresolved: 1, exitCode: 3 });
    expect(summarizeWitnessRuns([{ witnessId: 'X2', kind: 'symbolic', status: 'unresolved', reason: 'peer-absent', detail: '' }]).exitCode).toBe(0);
  });

  it('an attributed witness is listed under the bound; the unattributed one is listed apart', async () => {
    const { text } = await run(['atlas', 'ab-klein-gordon-wave']);
    const s = text.slice(text.indexOf('evidence by claim'));
    expect(s).toMatch(
      /\n {2}bound: basis closed-form \(deltaAt is the exact error\)\n {4}- WS4 \[numeric\] tests it at c = 1, k = 20, omega0 = 1 \(its error there is the bound's norm; tolerance ≤ delta\): registered in-process, not run/,
    );
    const apart = s.slice(s.indexOf('witness execution, witnesses not attributed to a claim:\n'));
    expect(apart).toMatch(/^witness execution, witnesses not attributed to a claim:\n {2}- WS4b \[numeric\]: result not observed/);
    expect(apart).not.toMatch(/WS4 \[/);
    const env = await json(['atlas', 'ab-klein-gordon-wave']);
    expect(env.result.claims.bound.witnesses).toEqual([{ id: 'WS4', claim: 'bound', at: { omega0: 1, c: 1, k: 20 } }]);
    expect(env.result.witnessExecution.map((w: any) => [w.id, w.claim])).toEqual([['WS4', 'bound'], ['WS4b', null]]);
  });

  it('--run reports an attributed witness\'s result under the claim it tests', async () => {
    const r = await run(['atlas', 'ab-telegraph-diffusion', '--run']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/\n {4}- WD6 \[numeric\] tests it at D = 1, q = 1, tau = 0\.025 .*: checked \(run now\) — Fine error/);
  });

  it('--json carries the claims and the per-witness execution status', async () => {
    const env = await json(['atlas', 'ab-pendulum-linear']);
    expect(env.result.claims.correspondence.formalReference.fidelity).toBe('sanity-lemmas');
    expect(env.result.claims.bound.basis).toBe('closed-form');
    // W7 is registered in-process (audit I15 limit), so it is runnable; W7b and W7c are not.
    expect(env.result.witnessExecution.map((w: any) => w.status)).toEqual(['runnable', 'not-observed', 'not-observed']);
    expect(env.result.claims.bound.witnesses).toEqual([{ id: 'W7', claim: 'bound', at: { theta0: 0.2 } }]);
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
    expect(b).toMatch(/^\] ab-spring-lc: no machine condition evaluated \(VACUOUS/);
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
