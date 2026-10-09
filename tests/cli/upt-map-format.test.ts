/**
 * `upt map --format=…` — the physics-map visualization CLI surface.
 *
 * Executes the built CLI. `tests/helpers/dist.js` (imported first) throws when `dist/` is
 * missing or older than `src/`; this file once skipped its whole describe block when `dist/`
 * was absent and reported "skipped" on an unbuilt tree while every sibling failed. The
 * rendering logic itself is covered by `tests/composition/graph-viz.test.ts`; these tests pin
 * the CLI wiring.
 *
 * @module tests/cli/upt-map-format
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');
const run = (args: string[]): string =>
  execFileSync('node', [cli, ...args], { encoding: 'utf8', stdio: 'pipe' });

let peerAvailable = true;
try {
  await import('@viz-js/viz');
} catch {
  peerAvailable = false;
}

describe('upt map --format', () => {
  it('default (no --format) still prints the text linkage map', () => {
    const out = run(['map']);
    expect(out).toContain('Linkage map');
  });

  it('--format=mermaid emits a flowchart with classDefs', () => {
    const out = run(['map', '--format=mermaid']);
    expect(out).toMatch(/^flowchart /m);
    expect(out).toMatch(/classDef/);
  });

  it('--format=dot emits a digraph with subgraph clusters', () => {
    const out = run(['map', '--format=dot']);
    expect(out).toMatch(/^digraph /m);
    expect(out).toContain('subgraph cluster_');
  });

  it('honors --source=canonical', () => {
    const out = run(['map', '--source=canonical', '--format=mermaid']);
    expect(out).toMatch(/^flowchart /m);
  });

  // 180s: two CLI spawns of the both-source map — the slowest case here; it
  // times out at the 60s default under full-suite parallel load on Windows (same
  // recurring flake fixed in tests/cli/upt-golden.test.ts). Passes in isolation.
  it('--proposed overlays unadjudicated junctions (dashed) at --source=both', () => {
    const plain = run(['map', '--source=both', '--format=dot']);
    const withProposed = run(['map', '--source=both', '--proposed', '--format=dot']);
    expect(withProposed).toMatch(/^digraph /m);
    // proposed junctions are rendered dashed and carry IC- ids
    expect(withProposed).toContain('dashed');
    expect(withProposed.length).toBeGreaterThan(plain.length);
  }, 180_000);

  it('unknown --format exits non-zero', () => {
    expect(() => run(['map', '--format=bogus'])).toThrow();
  });

  it('empty --out= exits non-zero', () => {
    expect(() => run(['map', '--format=mermaid', '--out='])).toThrow();
  });

  describe('--equation (inject a user equation)', () => {
    it('text: reports the cluster the equation joins via shared quantities', () => {
      const out = run([
        'map', '--source=canonical',
        '--equation', 'period = 2*pi*sqrt(length/gravity)',
      ]);
      expect(out).toMatch(/your equation/i);
      expect(out).toContain('length');
    });

    it('dot: renders the user junction with the user (violet) color', () => {
      // A dimensionally consistent equation: since 0.47.0 a mismatch exits 3, and
      // this test is about the rendering, not the verdict.
      const out = run([
        'map', '--source=canonical', '--format=dot',
        '--equation', 'period = 2*pi*sqrt(length/gravity)',
      ]);
      expect(out).toMatch(/^digraph /m);
      expect(out).toContain('#e9d8fd'); // the 'user' status fill
    });

    it('reports the dimensional verdict (consistent)', () => {
      const out = run([
        'map', '--source=canonical',
        '--equation', 'period = 2*pi*sqrt(length/gravity)',
      ]);
      expect(out).toMatch(/dimensionally consistent/i);
    });

    it('flags a dimensional mismatch, and exits 3 (a failed check, 0.47.0)', () => {
      const r = spawnSync('node', [cli, 'map', '--source=canonical', '--equation', 'period = mass'], {
        encoding: 'utf8',
      }); // [mass] ≠ [time]
      expect(r.status).toBe(3);
      expect(r.stdout).toMatch(/mismatch/i);
    });

    it('prints a dimension-based "did you mean?" for an inferable unknown, and exits 3', () => {
      const r = spawnSync('node', [cli, 'map', '--source=canonical', '--equation', 'period = uu / gravity'], {
        encoding: 'utf8',
      });
      expect(r.status).toBe(3);
      expect(r.stdout).toMatch(/did you mean/i);
      expect(r.stdout).toContain('speed');
      expect(r.stdout).not.toMatch(/\[L\^-1 T\^2\]/);
    });

    it('exits non-zero on a malformed equation (no "=")', () => {
      expect(() => run(['map', '--equation', 'no equals here'])).toThrow();
    });

    it('exits non-zero on a dimensionally non-homogeneous equation', () => {
      expect(() => run(['map', '--source=canonical', '--equation', 'period = length + gravity'])).toThrow();
    });
  });

  describe.skipIf(!peerAvailable)('--format=svg (optional @viz-js/viz peer)', () => {
    it('streams an SVG document to stdout', () => {
      const out = run(['map', '--format=svg']);
      expect(out).toContain('<svg');
      expect(out).toContain('</svg>');
    });

    it('--out writes an SVG file', () => {
      const path = join(tmpdir(), `upt-map-test-${process.pid}.svg`);
      try {
        run(['map', '--source=canonical', '--format=svg', `--out=${path}`]);
        const svg = readFileSync(path, 'utf8');
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
      } finally {
        rmSync(path, { force: true });
      }
    });
  });
});
