/**
 * `normTransportFields` (`src/atlas/serialize.ts`) is the one projection of a norm
 * transport. `transportReport` and `upt atlas --json` build their rows from it,
 * and their JSON is unchanged: the same keys in the same order, with the
 * `upt atlas` override that prints a missing witness tolerance as null.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { transportReport } from '../../src/cli/commands/_atlas-route.js';
import * as cliApi from '../../src/cli-api.js';

const FIELDS = ['id', 'fromModel', 'toModel', 'from', 'to', 'K', 'domain', 'derivation', 'timeMap', 'uniformity', 'witness', 'basis'];

const spring = ATLAS_FAMILIES.flatMap((f) => f.bridges).find((b) => b.id === 'ab-spring-lc')!;
const nt = spring.normTransports![0]!;

describe('normTransportFields', () => {
  it('transportReport prints index, bridgeId and the fields, in that order', () => {
    const row = transportReport(cliApi, { index: 0, bridgeId: spring.id, transport: nt } as never);
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

  it('is the one projection: serialize.ts owns it, and the atlas JSON and both commands call it', () => {
    const read = (f: string): string => readFileSync(new URL(`../../src/${f}`, import.meta.url), 'utf8');
    const serialize = read('atlas/serialize.ts');
    expect(serialize).toContain('export function normTransportFields(');
    expect(serialize).toContain('...normTransportFields(nt)');
    // The commands reach it through the injected api, so they import no library value.
    expect(read('cli-api.ts')).toContain("export { normTransportFields } from './atlas/serialize.js';");
    for (const f of ['cli/commands/_atlas-route.ts', 'cli/commands/atlas.ts']) {
      expect(read(f), f).not.toContain('atlas/serialize.js');
      expect(read(f), f).not.toContain('function normTransportFields(');
    }
    expect(read('cli/commands/_atlas-route.ts')).toContain('...api.normTransportFields(a.transport)');
    expect(read('cli/commands/atlas.ts')).toContain('...api.normTransportFields(nt)');
  });
});
