/**
 * @public ↔ src/index.ts invariant guard.
 *
 * Walks every src/**\/*.ts file, parses out @public-tagged declarations,
 * and asserts each is reachable from the public surface. "Reachable" means:
 *
 *   (a) Re-exported by src/index.ts directly (named or wildcard), OR
 *   (b) Reachable via a package.json subpath export (currently only
 *       ./numerical/mathts-engine per the `exports` field).
 *
 * Parsing approach: simple line-based scan. The in-tree convention is
 * "every @public declaration is followed by `export ... NAME` within ~5 lines".
 *
 * Fails informatively naming the offending file:line on mismatch.
 *
 * v0.7.1 Phase 1 Task 1.1 — pre-commit guard test.
 *
 * @module tests/api/public-tag-vs-index-invariant
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { namedReExports, namespaceReExports } from './_public-surface-parse.js';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const INDEX_TS = join(SRC_DIR, 'index.ts');
const PACKAGE_JSON = join(REPO_ROOT, 'package.json');

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function walkTs(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTs(full, results);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Parse @public-tagged symbols from a source file
// ---------------------------------------------------------------------------

interface PublicDecl {
  name: string;
  file: string;
  line: number;
}

/**
 * Scan a file for @public-tagged declarations.
 * Strategy: look for `@public` in a JSDoc block, then find the next
 * `export (const|function|class|interface|type|enum) NAME` line within
 * the next 8 lines. Capture NAME.
 */
