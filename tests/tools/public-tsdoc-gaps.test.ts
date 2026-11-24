/**
 * The public-surface TSDoc gap check: empty on the committed tree, and it
 * fails when a public export's summary line is stripped.
 *
 * Law 2 disclosure: the original `FORCE` CONTROL reaches FORCE through the
 * **runtime snapshot** bucket only (`dimensional/types.ts`). It does not by
 * itself prove the root-type, atlas-runtime, atlas-type, or MathTSEngine
 * subpath buckets are wired. Those have their own CONTROLs below. A CONTROL
 * that deleted the type buckets from `collect()` would still pass the FORCE
 * test and the size pins (`collectPublicNamesForTest`); the per-bucket tests
 * are what fail.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { namedReExports } from '../api/_public-surface-parse.js';
import {
  collectPublicNamesForTest,
  publicSymbolMeta,
  publicTsdocGaps,
  publicTsdocReport,
  resolvePublicSitesForTest,
  setSourceReaderForTest,
} from '../../scripts/public-tsdoc-gaps.js';

const SRC = new URL('../../src/', import.meta.url);

/** The 15 Dimension constants that were gaps on the pre-S12 tree (RED first). */
const S12_PRE_DIMENSION_GAPS = [
  'ACCELERATION',
  'ACTION',
  'AREA',
  'CHARGE',
  'DIMENSIONLESS',
  'ENERGY',
  'ENTROPY',
  'FORCE',
  'FREQUENCY',
  'LENGTH',
  'MASS',
  'POWER',
  'TEMPERATURE',
  'TIME',
  'VELOCITY',
] as const;

function committed(rel: string): string {
  return readFileSync(new URL(rel, SRC), 'utf8');
}

function withSrc(overrides: Record<string, string>, run: () => void): void {
  const restore = setSourceReaderForTest((rel) => (rel in overrides ? overrides[rel]! : committed(rel)));
  try {
    run();
  } finally {
    restore();
  }
}

function stripJsdocBefore(source: string, exportNeedle: string): string {
  const idx = source.indexOf(exportNeedle);
  if (idx < 0) throw new Error(`export needle not found: ${exportNeedle}`);
  const before = source.slice(0, idx);
  const start = before.lastIndexOf('/**');
  if (start < 0) throw new Error(`no JSDoc immediately before ${exportNeedle}`);
  const comment = before.slice(start);
  if (!/^\/\*\*[\s\S]*\*\/\s*$/.test(comment)) {
    throw new Error(`no JSDoc immediately before ${exportNeedle}`);
  }
  const stripped = before.slice(0, start) + source.slice(idx);
  if (stripped === source) throw new Error(`strip was a no-op for ${exportNeedle}`);
  return stripped;
}

