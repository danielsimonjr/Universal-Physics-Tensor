/**
 * `upt map --route=FROM,TO` and `upt map --family=NAME` — the atlas views,
 * in-process against the built CLI (`dist/cli/main.js`).
 *
 * Each view is checked against an independent read of the atlas data
 * (`ATLAS_FAMILIES`, `CANONICAL_EQUATIONS`) and, for the route, against
 * `upt path` itself: the map must not report a different route, a different
 * refusal, or a denominator it did not count.
 *
 * @module tests/cli/map-atlas-views
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { ATLAS_FAMILIES, CANONICAL_EQUATIONS } from '../../dist/cli-api.js';

async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => out.push((s ?? '') + '\n'),
    err: (s?: string) => err.push((s ?? '') + '\n'),
    write: (s: string) => out.push(s),
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

async function json(args: string[]): Promise<any> {
  const r = await run([...args, '--json']);
  expect(r.code).toBe(0);
  return JSON.parse(r.stdout);
}

const BRIDGES = ATLAS_FAMILIES.flatMap((f) => f.bridges);
const MODELS = ATLAS_FAMILIES.flatMap((f) => f.models);

describe('upt map --route', () => {
  it('pendulum → LC: both bridges with their assumptions and regime, and the composite through the declared norm transport', async () => {
    const { code, stdout } = await run(['map', '--route=model-pendulum,model-lc']);
    expect(code).toBe(0);
    expect(stdout).toContain(`shown: 2 of ${BRIDGES.length} atlas bridges, 3 of ${MODELS.length} models`);
    expect(stdout).toContain('[source: atlas (ATLAS_FAMILIES, src/atlas/families.ts)]');
    expect(stdout).toMatch(/step 1 {2}model-pendulum --\[approximation\]--> model-spring {2}\(ab-pendulum-linear\)/);
    expect(stdout).toMatch(/step 2 {2}model-spring --\[exact-equivalence\]--> model-lc {2}\(ab-spring-lc\)/);
    expect(stdout).toContain('assumptions: θ0 ≤ 0.5 rad');
    expect(stdout).toContain('regime: theta0 <= 0.5 (θ0 ≤ 0.5 rad)');
    expect(stdout).toContain('after step 1 (ab-pendulum-linear): approximation');
    // Owner decision 2026-09-27 (docs/planning/ADR-transported-norm-composition.md).
    expect(stdout).toContain('after step 2 (ab-spring-lc): approximation');
    expect(stdout).toContain('route claim: approximation, K = 1 · delta = 0.0158525');
    expect(stdout).toContain("across 'ab-spring-lc' by its declared transport 'nt-spring-lc-relative-period'");
    expect(stdout).toMatch(/composite evidence \(derived\): .*never stronger than the weakest part/);
    expect(stdout).not.toContain('NO COMPOSITE CLAIM');
    expect(stdout).toContain('model-lc [oscillators]: L q″ + q/C = 0');
    expect(stdout).toMatch(/equation: CE-lc-resonance — .*graph edge \{inductance, capacitance\} → angular-frequency/);
    expect(stdout).toContain('equation links (source: AtlasModel.canonicalRefs): 3 of 3 models record one; 0 record none');
  });

  it('rlc → first-order: the step where the table stays silent (exact then approximation)', async () => {
    const { code, stdout } = await run(['map', '--route=model-rlc,model-first-order']);
    expect(code).toBe(0);
    expect(stdout).toContain('after step 2 (ab-damped-massless): NO COMPOSITE CLAIM — exact-equivalence then approximation has no table cell');
    expect(stdout).toContain("route claim: no composite claim — reason 'no-composite-claim'");
    expect(stdout).not.toContain('composite evidence');
  });

  it('reports exactly the route and the refusal `upt path` reports, for every ordered pair of models', async () => {
    const pairs: [string, string][] = [
      ['model-pendulum', 'model-lc'],
      ['model-rlc', 'model-first-order'],
      ['model-telegraph', 'model-heat'],
      ['model-klein-gordon', 'model-lc'],
      ['model-klein-gordon', 'model-schrodinger-free'],
      ['model-string', 'model-dalembert'],
      ['model-lc', 'model-pendulum'],
    ];
    for (const [from, to] of pairs) {
      const m = (await json(['map', `--route=${from},${to}`])).result;
      const p = (await json(['path', from, to])).result;
      if (p.path === null) {
        expect(m.steps).toBeNull();
        continue;
      }
      expect(m.steps.map((s: any) => s.id)).toEqual(p.path.map((s: any) => s.id));
      expect(m.composition.claim.kind).toBe(p.kind);
      if (p.kind === 'no-claim') {
        expect(m.composition.claim.reason).toBe(p.reason);
        expect(m.composition.missing).toEqual(p.missing ?? []);
      } else {
        expect(m.composition.claim.bound).toEqual(p.bound);
      }
      expect(m.denominator.bridges).toEqual({ shown: p.path.length, of: BRIDGES.length });
    }
  });

  it('marks the step where the table declines, and only that step', async () => {
    const r = (await json(['map', '--route=model-rlc,model-first-order'])).result;
    expect(r.composition.breaksAt).toBe(1);
    expect(r.composition.running.map((x: any) => x.relation)).toEqual(['exact-equivalence', 'no-composite-claim']);
    // Control: the widened cell does not break, and its route carries a bound.
    const lcRoute = (await json(['map', '--route=model-pendulum,model-lc'])).result;
    expect(lcRoute.composition.breaksAt).toBeNull();
    expect(lcRoute.composition.running.map((x: any) => x.relation)).toEqual(['approximation', 'approximation']);
    expect(lcRoute.composition.claim.kind).toBe('bound');
    expect(lcRoute.composition.transports.map((x: any) => x.id)).toEqual(['nt-spring-lc-relative-period']);
    // A missing Lipschitz constant composes the relations but still carries no bound: no step breaks.
    const kg = (await json(['map', '--route=model-klein-gordon,model-lc'])).result;
    expect(kg.composition.breaksAt).toBeNull();
    expect(kg.composition.claim).toMatchObject({ kind: 'no-claim', reason: 'missing-lipschitz' });
  });

  it('lists the models in route order when an exact equivalence is walked conclusion → premise', async () => {
    const lc = BRIDGES.find((b) => b.id === 'ab-spring-lc')!;
    expect([lc.premises[0], lc.conclusion]).toEqual(['model-spring', 'model-lc']);
    const r = (await json(['map', '--route=model-lc,model-spring'])).result;
    expect(r.models.map((m: any) => m.id)).toEqual(['model-lc', 'model-spring']);
  });

  it('no route is an answer (exit 0), with the endpoints still counted and shown', async () => {
    const { code, stdout } = await run(['map', '--route=model-lc,model-pendulum']);
    expect(code).toBe(0);
    expect(stdout).toContain(`shown: 0 of ${BRIDGES.length} atlas bridges — no chain of bridges connects these models`);
    const r = (await json(['map', '--route=model-lc,model-pendulum'])).result;
    expect(r.steps).toBeNull();
    expect(r.denominator.models.shown).toBe(r.models.length);
    expect(r.models.map((m: any) => m.id)).toEqual(['model-lc', 'model-pendulum']);
  });

  it('dot and mermaid carry the denominator and source, highlight only the declining step, and draw each recorded link', async () => {
    const dot = await run(['map', '--route=model-pendulum,model-lc', '--format=dot']);
    expect(dot.code).toBe(0);
    expect(dot.stdout).toContain(`label="route model-pendulum → model-lc: 2 of ${BRIDGES.length} atlas bridges`);
    expect(dot.stdout).toContain('equation links: AtlasModel.canonicalRefs');
    // pendulum → lc no longer declines (its composite is a bound), so no step is highlighted.
    expect(dot.stdout.split('\n').filter((l) => l.includes('color="#c0392b"'))).toHaveLength(0);
    const silent = await run(['map', '--route=model-rlc,model-first-order', '--format=dot']);
    const red = silent.stdout.split('\n').filter((l) => l.includes('color="#c0392b"'));
    expect(red).toHaveLength(1);
    expect(red[0]).toContain('m_model_damped_spring -> m_model_first_order');
    const refs = ['model-pendulum', 'model-spring', 'model-lc'].flatMap((id) => MODELS.find((m) => m.id === id)!.canonicalRefs);
    expect(dot.stdout.split('\n').filter((l) => l.includes('label="canonicalRef"'))).toHaveLength(refs.length);
    expect(dot.stderr).toContain(`upt: route model-pendulum → model-lc: 2 of ${BRIDGES.length} atlas bridges`);

    const mm = await run(['map', '--route=model-pendulum,model-lc', '--format=mermaid']);
    expect(mm.stdout).not.toMatch(/linkStyle \d+ stroke:#c0392b/);
    expect(mm.stdout).toContain('%% route model-pendulum → model-lc');
    const mmSilent = await run(['map', '--route=model-rlc,model-first-order', '--format=mermaid']);
    const links = mmSilent.stdout.split('\n').filter((l) => /-->|<-->|-\.->/.test(l));
    const styled = /linkStyle (\d+) stroke:#c0392b/.exec(mmSilent.stdout);
    expect(styled).not.toBeNull();
    expect(links[Number(styled![1])]).toContain('(ab-damped-massless)');
  });

  it('refuses what does not apply to a route, and bad endpoints', async () => {
    const malformed = await run(['map', '--route=model-pendulum']);
    expect(malformed.code).toBe(1);
    expect(malformed.stderr).toMatch(/must be FROM,TO/);
    const unknown = await run(['map', '--route=model-nope,model-lc']);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toMatch(/'model-nope' is not a model of any atlas family/);
    const filtered = await run(['map', '--route=model-pendulum,model-lc', '--evidence=formally-proved']);
    expect(filtered.code).toBe(1);
    expect(filtered.stderr).toMatch(/a route is composed whole/);
    const graphFlag = await run(['map', '--route=model-pendulum,model-lc', '--source=catalog']);
    expect(graphFlag.code).toBe(1);
    expect(graphFlag.stderr).toMatch(/maps the atlas, not the equation graph; --source does not apply/);
    expect((await run(['map', '--route=model-pendulum,model-lc', '--family=waves'])).stderr).toMatch(/pick one atlas view/);
  });
});

describe('upt map --family', () => {
  it('shows every model and filed bridge of the family, the bridges from elsewhere that touch it, and its rejections', async () => {
    const fam = ATLAS_FAMILIES.find((f) => f.family === 'oscillators')!;
    const own = new Set(fam.models.map((m) => m.id));
    const touching = ATLAS_FAMILIES.filter((f) => f !== fam)
      .flatMap((f) => f.bridges)
      .filter((b) => [...b.premises, b.conclusion].some((id) => own.has(id)))
      .map((b) => b.id);
    expect(touching.length).toBeGreaterThan(0);
    const r = (await json(['map', '--family=oscillators'])).result;
    expect(r.models.map((m: any) => m.id)).toEqual(fam.models.map((m) => m.id));
    expect(r.bridges.filter((b: any) => b.role === 'filed').map((b: any) => b.id)).toEqual(fam.bridges.map((b) => b.id));
    expect(r.bridges.filter((b: any) => b.role === 'touching').map((b: any) => b.id)).toEqual(touching);
    expect(r.rejections.map((x: any) => x.id)).toEqual(fam.rejections.map((x) => x.id));
    expect(r.denominator).toEqual({
      models: { shown: fam.models.length, of: MODELS.length },
      bridgesFiled: { shown: fam.bridges.length, of: BRIDGES.length },
      bridgesTouching: { shown: touching.length, of: BRIDGES.length },
      rejections: fam.rejections.length,
    });
    const { stdout } = await run(['map', '--family=oscillators']);
    expect(stdout).toContain(
      `shown: ${fam.models.length} of ${MODELS.length} atlas models; ${fam.bridges.length} bridge(s) filed under oscillators ` +
        `and ${touching.length} filed elsewhere that touch its models, of ${BRIDGES.length} atlas bridges`,
    );
    expect(stdout).toContain('(ax-cubic-spring-lc)');
  });

  it('joins a model to an equation ONLY through its canonicalRefs, never by name', async () => {
    // Positive control: the registry HOLDS an RC equation over the RLC model's
    // own resistance and capacitance, so a join by name or shared quantity
    // would attach it to model-rlc.
    expect(CANONICAL_EQUATIONS.some((e) => e.id === 'CE-rc-time-constant')).toBe(true);
    expect(MODELS.find((m) => m.id === 'model-rlc')!.canonicalRefs).toEqual([]);
    for (const f of ATLAS_FAMILIES) {
      const r = (await json(['map', `--family=${f.family}`])).result;
      for (const m of f.models) {
        const shown = r.models.find((x: any) => x.id === m.id);
        expect(shown.equationLinks.map((l: any) => l.id)).toEqual([...m.canonicalRefs]);
      }
      expect(r.equationLinks.withLink + r.equationLinks.withoutLink).toBe(f.models.length);
    }
    const { stdout } = await run(['map', '--family=oscillators']);
    expect(stdout).toMatch(/model-rlc \[oscillators\]: .*\n\s+equations: no canonical equation recorded in its canonicalRefs/);
    expect(stdout).not.toContain('CE-rc-time-constant');
  });

  it('--evidence=formally-proved keeps only bridges with a reviewed formalRef, and counts every other bridge', async () => {
    for (const f of ATLAS_FAMILIES) {
      const r = (await json(['map', `--family=${f.family}`, '--evidence=formally-proved'])).result;
      const all = (await json(['map', `--family=${f.family}`])).result.bridges;
      const expected = all
        .filter((b: any) => BRIDGES.find((x) => x.id === b.id)!.formalRef?.fidelity !== undefined)
        .filter((b: any) => BRIDGES.find((x) => x.id === b.id)!.formalRef!.fidelity !== 'unreviewed')
        .map((b: any) => b.id);
      expect(r.bridges.map((b: any) => b.id)).toEqual(expected);
      expect(r.filter.total).toBe(all.length);
      expect(r.filter.kept + r.filter.droppedNotMatching + r.filter.droppedUndecided).toBe(r.filter.total);
    }
    // No bridge qualifies here, and the accounting is still printed.
    const { code, stdout } = await run(['map', '--family=diffusion', '--evidence=formally-proved']);
    expect(code).toBe(0);
    expect(stdout).toMatch(
      /filter: evidence=formally-proved — 0 of \d+ bridges kept; \d+ dropped \(did not match\); 0 dropped \(undecided: depends on witness results this command does not observe\)/,
    );
  });

  it('a tag that depends on witness results is UNDECIDED, counted apart from a mismatch', async () => {
    const r = (await json(['map', '--family=waves', '--evidence=numerically-supported'])).result;
    const waves = ATLAS_FAMILIES.find((f) => f.family === 'waves')!;
    // Every waves bridge carries a numeric witness, so each would derive the
    // tag if that witness passed and would not if it failed.
    expect(waves.bridges.every((b) => b.witnesses.some((w) => w.kind === 'numeric'))).toBe(true);
    expect(r.filter.kept).toBe(0);
    expect(r.filter.droppedUndecided).toBeGreaterThanOrEqual(waves.bridges.length);
    expect(r.filter.droppedNotMatching).toBe(r.filter.total - r.filter.droppedUndecided);
    // A relation filter reads a field every bridge records, so nothing is undecided.
    const rel = (await json(['map', '--family=waves', '--relation=approximation'])).result;
    expect(rel.filter.droppedUndecided).toBe(0);
    expect(rel.bridges.every((b: any) => b.relation === 'approximation')).toBe(true);
    expect(rel.filter.kept).toBeGreaterThan(0);
  });

  it('draws bridge endpoints outside the family as dashed, and states the denominator in the diagram', async () => {
    const dot = await run(['map', '--family=oscillators', '--format=dot']);
    expect(dot.code).toBe(0);
    expect(dot.stdout).toContain(`label="family oscillators: 9 of ${MODELS.length} atlas models`);
    expect(dot.stdout).toContain('m_model_klein_gordon [shape=box,style=dashed');
    const mm = await run(['map', '--family=oscillators', '--format=mermaid', '--evidence=formally-proved']);
    expect(mm.stdout).toContain('filter: evidence=formally-proved — 1 of');
    expect(mm.stderr).toContain('upt: family oscillators:');
  });

  it('refuses an unknown family by naming the registered ones', async () => {
    const r = await run(['map', '--family=osc']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain(`expected: ${ATLAS_FAMILIES.map((f) => f.family).join(' | ')}`);
  });
});
