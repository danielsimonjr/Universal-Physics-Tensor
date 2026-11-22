/**
 * The generated user API reference: `scripts/api-reference.ts` renders exactly
 * the committed `docs/user/api.md`, and the page is grounded in the real
 * surface.
 *
 * The mutation CONTROLs (law 2) change one TSDoc summary, add a single-line
 * async engine method before another method, add a root runtime export, inject
 * a trailing in-clause comment export, or banner UniversalTensor in the source
 * the renderer reads and prove the rendered page changes — that is the exact
 * condition `bun scripts/api-reference.ts --check` exits 1 on.
 *
 * @module tests/tools/api-reference
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderApiReference } from '../../scripts/api-reference.js';
import { setSourceReaderForTest, stripComments } from '../../scripts/public-tsdoc-gaps.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(REPO, 'src');
const PAGE = join(REPO, 'docs/user/api.md');

function committed(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

function committedPage(): string {
  return readFileSync(PAGE, 'utf8');
}

function withSrc(overrides: Record<string, string>, run: () => void): void {
  const restore = setSourceReaderForTest((rel) => (rel in overrides ? overrides[rel]! : committed(rel)));
  try {
    run();
  } finally {
    restore();
  }
}

/** Remove the JSDoc block immediately above `needle` (the S12 test's pattern). */
function stripJsdocBefore(source: string, needle: string): string {
  const idx = source.indexOf(needle);
  if (idx < 0) throw new Error(`export needle not found: ${needle}`);
  const before = source.slice(0, idx);
  const start = before.lastIndexOf('/**');
  if (start < 0) throw new Error(`no JSDoc immediately before ${needle}`);
  if (!/^\/\*\*[\s\S]*\*\/\s*$/.test(before.slice(start))) {
    throw new Error(`no JSDoc immediately before ${needle}`);
  }
  return before.slice(0, start) + source.slice(idx);
}

function sectionAfter(page: string, headingPrefix: string): string {
  const marker = `### ${headingPrefix}`;
  const start = page.indexOf(marker);
  expect(start, `heading ${marker}`).toBeGreaterThanOrEqual(0);
  const rest = page.slice(start);
  const next = rest.indexOf('\n### ', 1);
  return next < 0 ? rest : rest.slice(0, next);
}

function checkWouldFail(rendered: string): boolean {
  return rendered !== committedPage();
}

/**
 * The same specifier split `indexBanners` uses, without stripping comments.
 * A trailing `// comment, …` on `Name as ALIAS` poisons the identifier.
 */
function namesFromClauseBody(body: string): string[] {
  const names: string[] = [];
  for (const raw of body.split(',')) {
    const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
    if (name !== undefined && /^[A-Za-z_$][\w$]*$/.test(name)) names.push(name);
  }
  return names;
}

/**
 * Subprocess CONTROL: the same `runApiReferenceCli` `main()` uses, with
 * `setSourceReaderForTest` overlays, in a fresh bun process. Does not write
 * into this tree (parallel vitest files share the filesystem).
 */
function spawnCheckWithOverlays(overrides: Record<string, string>): { status: number | null; stderr: string; stdout: string } {
  const overlayPath = join(tmpdir(), `upt-api-ref-overlay-${process.pid}-${Date.now()}.json`);
  writeFileSync(overlayPath, JSON.stringify(overrides));
  try {
    const result = spawnSync(
      'bun',
      [
        '-e',
        `
          import { readFileSync } from 'node:fs';
          import { join } from 'node:path';
          import { runApiReferenceCli } from './scripts/api-reference.ts';
          import { setSourceReaderForTest } from './scripts/public-tsdoc-gaps.ts';
          const src = join(process.cwd(), 'src');
          const overrides = JSON.parse(readFileSync(${JSON.stringify(overlayPath)}, 'utf8'));
          const restore = setSourceReaderForTest((rel) =>
            Object.hasOwn(overrides, rel) ? overrides[rel] : readFileSync(join(src, rel), 'utf8'),
          );
          try {
            process.exit(runApiReferenceCli(['bun', 'scripts/api-reference.ts', '--check']));
          } finally {
            restore();
          }
        `,
      ],
      { cwd: REPO, encoding: 'utf8' },
    );
    return { status: result.status, stderr: result.stderr, stdout: result.stdout };
  } finally {
    rmSync(overlayPath, { force: true });
  }
}

