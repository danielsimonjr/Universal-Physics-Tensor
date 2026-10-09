/**
 * `upt map --route=FROM,TO --all-routes`, `upt map --observable=NAME`, and the
 * witness-results sources `--stored` / `--run` of every atlas view — in-process
 * against the built CLI (`dist/cli/main.js`).
 *
 * Each claim is checked by a second method rather than by re-reading the view:
 * routes against a recursive enumeration written here and against `upt path`;
 * stored evidence against every assignment of the unobserved witnesses; run-now
 * results against `upt atlas <id> --run`; observable matches against a
 * tokenisation of the recorded strings.
 *
 * @module tests/cli/map-atlas-results
 */
import '../helpers/dist.js';
import { json, run } from '../helpers/cli-run.js';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import * as api from '../../dist/cli-api.js';
import { enumerateRoutes } from '../../dist/atlas/path-bound.js';
import { buildFamilyView, type WitnessResults } from '../../dist/cli/commands/_atlas-map.js';
import type { AtlasBridge } from '../../dist/cli-api.js';

const { ATLAS_FAMILIES, deriveEvidence } = api;

const BRIDGES = ATLAS_FAMILIES.flatMap((f) => f.bridges);
const MODELS = ATLAS_FAMILIES.flatMap((f) => f.models);

/** Every simple route, by plain recursion: a second method, not the enumerator's layered search. */
function naiveRoutes(bridges: readonly AtlasBridge[], from: string, to: string): string[][] {
  const steps = bridges
    .filter((b) => b.premises.length === 1)
    .flatMap((b) => [
      { from: b.premises[0]!, to: b.conclusion, id: b.id },
      ...(b.relation === 'exact-equivalence' ? [{ from: b.conclusion, to: b.premises[0]!, id: b.id }] : []),
    ]);
  const found: string[][] = [];
  const walk = (at: string, seen: Set<string>, ids: string[]): void => {
    if (at === to) return void found.push(ids);
    for (const s of steps.filter((x) => x.from === at && !seen.has(x.to))) walk(s.to, new Set([...seen, s.to]), [...ids, s.id]);
  };
  walk(from, new Set([from]), []);
  return found;
}

const sortRoutes = (rs: string[][]): string[] => rs.map((r) => r.join(' ')).sort();

function synthetic(id: string, from: string, to: string, relation: AtlasBridge['relation'] = 'approximation'): AtlasBridge {
  return { id, premises: [from], conclusion: to, relation } as unknown as AtlasBridge;
}

describe('enumerateRoutes', () => {
  // A→D directly, A→B→D, A→C→D, and B⇄C by an exact equivalence, so A→B→C→D and A→C→B→D too.
  const graph = [
    synthetic('ab', 'A', 'B'),
    synthetic('ac', 'A', 'C'),
    synthetic('bd', 'B', 'D'),
    synthetic('cd', 'C', 'D'),
    synthetic('ad', 'A', 'D'),
    synthetic('bc', 'B', 'C', 'exact-equivalence'),
  ];

  it('finds every simple route, shortest first, and agrees with a recursive enumeration', () => {
    const r = enumerateRoutes(graph, 'A', 'D', 100);
    const ids = r.routes.map((x) => x.map((b) => b.id));
    expect(sortRoutes(ids)).toEqual(sortRoutes(naiveRoutes(graph, 'A', 'D')));
    expect(ids).toHaveLength(5);
    expect(ids.map((x) => x.length)).toEqual([1, 2, 2, 3, 3]);
    expect(r).toMatchObject({ exhausted: true, completeThrough: null, stoppedBy: null });
    // A lossy relation is not walked backwards: nothing reaches A.
    expect(enumerateRoutes(graph, 'D', 'A', 100).routes).toEqual([]);
  });

  it('says when the limit cut the list short, and up to which bridge count it is complete', () => {
    const r = enumerateRoutes(graph, 'A', 'D', 2);
    expect(r.routes.map((x) => x.map((b) => b.id))).toEqual([['ad'], ['ab', 'bd']]);
    expect(r).toMatchObject({ exhausted: false, stoppedBy: 'limit', completeThrough: 1 });
    // Exactly as many routes as exist is not a truncation.
    expect(enumerateRoutes(graph, 'A', 'D', 5)).toMatchObject({ exhausted: true, stoppedBy: null });
    expect(enumerateRoutes(graph, 'A', 'D', 4)).toMatchObject({ exhausted: false, stoppedBy: 'limit', completeThrough: 2 });
  });

  it('says when the work budget stopped it, which is not the same as running out of routes', () => {
    const r = enumerateRoutes(graph, 'A', 'D', 100, 2);
    expect(r.exhausted).toBe(false);
    expect(r.stoppedBy).toBe('budget');
    expect(r.completeThrough).toBe(1);
    expect(() => enumerateRoutes(graph, 'A', 'D', 0)).toThrow(RangeError);
  });
});

