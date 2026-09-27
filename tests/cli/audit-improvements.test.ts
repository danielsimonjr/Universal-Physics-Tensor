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
    expect(rec('be-11')).toMatch(/\n {4}statistic: reference value with no σ · criterion: none — the gap is a fractional difference, not a σ-residual; not a precision test/);
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
    expect(s).toMatch(/\nwitness execution \(the record does not attribute a witness to a claim\):\n {2}- W7 \[numeric\]: result not observed by this command — its repository test file: bunx vitest run tests\/atlas\/oscillators-limits\.test\.ts\n/);
    expect(s).not.toMatch(/W7.*checked/);
  });

  it('--run executes the registered witnesses and reports each status; exit 0 when none is refuted', async () => {
    const r = await run(['atlas', 'ab-walk-diffusion', '--run']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/\n {2}- WD1 \[numeric\]: checked \(run now\) — Fine error .* within tolerance/);
    expect(r.text).toMatch(/witnesses run: 1 checked · 0 refuted · 0 unresolved/);
  });

  it('--run on a bridge with no registered witness says so rather than reporting a pass', async () => {
    const r = await run(['atlas', 'ab-pendulum-linear', '--run']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/witnesses run: none — no witness of ab-pendulum-linear is registered to run in-process/);
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

  it('--json carries the claims and the per-witness execution status', async () => {
    const env = await json(['atlas', 'ab-pendulum-linear']);
    expect(env.result.claims.correspondence.formalReference.fidelity).toBe('sanity-lemmas');
    expect(env.result.claims.bound.basis).toBe('closed-form');
    expect(env.result.witnessExecution.map((w: any) => w.status)).toEqual(['not-observed', 'not-observed', 'not-observed']);
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