/** Insert a single-line `{ return; }` method immediately before `fromNested`. */
function withSingleLineMethodBeforeFromNested(source: string): string {
  const needle = '  fromNested(data: NestedArray, shape: ReadonlyArray<number>): EngineTensor {';
  const idx = source.indexOf(needle);
  if (idx < 0) throw new Error('fromNested method not found');
  return `${source.slice(0, idx)}  async s13ProbeMethod(): Promise<void> { return; }\n${source.slice(idx)}`;
}

describe('api-reference', () => {
  it('the rendered page is byte-identical to the committed docs/user/api.md', () => {
    expect(renderApiReference()).toBe(committedPage());
  });

  it('bun scripts/api-reference.ts --check exits 0 on the committed page', () => {
    const result = spawnSync('bun', ['scripts/api-reference.ts', '--check'], {
      cwd: REPO,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('docs/user/api.md matches the public surface');
    expect(result.stderr).not.toContain('docs/user/api.md is stale');
  });

  it('spawnCheckWithOverlays of the empty overlay is the CLI --check green path', () => {
    const spawned = spawnCheckWithOverlays({});
    expect(spawned.status, spawned.stderr).toBe(0);
    expect(spawned.stdout).toContain('docs/user/api.md matches the public surface');
    expect(spawned.stderr).not.toContain('docs/user/api.md is stale');
  });

  it('the page covers the full public surface: 232 runtime rows, 248 type rows, 33 atlas members', () => {
    const page = committedPage();
    // 233 snapshot runtime names minus the `atlas` namespace binding, which is
    // its own section (publicSymbolMeta('atlas') resolves to null by design).
    const runtimeRows = (page.match(/^\| `[A-Za-z_$][\w$]*` \| `[\w/-]+` \|/gm) ?? []).length;
    expect(runtimeRows).toBe(232 + 248 + 33);
    expect(page).toContain('## Root runtime exports (`universal-physics-tensor`)');
    expect(page).toContain('## Root type exports (`universal-physics-tensor`)');
    expect(page).toContain("## The `atlas` namespace (`import { atlas } from 'universal-physics-tensor'`)");
    expect(page).toContain('## Subpath export (`universal-physics-tensor/numerical/mathts-engine`)');
    expect(page).toContain('`MathTSEngine`');
    expect(page).toContain('`matMul(a: EngineTensor, b: EngineTensor): EngineTensor`');
    expect(committedPage()).toContain('The `atlas` namespace binding is its own section below');
  });

  it('the page links the getting-started guide, the catalog guide and the engineering API reference', () => {
    const page = committedPage();
    expect(page).toContain('[the getting-started guide](getting-started.md)');
    expect(page).toContain('[the equation and constant catalog guide](catalog.md)');
    expect(page).toContain('[the engineering API reference](../architecture/API.md)');
    expect(page).toContain(
      'The `./probe` and `./atlas` package subpaths exist but are `@internal` and out of scope here.',
    );
    // The only import-shaped strings are real exports (the `Axes` summary
    // quotes its own usage); api-reference-symbols.test.ts checks every fence
    // against dist, this pins what the generator emits.
    const fences = [...page.matchAll(/import\s*\{[^}]*\}\s*from\s*'universal-physics-tensor[^']*'/g)].map((m) => m[0]);
    expect(fences).toEqual([
      "import { Axes } from 'universal-physics-tensor'",
      "import { atlas } from 'universal-physics-tensor'",
    ]);
  });

  it('lists async forwardGrad and reverseGrad among the 14 MathTSEngine methods', () => {
    const page = committedPage();
    expect(page).toContain('`async forwardGrad(');
    expect(page).toContain('`async reverseGrad(');
    const methods = [...page.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1]!);
    expect(methods.length).toBe(14);
    expect(methods.some((row) => row.startsWith('async forwardGrad('))).toBe(true);
    expect(methods.some((row) => row.startsWith('async reverseGrad('))).toBe(true);
  });

  it('groups the ten formerly mis-filed runtime exports under their src/index.ts banners', () => {
    const page = committedPage();
    const other = sectionAfter(page, 'Other exports');
    expect(other).toContain('| `UniversalTensor` |');
    expect(other).not.toContain('| `M_SUN_SI` |');
    expect(other).not.toContain('| `findPerihelion` |');
    expect(other).not.toContain('| `CONFRONTATION_RIGOR` |');

    const codata = sectionAfter(page, 'v0.5.1 — canonical flat CODATA 2022');
    expect(codata).toContain('| `M_SUN_SI` |');
    expect(codata).toContain('| `GM_SUN_SI` |');
    expect(codata).toContain('| `M_E_SI` |');
    expect(codata).toContain('| `B_WIEN_SI` |');

    // In-clause `// v0.5.0 …` comments are not banners; the clause sits under
    // the Numerical-contraction backend run (not the RK4 geodesic banner).
    const numerical = sectionAfter(page, 'Numerical-contraction backend');
    expect(numerical).toContain('| `findPerihelion` |');
    expect(numerical).toContain('| `integrateGeodesicGL4` |');
    expect(numerical).toContain('| `DuplicateCoordinateWarning` |');

    const confrontation = sectionAfter(page, 'The confrontation registry:');
    expect(confrontation).toContain('| `CONFRONTATION_RIGOR` |');

    const composition = sectionAfter(page, 'v0.8.0 — Composition graph');
    expect(composition).toContain('| `M_SUN_KG` |');
  });

  it('canonical-equation heading is the first banner line without leading ── decoration', () => {
    const page = committedPage();
    expect(page).toContain('### Canonical-equation registry (the L-layer ground truth)');
    expect(page).not.toMatch(/^### ──/m);
    const heading = page.split('\n').find((line) => line.startsWith('### Canonical-equation registry'));
    expect(heading).toBeDefined();
    expect(heading!).not.toContain('Textbook physics equations');
    expect(heading!).not.toMatch(/^### ──/);
  });

  it('wrapped banner continuation is prose, not a markdown list item', () => {
    const page = committedPage();
    expect(page).not.toMatch(/^\+ LabeledTensor/m);
    expect(page).toContain('LabeledTensor wrapper)');
    expect(page).toContain('### v0.7 Proposal 1 — Intelligent Index layer (UniversalIndex + Axes');
  });

  it('CONTROL: changing one TSDoc summary changes the rendered page, so --check fails on drift', () => {
    const path = 'numerical/geodesic-integrator.ts';
    const stripped = stripJsdocBefore(committed(path), 'export interface GeodesicIntegratorInputs');
    expect(stripped).not.toBe(committed(path));
    withSrc({ [path]: stripped }, () => {
      const drifted = renderApiReference();
      expect(checkWouldFail(drifted)).toBe(true);
      const emptyRow = drifted
        .split('\n')
        .find((line) => line.startsWith('| `GeodesicIntegratorInputs` |'));
      expect(emptyRow).toBeDefined();
      expect(emptyRow!).toMatch(/\|  \|$/);
    });
    expect(renderApiReference()).toBe(committedPage());
  });

  it('CONTROL: a single-line method before fromNested is its own bullet and --check fails', () => {
    const path = 'numerical/mathts-engine.ts';
    const mutated = withSingleLineMethodBeforeFromNested(committed(path));
    expect(mutated).not.toBe(committed(path));
    withSrc({ [path]: mutated }, () => {
      const drifted = renderApiReference();
      expect(checkWouldFail(drifted)).toBe(true);
      expect(drifted).toContain('`async s13ProbeMethod(): Promise<void>`');
      expect(drifted).not.toContain('{ return; }');
      const methods = [...drifted.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1]!);
      expect(methods.some((row) => row.startsWith('async s13ProbeMethod('))).toBe(true);
      expect(methods.some((row) => row.startsWith('fromNested('))).toBe(true);
      const probe = methods.find((row) => row.startsWith('async s13ProbeMethod('));
      expect(probe).toBe('async s13ProbeMethod(): Promise<void>');
      expect(methods.length).toBe(15);
    });
    const spawned = spawnCheckWithOverlays({ [path]: mutated });
    expect(spawned.status, spawned.stderr).toBe(1);
    expect(spawned.stderr).toContain('docs/user/api.md is stale');
    expect(renderApiReference()).toBe(committedPage());
  });

  it('CONTROL: a new root runtime export (snapshot untouched) makes --check fail', () => {
    const path = 'index.ts';
    const mutated = `${committed(path)}\n/** S13 live-census probe. */\nexport const S13_RUNTIME_PROBE = 1;\n`;
    expect(mutated).not.toBe(committed(path));
    withSrc({ [path]: mutated }, () => {
      const drifted = renderApiReference();
      expect(checkWouldFail(drifted)).toBe(true);
      expect(drifted).toContain('| `S13_RUNTIME_PROBE` |');
    });
    const spawned = spawnCheckWithOverlays({ [path]: mutated });
    expect(spawned.status, spawned.stderr).toBe(1);
    expect(spawned.stderr).toContain('docs/user/api.md is stale');
    expect(renderApiReference()).toBe(committedPage());
  });

  it('CONTROL: an in-clause trailing // comment export is grouped under its banner, and --check fails', () => {
    const path = 'index.ts';
    const original = committed(path);
    const probeBody = 'M_SUN_SI as S13_CLAUSE_PROBE // in-clause comment, not a specifier';
    // Without stripComments, `.split(/\\s+as\\s+/).pop()` leaves the comment on
    // the name and the identifier filter drops it — the previous form put the
    // `//` on its own line *before* `as`, so pop() discarded the comment.
    // Disabling stripComments makes THIS probe fail.
    expect(namesFromClauseBody(probeBody)).not.toContain('S13_CLAUSE_PROBE');
    expect(namesFromClauseBody(stripComments(probeBody))).toContain('S13_CLAUSE_PROBE');
    const needle = "  B_WIEN_SI,\n} from './core/constants.js';";
    expect(original).toContain(needle);
    const mutated = original.replace(
      needle,
      `  B_WIEN_SI,\n  ${probeBody}\n} from './core/constants.js';`,
    );
    expect(mutated).not.toBe(original);
    withSrc({ [path]: mutated }, () => {
      const drifted = renderApiReference();
      expect(checkWouldFail(drifted)).toBe(true);
      const codata = sectionAfter(drifted, 'v0.5.1 — canonical flat CODATA 2022');
      expect(codata).toContain('| `S13_CLAUSE_PROBE` |');
      expect(codata).toContain('| `M_SUN_SI` |');
      expect(codata).toContain('| `B_WIEN_SI` |');
      const other = sectionAfter(drifted, 'Other exports');
      expect(other).not.toContain('| `S13_CLAUSE_PROBE` |');
      expect(other).not.toContain('| `M_SUN_SI` |');
    });
    expect(renderApiReference()).toBe(committedPage());
  });

  it('CONTROL: a banner on UniversalTensor drops the empty Other exports heading', () => {
    const path = 'index.ts';
    const original = committed(path);
    const needle = "export { UniversalTensor } from './core/tensor.js';";
    expect(original).toContain(needle);
    const mutated = original.replace(needle, `// S13 Other-exports probe\n${needle}`);
    expect(mutated).not.toBe(original);
    withSrc({ [path]: mutated }, () => {
      const drifted = renderApiReference();
      expect(checkWouldFail(drifted)).toBe(true);
      expect(drifted).not.toContain('### Other exports');
      expect(drifted).toContain('### S13 Other-exports probe');
      const section = sectionAfter(drifted, 'S13 Other-exports probe');
      expect(section).toContain('| `UniversalTensor` |');
    });
    expect(committedPage()).toContain('### Other exports');
    expect(renderApiReference()).toBe(committedPage());
  });
});