function parsePublicDecls(filePath: string): PublicDecl[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: PublicDecl[] = [];

  const exportDeclRe = /^\s*export\s+(?:(?:abstract|async|declare)\s+)*(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('@public')) continue;

    // Search the next 8 lines for an export declaration
    for (let j = i + 1; j < Math.min(i + 9, lines.length); j++) {
      const m = exportDeclRe.exec(lines[j]);
      if (m) {
        results.push({
          name: m[1],
          file: relative(REPO_ROOT, filePath),
          line: j + 1, // 1-indexed
        });
        break;
      }
      // Stop scanning forward if we hit another JSDoc open
      if (lines[j].trim().startsWith('/**') && j !== i + 1) break;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Parse the public surface from src/index.ts
// ---------------------------------------------------------------------------

interface PublicSurface {
  /** Symbols re-exported by name from src/index.ts. */
  namedSymbols: Set<string>;
  /**
   * Source module paths (relative to src/) whose entire export namespace
   * is re-exported via `export * from`. Symbols from these files are
   * covered by wildcard.
   */
  wildcardSourcePaths: Set<string>;
}

/**
 * Strip `// line comments` and `/* block comments *\/` from a string.
 * Used to clean up brace-block content before splitting on commas.
 */
function stripComments(s: string): string {
  // Block comments first
  let result = s.replace(/\/\*[\s\S]*?\*\//g, '');
  // Then line comments
  result = result.replace(/\/\/[^\n]*/g, '');
  return result;
}

/**
 * Parse all named re-exported symbols from a file's content.
 * Handles both single-line and multi-line `export { ... } from '...'`
 * and `export type { ... } from '...'` forms.
 */
function parseIndexSurface(indexPath: string): PublicSurface {
  const content = readFileSync(indexPath, 'utf-8');
  const namedSymbols = new Set<string>();
  const wildcardSourcePaths = new Set<string>();

  // ── Named re-exports (single and multi-line) ────────────────────────────
  // Match: export [type] { ... } from '...'
  // The [\s\S]*? handles multi-line blocks.
  const namedReExportRe = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"][^'"]+['"]/g;
  let m: RegExpExecArray | null;

  while ((m = namedReExportRe.exec(content)) !== null) {
    const body = stripComments(m[1]);
    const items = body.split(',').map(s => s.trim()).filter(Boolean);
    for (const item of items) {
      // Strip leading `type ` if present
      const stripped = item.replace(/^type\s+/, '').trim();
      // Handle `X as Y` → take X (the original name)
      const name = stripped.split(/\s+as\s+/)[0].trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
        namedSymbols.add(name);
      }
    }
  }

  // ── Wildcard re-exports ─────────────────────────────────────────────────
  // Match: export * from '...'
  const wildcardReExportRe = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = wildcardReExportRe.exec(content)) !== null) {
    const raw = m[1];
    const normalized = raw.replace(/^\.\//, '').replace(/\.js$/, '');
    wildcardSourcePaths.add(normalized);
  }

  // ── Namespace facades ───────────────────────────────────────────────────
  // Match: export * as NS from '...'. The regexes above do NOT see this form,
  // so without this step a namespace facade's symbols would be checked by
  // nothing. The facade's own NAMED re-exports are what it makes public; the
  // reverse check (each one is @public where declared) lives in
  // namespace-facade-invariant.test.ts. A wildcard inside a facade is refused
  // there, so only named re-exports are added here.
  for (const { specifier } of namespaceReExports(content)) {
    const facadePath = resolve(dirname(indexPath), specifier.replace(/\.js$/, '.ts'));
    if (!existsSync(facadePath)) continue;
    for (const { name } of namedReExports(readFileSync(facadePath, 'utf-8'))) namedSymbols.add(name);
  }

  return { namedSymbols, wildcardSourcePaths };
}

// ---------------------------------------------------------------------------
// Parse subpath-export source modules from package.json
// ---------------------------------------------------------------------------

/**
 * Returns a set of src-relative module paths (without .ts extension) that are
 * reachable via package.json subpath exports (e.g., numerical/mathts-engine).
 */
function parseSubpathReachable(pkgPath: string): Set<string> {
  const reachable = new Set<string>();
  if (!existsSync(pkgPath)) return reachable;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  if (!pkg.exports) return reachable;

  for (const value of Object.values(pkg.exports)) {
    const candidates: string[] = typeof value === 'string'
      ? [value as string]
      : Object.values(value as Record<string, string>).filter((v): v is string => typeof v === 'string');
    for (const c of candidates) {
      // "./dist/numerical/mathts-engine.js" → "numerical/mathts-engine"
      const m = c.match(/^\.\/dist\/(.+)\.js$/);
      if (m) reachable.add(m[1]);
    }
  }

  return reachable;
}

// ---------------------------------------------------------------------------
// Pre-v0.7.1 accepted drift (known @public tags not yet surfaced in index.ts)
//
// These are legitimate pre-existing @public-tagged symbols that were present
// in the codebase before v0.7.1 but not yet promoted to src/index.ts. They
// are tracked here so the guard doesn't block on pre-existing drift. Future
// phases (v0.7.2+) will address each cluster:
//
//   - bridges/equations/be-{13,19,39,50,53,54}: per-bridge structural nodes
//     (BE-NN *_STRUCTURAL, *_INPUTS evaluator types) — not consumer-API;
//     re-export decision deferred to per-bridge Phase decisions
//   - bridges/perihelion-precession-labeled: evaluator variant — re-export
//     deferred (labeled-tensor API still stabilising)
//   - dimensional/curvature-composite: CurvatureKind, CurvatureCompositeNode
//     (v0.6.0 shipped but not re-exported; M-2 companion from v0.7.1)
//   - dimensional/curvature: *ValidationResult types (re-export deferred)
//   - dimensional/killing-validators, metric-validators, stress-energy-validators:
//     structural node types promoted in v0.6.0 but not surfaced publicly yet
//   - dimensional/tensor.ts scale(): utility helper (not consumer-facing)
//   - numerical/be37-covariant-eikonal: input/result types
//   - numerical/errors: GL4ConvergenceError (newly tagged, not yet surfaced)
//   - numerical/null-ic: reconstructNullPr (internal utility)
//   - numerical/painleve-gullstrand-metric: M-2 companion; deferred to Phase 2
//   - numerical/weyl-lowering: computeWeylTensor (v0.6.0 curvature, not surfaced)
//
// DO NOT expand this list without a Phase N design doc entry for each addition.
// TO FIX a symbol: remove it from this list AND add the re-export to src/index.ts.
// ---------------------------------------------------------------------------

const PRE_V071_ACCEPTED_DRIFT = new Set<string>([
  // bridges/equations/be-13-einstein-trace.ts
  'BE13_STRESS_ENERGY_NODE',
  'BE13_T_TRACE_NODE',
  // bridges/equations/be-19-quantum-bounce.ts
  'BE19_LQC_FRIEDMANN_STRUCTURAL',
  // bridges/equations/be-39-asymptotic-safety.ts
  'BE39_COUPLING_G',
  'BE39_COUPLING_LAMBDA',
  'BE39_BETA_G_STRUCTURAL',
  'BE39_BETA_LAMBDA_STRUCTURAL',
  // bridges/equations/be-50-wheeler-feynman.ts
  'BE50_TIME_SYMMETRY_PREDICATE_STRUCTURAL',
  // bridges/equations/be-53-yang-mills-beta.ts
  'BE53_COUPLING_G',
  'BE53_BETA_G_STRUCTURAL',
  'YangMillsBetaInputs',
  'evaluateYangMillsBeta',
  'computeB0',
  // bridges/equations/be-54-randall-sundrum-brane.ts
  'BRANE_FRIEDMANN_RHS',
  'RandallSundrumInputs',
  'evaluateRandallSundrumH2',
  'validateBraneFriedmannDimensions',
  'BE54_BRANE_FRIEDMANN_STRUCTURAL',
  // bridges/perihelion-precession-labeled.ts
  'evaluatePerihelionPrecessionLabeled',
  // dimensional/curvature-composite.ts
  'CurvatureKind',
  'CurvatureKindSpec',
  'CURVATURE_KIND_REGISTRY',
  'CurvatureCompositeNode',
  // dimensional/curvature.ts
  'RicciTensorValidationResult',
  'EinsteinTensorValidationResult',
  'BianchiResidualValidationResult',
  // dimensional/killing-validators.ts
  'KillingVectorNode',
  'ConservedChargeNode',
  // dimensional/metric-validators.ts
  'MetricTensorValidationResult',
  'KroneckerDeltaValidationResult',
  'PartialDerivativeValidationResult',
  // dimensional/stress-energy-validators.ts
  'StressEnergyTensorNode',
  'CosmologicalConstantNode',
  // dimensional/tensor.ts
  'scale',
  // numerical/be37-covariant-eikonal.ts
  'BE37CovariantEikonalInputs',
  'BE37CovariantEikonalResult',
  // numerical/errors.ts
  'GL4ConvergenceError',
  // numerical/null-ic.ts
  'reconstructNullPr',
  // numerical/painleve-gullstrand-metric.ts (M-2, deferred)
  'painleveGullstrandGFn',
  'painleveGullstrandGInverseFn',
  // numerical/weyl-lowering.ts
  'computeWeylTensor',
]);

// ---------------------------------------------------------------------------
// Main invariant test
// ---------------------------------------------------------------------------

describe('@public ↔ src/index.ts surface invariant (v0.7.1 Phase 1 guard)', () => {
  it('every @public-tagged declaration in src/ is reachable from the public surface', () => {
    // 1. Collect all @public declarations from src/
    const allSrcFiles = walkTs(SRC_DIR);
    const allPublicDecls: PublicDecl[] = [];
    for (const f of allSrcFiles) {
      allPublicDecls.push(...parsePublicDecls(f));
    }

    // 2. Parse the public surface
    const { namedSymbols, wildcardSourcePaths } = parseIndexSurface(INDEX_TS);

    // 3. Determine which src-relative module paths are subpath-reachable
    const subpathReachable = parseSubpathReachable(PACKAGE_JSON);

    // 4. Build the wildcard-covered module set
    const wildcardCoveredModules = new Set<string>([
      ...wildcardSourcePaths,
      ...subpathReachable,
    ]);

    // 5. Check each @public decl (skipping pre-v0.7.1 accepted drift)
    const violations: string[] = [];

    for (const decl of allPublicDecls) {
      // Skip symbols with known pre-existing drift (documented above)
      if (PRE_V071_ACCEPTED_DRIFT.has(decl.name)) continue;

      // src-relative path without extension: "src/dimensional/tensor-trace"
      // Normalize Windows backslashes — node:path's relative() uses OS-native
      // separators, but package.json subpath exports always use forward slashes,
      // so the wildcard-set comparison must work in forward-slash space.
      const srcRelNoExt = decl.file.replace(/\.ts$/, '').replace(/\\/g, '/');
      // module-relative path: "dimensional/tensor-trace"
      const moduleRelNoExt = srcRelNoExt.replace(/^src\//, '');

      const coveredByNamed = namedSymbols.has(decl.name);
      const coveredByWildcard = wildcardCoveredModules.has(moduleRelNoExt);

      if (!coveredByNamed && !coveredByWildcard) {
        violations.push(`  ${decl.file}:${decl.line} — @public symbol "${decl.name}" is not reachable from src/index.ts or any package.json subpath export`);
      }
    }

    if (violations.length > 0) {
      const msg = [
        `${violations.length} @public-tagged symbol(s) are NOT reachable from the public surface:`,
        '',
        ...violations,
        '',
        'Fix: either re-export each symbol from src/index.ts (or a package.json subpath),',
        'or change the @public tag to @internal if the symbol is intentionally non-public,',
        'or add it to PRE_V071_ACCEPTED_DRIFT with a Phase N tracking comment.',
      ].join('\n');
      expect.fail(msg);
    }

    // Also assert we found at least some @public decls (guard against scanner regression)
    expect(allPublicDecls.length, 'Scanner must find at least 10 @public declarations in src/').toBeGreaterThanOrEqual(10);
  });
});