describe('public-tsdoc-gaps', () => {
  it('the public surface has no export without a JSDoc summary line', () => {
    const result = publicTsdocReport();
    expect(result.gaps).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(result.bareStarFrom).toEqual([]);
  });

  it("CONTROL (runtime snapshot only): stripping FORCE's summary puts FORCE back on the gap list", () => {
    const path = 'dimensional/types.ts';
    const stripped = stripJsdocBefore(committed(path), 'export const FORCE');
    withSrc({ [path]: stripped }, () => {
      expect(publicTsdocGaps()).toContainEqual({ name: 'FORCE', via: 'root', file: path });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL (root types): stripping GeodesicIntegratorInputs reports that mixed-clause type', () => {
    const path = 'numerical/geodesic-integrator.ts';
    const stripped = stripJsdocBefore(committed(path), 'export interface GeodesicIntegratorInputs');
    withSrc({ [path]: stripped }, () => {
      expect(publicTsdocGaps()).toContainEqual({
        name: 'GeodesicIntegratorInputs',
        via: 'root',
        file: path,
      });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL (atlas runtime): stripping ATLAS_FAMILIES reports via atlas', () => {
    const path = 'atlas/families.ts';
    const stripped = stripJsdocBefore(committed(path), 'export const ATLAS_FAMILIES');
    withSrc({ [path]: stripped }, () => {
      expect(publicTsdocGaps()).toContainEqual({ name: 'ATLAS_FAMILIES', via: 'atlas', file: path });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL (atlas types): stripping FormalFidelity reports via atlas', () => {
    const path = 'relations/types.ts';
    const stripped = stripJsdocBefore(committed(path), 'export type FormalFidelity');
    withSrc({ [path]: stripped }, () => {
      expect(publicTsdocGaps()).toContainEqual({ name: 'FormalFidelity', via: 'atlas', file: path });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL (MathTSEngine subpath): stripping MathTSEngine reports the subpath via', () => {
    const path = 'numerical/mathts-engine.ts';
    const stripped = stripJsdocBefore(committed(path), 'export class MathTSEngine');
    withSrc({ [path]: stripped }, () => {
      expect(publicTsdocGaps()).toContainEqual({
        name: 'MathTSEngine',
        via: 'numerical/mathts-engine',
        file: path,
      });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('pins census bucket sizes against independent authorities (251 root types)', () => {
    const buckets = collectPublicNamesForTest();
    // Runtime: tests/api/__snapshots__/public-surface.test.ts.snap
    expect(buckets.rootRuntime).toHaveLength(233);
    // Types: src/index.ts including mixed `export { value, type T }` specifiers.
    // Independent authority: docs/architecture/API.md "251 type-only symbols".
    expect(buckets.rootTypes).toHaveLength(251);
    expect(buckets.rootTypes).toContain('GeodesicIntegratorInputs');
    expect(buckets.rootTypes).toContain('GeodesicIntegratorResult');
    // Atlas: src/atlas/public.ts named re-exports (the facade is the single list).
    const atlasNames = namedReExports(committed('atlas/public.ts')).map((row) => row.name).sort();
    expect([...buckets.atlasRuntime, ...buckets.atlasTypes].sort()).toEqual(atlasNames);
    expect(buckets.subpath).toEqual(['MathTSEngine']);
  });

  it('CONTROL: aliased re-export looks up the local name, so a documented source is not a gap', () => {
    const facade = committed('atlas/public.ts').replace(
      "export { ATLAS_FAMILIES } from './families.js';",
      "export { ATLAS_FAMILIES as ATLAS_FAMILIES_ALIAS } from './families.js';",
    );
    expect(facade).not.toBe(committed('atlas/public.ts'));
    withSrc({ 'atlas/public.ts': facade }, () => {
      expect(resolvePublicSitesForTest('atlas/public.ts', 'ATLAS_FAMILIES_ALIAS')).toEqual([
        { file: 'atlas/families.ts', lookupName: 'ATLAS_FAMILIES' },
      ]);
      expect(publicTsdocGaps().filter((gap) => gap.name === 'ATLAS_FAMILIES_ALIAS')).toEqual([]);
      expect(publicTsdocReport().unresolved.filter((item) => item.name === 'ATLAS_FAMILIES_ALIAS')).toEqual([]);
    });
  });

  it('CONTROL: a documented homonym does not mask an undocumented declaration of the same name', () => {
    const path = 'dimensional/types.ts';
    const injected = `${committed(path)}\nexport type FORCE = number;\n`;
    withSrc({ [path]: injected }, () => {
      expect(publicTsdocGaps()).toContainEqual({ name: 'FORCE', via: 'root', file: path });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL: an unresolved re-export fails the report (and would fail --check)', () => {
    const injected = `${committed('index.ts')}\nexport type { __NoSuchType } from './dimensional/types.js';\n`;
    withSrc({ 'index.ts': injected }, () => {
      const result = publicTsdocReport();
      expect(result.unresolved).toContainEqual({ via: 'root', name: '__NoSuchType' });
      expect(result.unresolved.length + result.gaps.length + result.bareStarFrom.length).toBeGreaterThan(0);
    });
    expect(publicTsdocReport().unresolved).toEqual([]);
  });

  it('CONTROL: a bare export * from on the package root fails the report', () => {
    const injected = `${committed('index.ts')}\nexport * from './probe.js';\n`;
    expect(injected).toMatch(/export \* from '\.\/probe\.js'/);
    expect(committed('index.ts')).not.toMatch(/export\s+\*\s+from\s+'/);
    withSrc({ 'index.ts': injected }, () => {
      expect(publicTsdocReport().bareStarFrom).toEqual(['./probe.js']);
    });
    expect(publicTsdocReport().bareStarFrom).toEqual([]);
  });

  it('CONTROL: double-quoted from still resolves ATLAS_FAMILIES and FormalFidelity', () => {
    const familiesNeedle = "export { ATLAS_FAMILIES } from './families.js';";
    const typesNeedle = "from './types.js';";
    const facade = committed('atlas/public.ts')
      .replace(familiesNeedle, 'export { ATLAS_FAMILIES } from "./families.js";')
      .replace(typesNeedle, 'from "./types.js";');
    expect(facade).not.toBe(committed('atlas/public.ts'));
    expect(facade).toContain('from "./families.js"');
    expect(facade).toContain('from "./types.js"');
    withSrc({ 'atlas/public.ts': facade }, () => {
      expect(resolvePublicSitesForTest('atlas/public.ts', 'ATLAS_FAMILIES')).toEqual([
        { file: 'atlas/families.ts', lookupName: 'ATLAS_FAMILIES' },
      ]);
      expect(resolvePublicSitesForTest('atlas/public.ts', 'FormalFidelity')).toEqual([
        { file: 'relations/types.ts', lookupName: 'FormalFidelity' },
      ]);
      expect(collectPublicNamesForTest().atlasRuntime).toContain('ATLAS_FAMILIES');
      expect(collectPublicNamesForTest().atlasTypes).toContain('FormalFidelity');
      expect(publicTsdocGaps().filter((gap) => gap.name === 'ATLAS_FAMILIES' || gap.name === 'FormalFidelity')).toEqual(
        [],
      );
    });
  });

  it('CONTROL: double-quoted and export type * from on the package root fail the report', () => {
    const quoted = `${committed('index.ts')}\nexport * from "./probe.js";\n`;
    const typeStar = `${committed('index.ts')}\nexport type * from './probe.js';\n`;
    const typeStarQuoted = `${committed('index.ts')}\nexport type * from "./probe.js";\n`;
    expect(quoted).toMatch(/export \* from "\.\/probe\.js"/);
    expect(typeStar).toMatch(/export type \* from '\.\/probe\.js'/);
    expect(typeStarQuoted).toMatch(/export type \* from "\.\/probe\.js"/);
    withSrc({ 'index.ts': quoted }, () => {
      expect(publicTsdocReport().bareStarFrom).toEqual(['./probe.js']);
    });
    withSrc({ 'index.ts': typeStar }, () => {
      expect(publicTsdocReport().bareStarFrom).toEqual(['./probe.js']);
    });
    withSrc({ 'index.ts': typeStarQuoted }, () => {
      expect(publicTsdocReport().bareStarFrom).toEqual(['./probe.js']);
    });
    expect(publicTsdocReport().bareStarFrom).toEqual([]);
  });

  it('CONTROL: a name is a gap if any resolved site is undocumented', () => {
    const facade = committed('atlas/public.ts').replace(
      "export { ATLAS_FAMILIES } from './families.js';",
      "export { ATLAS_FAMILIES } from './families.js';\nexport { ATLAS_FAMILIES } from './serialize.js';",
    );
    const serialize = `${committed('atlas/serialize.ts')}\nexport const ATLAS_FAMILIES = 1;\n`;
    expect(facade).not.toBe(committed('atlas/public.ts'));
    expect(serialize).not.toBe(committed('atlas/serialize.ts'));
    withSrc({ 'atlas/public.ts': facade, 'atlas/serialize.ts': serialize }, () => {
      expect(resolvePublicSitesForTest('atlas/public.ts', 'ATLAS_FAMILIES')).toEqual([
        { file: 'atlas/families.ts', lookupName: 'ATLAS_FAMILIES' },
        { file: 'atlas/serialize.ts', lookupName: 'ATLAS_FAMILIES' },
      ]);
      expect(publicTsdocGaps()).toContainEqual({
        name: 'ATLAS_FAMILIES',
        via: 'atlas',
        file: 'atlas/serialize.ts',
      });
    });
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('CONTROL: an inline export interface / export type on the root is a type gap', () => {
    const injected = `${committed('index.ts')}\nexport interface __InlineUndocType { x: number }\nexport type __InlineUndocAlias = number;\nexport const __InlineRuntime = 1;\n`;
    expect(injected).not.toBe(committed('index.ts'));
    withSrc({ 'index.ts': injected }, () => {
      const buckets = collectPublicNamesForTest();
      expect(buckets.rootTypes).toContain('__InlineUndocType');
      expect(buckets.rootTypes).toContain('__InlineUndocAlias');
      expect(buckets.rootTypes).not.toContain('__InlineRuntime');
      expect(publicTsdocGaps()).toContainEqual({
        name: '__InlineUndocType',
        via: 'root',
        file: 'index.ts',
      });
      expect(publicTsdocGaps()).toContainEqual({
        name: '__InlineUndocAlias',
        via: 'root',
        file: 'index.ts',
      });
      expect(publicTsdocGaps().filter((gap) => gap.name === '__InlineRuntime')).toEqual([]);
    });
    expect(collectPublicNamesForTest().rootTypes).toHaveLength(251);
    expect(publicTsdocGaps()).toEqual([]);
  });

  it('src/index.ts has no bare export * from (export * as atlas is allowed)', () => {
    const text = committed('index.ts');
    expect(text).toMatch(/export \* as atlas from '\.\/atlas\/public\.js'/);
    const probe = `${text}\nexport * from './probe.js';\n`;
    const typeStar = `${text}\nexport type * from './probe.js';\n`;
    const quoted = `${text}\nexport * from "./probe.js";\n`;
    expect(/export\s+\*\s+from\s+'/.test(text)).toBe(false);
    expect(/export\s+(type\s+)?\*\s+from\s*['"]/.test(text)).toBe(false);
    expect(/export\s+\*\s+from\s+'/.test(probe)).toBe(true);
    expect(/export\s+(type\s+)?\*\s+from\s*['"]/.test(typeStar)).toBe(true);
    expect(/export\s+(type\s+)?\*\s+from\s*['"]/.test(quoted)).toBe(true);
  });

  it('publicSymbolMeta returns kind, summary and header for integrateGeodesic', () => {
    const meta = publicSymbolMeta('integrateGeodesic');
    expect(meta).not.toBeNull();
    expect(meta!.kind).toBe('function');
    expect(meta!.summary.length).toBeGreaterThan(0);
    expect(meta!.header.length).toBeGreaterThan(0);
    expect(meta!.header).toMatch(/integrateGeodesic/);
    expect(meta!.lookupName).toBe('integrateGeodesic');
    expect(meta!.file).toBe('numerical/geodesic-integrator.ts');
  });

  it('publicSymbolMeta returns kind, summary and header for GeodesicIntegratorInputs', () => {
    const meta = publicSymbolMeta('GeodesicIntegratorInputs');
    expect(meta).not.toBeNull();
    expect(meta!.kind).toBe('interface');
    expect(meta!.summary.length).toBeGreaterThan(0);
    expect(meta!.header.length).toBeGreaterThan(0);
    expect(meta!.header).toMatch(/GeodesicIntegratorInputs/);
    expect(meta!.lookupName).toBe('GeodesicIntegratorInputs');
    expect(meta!.file).toBe('numerical/geodesic-integrator.ts');
  });

  it('CONTROL: the pre-S12 Dimension constants are exactly 15 gaps', () => {
    let source = committed('dimensional/types.ts');
    for (const name of S12_PRE_DIMENSION_GAPS) {
      source = stripJsdocBefore(source, `export const ${name}`);
    }
    withSrc({ 'dimensional/types.ts': source }, () => {
      const gaps = publicTsdocGaps();
      expect(gaps).toHaveLength(15);
      expect(gaps.map((gap) => gap.name).sort()).toEqual([...S12_PRE_DIMENSION_GAPS]);
      expect(gaps.every((gap) => gap.via === 'root' && gap.file === 'dimensional/types.ts')).toBe(true);
    });
    expect(publicTsdocGaps()).toEqual([]);
  });
});
