/**
 * `upt chain` points at a document a published tarball can open, and the
 * Landauer edge's speculative grade points at the atlas formalRef.
 *
 * The command still does not run the pipeline. `edge16.confidence` stays
 * `speculative`. `composeEdges(edge42, edge16)` stays `highly-speculative`
 * and is not `formally-proved`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { catalogEdgeKey } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/index.js';

const edge16 = catalogEdge(catalogEdgeKey(16));
const edge42 = catalogEdge(catalogEdgeKey(42));
import { composeEdges } from '../../src/composition/compose.js';

const DESIGN_URL =
  'https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/docs/planning/Bridge-Discovery-Pipeline-Design.md';

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

describe('chain pointer and Landauer confidence', () => {
  it('upt chain exits 2, names the GitHub design, and does not run the pipeline', async () => {
    const cap = capture();
    expect(await runCli(['chain'], cap.io)).toBe(2);
    const err = cap.err.join('');
    expect(err).toContain(DESIGN_URL);
    expect(err).toContain('upt atlas be-16');
    expect(err).toMatch(/does not run the chain orchestrator/);
    const src = readFileSync(new URL('../../src/cli/commands/chain.ts', import.meta.url), 'utf8');
    expect(src.includes("from '../../atlas/chain-pipeline.js'")).toBe(false);
    expect(src.includes('runChainPipeline(')).toBe(false);
  });

  it('keeps the edge speculative and points the atlas page at that grade', async () => {
    expect(edge16.confidence).toBe('speculative');
    expect(composeEdges(edge42, edge16).confidence).toBe('highly-speculative');
    const cap = capture();
    expect(await runCli(['atlas', 'be-16'], cap.io)).toBe(0);
    const text = cap.lines.join('');
    expect(text).toContain('kind: bridge');
    expect(text).toMatch(/catalog edge for id 16 is speculative/);
    expect(text).toMatch(/upt chain/);
    expect(text).toMatch(/not formally-proved|does not derive formally-proved/);
  });

  it('prints the provisional grade beside the Hawking-Landauer composition', async () => {
    const cap = capture();
    expect(await runCli(['symbolic'], cap.io)).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/confidence: highly-speculative/);
    expect(text).toMatch(/upt atlas be-42 and be-16/);
    expect(text).toMatch(/provisional/);
  });
});