describe('upt map --route --all-routes', () => {
  const pairs = MODELS.flatMap((a) => MODELS.filter((b) => b !== a).map((b) => [a.id, b.id] as const));

  it('lists, for every ordered pair of atlas models, exactly the routes a recursive enumeration finds, and marks the `upt path` route', async () => {
    let connected = 0;
    for (const [from, to] of pairs) {
      const expected = naiveRoutes(BRIDGES, from, to);
      const v = (await json(['map', `--route=${from},${to}`, '--all-routes'])).result;
      expect(v.view).toBe('routes');
      expect(sortRoutes(v.routes.map((r: any) => r.bridges))).toEqual(sortRoutes(expected));
      expect(v.count).toMatchObject({ shown: expected.length, exhausted: true });
      const p = (await json(['path', from, to])).result;
      const reported = v.routes.filter((r: any) => r.reported);
      if (p.path === null) {
        expect(reported).toHaveLength(0);
        continue;
      }
      connected++;
      expect(reported).toHaveLength(1);
      expect(reported[0].bridges).toEqual(p.path.map((s: any) => s.id));
      expect(reported[0].composition.claim.kind).toBe(p.kind);
    }
    expect(connected).toBeGreaterThan(0);
  });

  it('counts route claims by kind and reason, and the denominator is the atlas', async () => {
    const v = (await json(['map', '--route=model-pendulum,model-lc', '--all-routes'])).result;
    const noClaim = Object.values(v.claims.noClaim as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(v.claims.bound + noClaim).toBe(v.count.shown);
    expect(v.denominator.bridges.of).toBe(BRIDGES.length);
    expect(v.denominator.models.of).toBe(MODELS.length);
    const { stdout } = await run(['map', '--route=model-pendulum,model-lc', '--all-routes']);
    expect(stdout).toContain('the search ran out of routes, so these are all of them');
    expect(stdout).toContain("route 1 (2 bridge(s)) — the route `upt path` reports:");
    expect(stdout).toContain('model-pendulum --[approximation: ab-pendulum-linear]--> model-spring --[exact-equivalence: ab-spring-lc]--> model-lc');
  });

  it('refuses a bad limit, and the route-only flags elsewhere', async () => {
    for (const bad of ['0', '1001', '2.5', 'x']) {
      const r = await run(['map', '--route=model-pendulum,model-lc', '--all-routes', `--max-routes=${bad}`]);
      expect(r.code).toBe(1);
      expect(r.stderr).toMatch(/--max-routes=.* must be an integer from 1 to 1000/);
    }
    expect((await run(['map', '--route=model-pendulum,model-lc', '--max-routes=3'])).stderr).toMatch(/--max-routes needs --all-routes/);
    expect((await run(['map', '--family=waves', '--all-routes'])).stderr).toMatch(/--all-routes needs --route/);
    expect((await run(['map', '--all-routes'])).stderr).toMatch(/apply to an atlas view|applies to an atlas view/);
    expect((await run(['map', '--stored'])).stderr).toMatch(/applies to an atlas view/);
  });
});

describe('witness results: --stored', () => {
  const artifact = JSON.parse(readFileSync(new URL('../../data/atlas/witness-results.json', import.meta.url), 'utf8')) as {
    results: { recordId: string; witnessId: string; status: string }[];
  };

  /** Derived and undecided tags by trying every assignment of the unobserved witnesses. */
  function exhaustive(b: AtlasBridge): { derived: string[]; undecided: string[] } {
    const rows = artifact.results.filter((r) => r.recordId === b.id);
    const checked = b.witnesses.filter((w) => rows.some((r) => r.witnessId === w.id && r.status === 'checked')).map((w) => w.id);
    const open = b.witnesses.filter((w) => !rows.some((r) => r.witnessId === w.id)).map((w) => w.id);
    const sets: Set<string>[] = [];
    for (let mask = 0; mask < 1 << open.length; mask++) {
      const pass = new Set([...checked, ...open.filter((_, i) => mask & (1 << i))]);
      sets.push(new Set(deriveEvidence(b, pass)));
    }
    const union = [...new Set(sets.flatMap((s) => [...s]))];
    const derived = union.filter((t) => sets.every((s) => s.has(t))).sort();
    return { derived, undecided: union.filter((t) => !derived.includes(t)).sort() };
  }

  it('derives every bridge\'s tags as an exhaustive assignment of its unobserved witnesses does', async () => {
    let resolved = 0;
    for (const f of ATLAS_FAMILIES) {
      const v = (await json(['map', `--family=${f.family}`, '--stored'])).result;
      for (const b of v.bridges.filter((x: any) => x.role === 'filed')) {
        const rec = BRIDGES.find((x) => x.id === b.id)!;
        const want = exhaustive(rec);
        expect({ id: b.id, derived: b.evidence.derived, undecided: b.evidence.undecided }).toEqual({ id: b.id, ...want });
        const without = (await json(['map', `--family=${f.family}`])).result.bridges.find((x: any) => x.id === b.id);
        if (without.evidence.undecided.length > b.evidence.undecided.length) resolved++;
      }
    }
    // Positive control: the stored results DO resolve some tag somewhere, so a
    // view that ignored them would fail the equality above rather than pass it.
    expect(resolved).toBeGreaterThan(0);
  });

  it('labels the source and its provenance, and says the artifact carries no date of its own', async () => {
    const v = (await json(['map', '--route=model-spring,model-lc', '--stored'])).result;
    expect(v.witnessResults.mode).toBe('stored');
    expect(v.witnessResults.provenance).toMatchObject({
      url: 'https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/data/atlas/witness-results.json',
      schemaVersion: '0',
      carries: 'the artifact records no commit or date of its own',
    });
    const { stdout } = await run(['map', '--route=model-spring,model-lc', '--stored']);
    expect(stdout).toMatch(/witness results: stored — https:\/\/github.com\/danielsimonjr\/Universal-Physics-Tensor\/blob\/master\/data\/atlas\/witness-results\.json \(schemaVersion 0; /);
    expect(stdout).toContain('witnesses (stored): checked W1s · refuted none · unresolved none · no result W1, W1a, W1b, W2b');
    expect((await run(['map', '--route=model-spring,model-lc', '--stored', '--run'])).stderr).toMatch(/pick one witness-results source/);
  });

  it('a filter decided by the stored results is kept or dropped, no longer undecided', async () => {
    const before = (await json(['map', '--family=oscillators', '--evidence=symbolically-checked'])).result.filter;
    const after = (await json(['map', '--family=oscillators', '--evidence=symbolically-checked', '--stored'])).result.filter;
    expect(before.kept).toBe(0);
    expect(before.droppedUndecided).toBeGreaterThan(0);
    expect(after.kept).toBeGreaterThan(0);
    expect(after.kept + after.droppedNotMatching + after.droppedUndecided).toBe(after.total);
    expect(after.results).toBe('stored');
  });
});

describe('witness results: what counts as a pass', () => {
  // ab-damped-rlc's only symbolic witness is W2s, so symbolically-checked turns on it alone.
  const source = (status: 'checked' | 'refuted' | 'unresolved', witnessId = 'W2s'): WitnessResults => ({
    mode: 'stored',
    provenance: { url: 'test', schemaVersion: '0', carries: 'test', lastCommit: null, modifiedSinceCommit: null },
    rows: [{ recordId: 'ab-damped-rlc', witnessId, status, ...(status === 'unresolved' ? { reason: 'timeout' } : {}) }],
  });
  const rlcOf = (results: WitnessResults, filter = {}) => {
    const v = buildFamilyView(api as never, 'oscillators', filter, results);
    return { kept: v.bridges.some((b) => b.id === 'ab-damped-rlc'), evidence: v.bridges.find((b) => b.id === 'ab-damped-rlc')?.evidence };
  };
  const bySymbolic = { evidence: 'symbolically-checked' as const };

  it('checked derives the tag (the control that makes the next cases informative)', () => {
    const rlc = BRIDGES.find((b) => b.id === 'ab-damped-rlc')!;
    expect(rlc.witnesses.filter((w) => w.kind === 'symbolic').map((w) => w.id)).toEqual(['W2s']);
    expect(rlcOf(source('checked')).evidence!.derived).toContain('symbolically-checked');
    expect(rlcOf(source('checked'), bySymbolic).kept).toBe(true);
  });

  it('refuted and unresolved are observed and not passing, and are counted apart', () => {
    for (const status of ['refuted', 'unresolved'] as const) {
      const e = rlcOf(source(status)).evidence!;
      expect(e.derived).not.toContain('symbolically-checked');
      expect(e.undecided).not.toContain('symbolically-checked');
      expect(rlcOf(source(status), bySymbolic).kept).toBe(false);
    }
    expect(rlcOf(source('refuted')).evidence!.results).toMatchObject({ checked: [], refuted: ['W2s'], unresolved: [] });
    expect(rlcOf(source('unresolved')).evidence!.results).toMatchObject({
      checked: [],
      refuted: [],
      unresolved: [{ id: 'W2s', reason: 'timeout' }],
    });
  });

  it('a row for a witness the bridge does not record passes nothing, and leaves the tag undecided', () => {
    const e = rlcOf(source('checked', 'W2s-not-a-witness-of-this-bridge')).evidence!;
    expect(e.derived).not.toContain('symbolically-checked');
    expect(e.undecided).toContain('symbolically-checked');
    expect(e.results!.notObserved).toContain('W2s');
    expect(rlcOf(source('checked', 'W2s-not-a-witness-of-this-bridge'), bySymbolic).kept).toBe(false);
  });
});

describe('witness results: --run', () => {
  it('reports each witness as `upt atlas <id> --run` does, for every atlas bridge', async () => {
    for (const f of ATLAS_FAMILIES) {
      const v = (await json(['map', `--family=${f.family}`, '--run'])).result;
      expect(v.witnessResults.mode).toBe('run');
      for (const b of v.bridges.filter((x: any) => x.role === 'filed')) {
        const a = (await json(['atlas', b.id, '--run'])).result;
        const o = b.evidence.results;
        for (const w of a.witnessExecution) {
          if (w.status === 'runnable' || w.status === 'not-observed') expect(o.notObserved).toContain(w.id);
          else if (w.status === 'unresolved') expect(o.unresolved.map((u: any) => u.id)).toContain(w.id);
          else expect(o[w.status]).toContain(w.id);
        }
        expect(o.checked.length + o.refuted.length + o.unresolved.length + o.notObserved.length).toBe(a.witnessExecution.length);
      }
    }
  });
});

describe('upt map --observable', () => {
  const words = (s: string): string[] => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  it('keeps the bridges whose recorded preserves text names the observable, by a tokenised second reading', async () => {
    for (const term of ['frequency', 'linearity', 'phase', 'units']) {
      const v = (await json(['map', `--observable=${term}`])).result;
      const preserving = BRIDGES.filter((b) => b.preserves.some((p) => words(p).includes(term))).map((b) => b.id);
      const translating = BRIDGES.filter((b) => api.translationsOf(b.id).some((t) => words(t.observable).includes(term))).map((b) => b.id);
      const notPreserving = BRIDGES.filter((b) => b.doesNotPreserve.some((p) => words(p).includes(term))).map((b) => b.id);
      expect(v.bridges.map((b: any) => b.id).sort()).toEqual([...new Set([...preserving, ...translating])].sort());
      expect(v.notPreserved.map((b: any) => b.id).sort()).toEqual(notPreserving.sort());
      const any = new Set([...preserving, ...translating, ...notPreserving]);
      expect(v.denominator.bridges).toEqual({
        preserves: preserving.length,
        translates: translating.length,
        doesNotPreserve: notPreserving.length,
        recordsNothing: BRIDGES.length - any.size,
        of: BRIDGES.length,
      });
    }
  });

  it('a bridge recording the observable both ways is shown on both lists, not merged', async () => {
    const v = (await json(['map', '--observable=phase'])).result;
    const pend = v.bridges.find((b: any) => b.id === 'ab-pendulum-linear');
    expect(pend.translationsMatched).toEqual(['phase']);
    expect(v.notPreserved.map((b: any) => b.id)).toContain('ab-pendulum-linear');
  });

  it('records nothing is an absence, and a non-word does not match inside a word', async () => {
    const v = (await json(['map', '--observable=freq'])).result;
    expect(v.bridges).toEqual([]);
    expect(v.denominator.bridges.recordsNothing).toBe(BRIDGES.length);
    const { stdout } = await run(['map', '--observable=freq']);
    expect(stdout).toContain(`${BRIDGES.length} record nothing about it (an absent record, not a finding)`);
    expect((await run(['map', '--observable=phase', '--family=waves'])).stderr).toMatch(/pick one atlas view/);
    const dot = await run(['map', '--observable=phase', '--format=dot']);
    expect(dot.code).toBe(0);
    expect(dot.stdout).toContain(`label="observable 'phase': 3 bridge(s) shown; of ${BRIDGES.length} atlas bridges`);
  });
});
