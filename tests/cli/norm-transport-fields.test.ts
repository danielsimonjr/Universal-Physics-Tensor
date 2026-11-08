/**
 * `normTransportFields` (`_atlas-route.ts`) is the one projection of a norm
 * transport. `transportReport` and `upt atlas --json` build their rows from it,
 * and their JSON is unchanged: the same keys in the same order, with the
 * `upt atlas` override that prints a missing witness tolerance as null.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { transportReport } from '../../src/cli/commands/_atlas-route.js';

const FIELDS = ['id', 'fromModel', 'toModel', 'from', 'to', 'K', 'domain', 'derivation', 'timeMap', 'uniformity', 'witness', 'basis'];

const spring = ATLAS_FAMILIES.flatMap((f) => f.bridges).find((b) => b.id === 'ab-spring-lc')!;
const nt = spring.normTransports![0]!;

describe('normTransportFields', () => {
  it('transportReport prints index, bridgeId and the fields, in that order', () => {
    const row = transportReport({ index: 0, bridgeId: spring.id, transport: nt } as never);
    expect(Object.keys(row)).toEqual(['index', 'bridgeId', ...FIELDS]);
    expect(Object.keys(row.witness)).toEqual(['id', 'kind', 'test', 'tolerance']);
    expect(JSON.parse(JSON.stringify(row)).witness).toEqual(
      JSON.parse(JSON.stringify({ id: nt.witness.id, kind: nt.witness.kind, test: nt.witness.test, tolerance: nt.witness.tolerance })),
    );
  });

  it('upt atlas --json prints the fields, then status, with a missing tolerance as null', async () => {
    const out: string[] = [];
    const code = await runCli(['atlas', 'ab-spring-lc', '--json'], {
      out: (s: string) => out.push(s),
      err: () => undefined,
      write: (s: string) => out.push(s),
    } as never);
    expect(code).toBe(0);
    const row = JSON.parse(out.join('\n')).result.normTransports[0];
    expect(Object.keys(row)).toEqual([...FIELDS, 'status']);
    expect(row.witness).toEqual({ id: nt.witness.id, kind: nt.witness.kind, test: nt.witness.test, tolerance: nt.witness.tolerance ?? null });
  });

  it('is the one projection: both commands call it', () => {
    const read = (f: string): string => readFileSync(new URL(`../../src/cli/commands/${f}`, import.meta.url), 'utf8');
    expect(read('_atlas-route.ts')).toContain('...normTransportFields(a.transport)');
    expect(read('atlas.ts')).toContain('...normTransportFields(nt)');
  });
});
