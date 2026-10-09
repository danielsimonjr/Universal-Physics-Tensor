#!/usr/bin/env npx tsx

/**
 * Generic Dependency Graph Generator
 *
 * Scans a TypeScript codebase and generates:
 * - docs/architecture/DEPENDENCY_GRAPH.md (human-readable)
 * - docs/architecture/dependency-graph.json (machine-readable)
 * - docs/architecture/dependency-graph.yaml (compact, ~40% smaller than JSON)
 *
 * Usage: npm run docs:deps -- [--root=<path>]
 *
 * This tool is generic and does not depend on any codebase-specific functions.
 * It dynamically discovers the project structure from the filesystem.
 * The project root defaults to the current working directory; pass
 * `--root=<path>` to scan a different project.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dump as dumpYaml } from 'js-yaml';
import { basename, dirname, join, relative, resolve as resolvePathAbs } from 'path';
import { renderDuplicateOwners } from '../duplicate-owner-scans.js';
import { isTracked, trackedFiles } from './tracked-files.js';
import {
  buildApiSurfaceReport,
  createTsResolver,
  DEFAULT_STABILITY_TAGS,
  extractExportDetails,
  resolveSurface,
} from './api-surface.js';

// Types
interface Dependency {
  file: string;
  imports: string[];
  reExport?: boolean;
  typeOnly?: boolean;  // Track type-only imports
  sideEffect?: boolean;  // Bare `import './x.js';` (no bindings) — distinguishes it from `import * as`
}

interface ExternalDependency {
  package: string;
  imports: string[];
}

interface NodeDependency {
  module: string;
  imports: string[];
}

interface FileExports {
  named: string[];
  default: string | null;
  types: string[];
  interfaces: string[];
  enums: string[];
  classes: string[];
  functions: string[];
  constants: string[];
  reExported: string[];  // Track re-exported symbols
}

interface ParsedFile {
  path: string;
  name: string;
  externalDependencies: ExternalDependency[];
  nodeDependencies: NodeDependency[];
  internalDependencies: Dependency[];
  exports: FileExports;
  description: string | null;
}

interface DependencyMatrix {
  [path: string]: {
    importsFrom: string[];
    exportsTo: string[];
  };
}

interface Statistics {
  totalTypeScriptFiles: number;
  totalModules: number;
  totalLinesOfCode: number;
  totalExports: number;
  totalClasses: number;
  totalInterfaces: number;
  totalFunctions: number;
  totalTypeGuards: number;
  totalEnums: number;
  totalConstants: number;
  totalReExports: number;
  totalTypeOnlyImports: number;
  runtimeCircularDeps: number;  // Excludes type-only cycles
  typeOnlyCircularDeps: number; // Type-only cycles (not runtime issues)
  unusedFilesCount: number;
  unusedExportsCount: number;
}

interface UnusedExport {
  file: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'enum' | 'other';
}

interface UnusedAnalysis {
  unusedFiles: string[];
  unusedExports: UnusedExport[];
}

interface ModuleMap {
  [moduleName: string]: {
    [filePath: string]: ParsedFile;
  };
}

interface PackageJson {
  name: string;
  version: string;
  /**
   * v0.6.1 Phase 3 Task 3.2: parse `exports` to mark subpath-resolved
   * source files as implicitly reachable. Each value can be a string,
   * an object with conditional keys (`types`/`import`/`default`), or
   * nested. The generator only needs the resolved `.js` file path.
   */
  exports?: Record<string, string | Record<string, string>>;
}

// CLI options interface
interface CLIOptions {
  root: string;
  includeTests: boolean;
  /** Opt-in: write the per-export API-surface report to this file (see api-surface.ts). */
  apiSurface: string | null;
  /** Entry file for the API surface, relative to the root. */
  apiEntry: string;
  stabilityTags: readonly string[];
}

// Constants - support CLI argument or current working directory for portability
function parseCliOptions(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    root: process.cwd(),
    includeTests: false,
    apiSurface: null,
    apiEntry: 'src/index.ts',
    stabilityTags: DEFAULT_STABILITY_TAGS,
  };

  for (const arg of args) {
    if (arg.startsWith('--root=')) {
      options.root = arg.slice(7);
    } else if (arg === '--include-tests' || arg === '-t') {
      options.includeTests = true;
    } else if (arg.startsWith('--api-surface=')) {
      options.apiSurface = arg.slice('--api-surface='.length);
    } else if (arg.startsWith('--api-entry=')) {
      options.apiEntry = arg.slice('--api-entry='.length);
    } else if (arg.startsWith('--stability-tags=')) {
      options.stabilityTags = arg.slice('--stability-tags='.length).split(',').map((t) => t.trim()).filter(Boolean);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Dependency Graph Generator

Usage:
  create-dependency-graph [options] [project-root]

Options:
  --root=<path>      Project root directory (default: current directory)
  --include-tests    Include test files in dependency analysis
  -t                 Short form of --include-tests
  --api-surface=<file>
                     Also write a per-export API-surface report (JSON) to <file>:
                     signature, async, stability tag, JSDoc summary, and the
                     entry file's re-export-resolved public surface. Opt-in;
                     the standard outputs are unchanged by it.
  --api-entry=<path> Entry file for --api-surface (default: src/index.ts)
  --stability-tags=a,b,c
                     Tags counted as stability markers (default:
                     public,internal,experimental,beta,alpha)
  --help, -h         Show this help

Examples:
  create-dependency-graph                         # Use current directory
  create-dependency-graph ./my-project            # Specify project path
  create-dependency-graph --include-tests         # Include test file analysis
  create-dependency-graph --root=C:/projects/my-app -t
`);
      process.exit(0);
    } else if (!arg.startsWith('-') && existsSync(arg)) {
      // First non-flag argument is the project root
      options.root = arg;
    }
  }

  return options;
}

function getProjectRoot(): string {
  return parseCliOptions().root;
}

const ROOT_DIR = getProjectRoot();
const SRC_DIR = join(ROOT_DIR, 'src');
// The git index, not the disk: an untracked scratch file must not enter the committed docs.
const TRACKED = trackedFiles(ROOT_DIR);
const OUTPUT_DIR = join(ROOT_DIR, 'docs', 'architecture');

// Read package.json for version and name
let packageJson: PackageJson = { name: 'unknown', version: '0.0.0' };
try {
  packageJson = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8')) as PackageJson;
} catch {
  console.warn('Warning: Could not read package.json, using defaults');
}

/**
 * Recursively get all TypeScript files in a directory
 */
function getAllTsFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) {
    return files;
  }

  // Sorted: readdirSync returns filesystem order, which is roughly alphabetical
  // on NTFS but hash order on ext4. Unsorted, the same repository produced a
  // 506-line reordering diff between a Windows run and the Linux CI runner --
  // enough to make the docs-fresh gate permanently red for no real drift.
  const entries = readdirSync(dir).sort();

  for (const entry of entries) {
    // Skip node_modules directories
    if (entry === 'node_modules') {
      continue;
    }

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts') && isTracked(TRACKED, fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Recursively get all test files (.test.ts, .spec.ts) in a directory
 */
function getAllTestFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) {
    return files;
  }

  // Sorted: readdirSync returns filesystem order, which is roughly alphabetical
  // on NTFS but hash order on ext4. Unsorted, the same repository produced a
  // 506-line reordering diff between a Windows run and the Linux CI runner --
  // enough to make the docs-fresh gate permanently red for no real drift.
  const entries = readdirSync(dir).sort();

  for (const entry of entries) {
    // Skip node_modules directories
    if (entry === 'node_modules') {
      continue;
    }

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getAllTestFiles(fullPath, files);
    } else if ((entry.endsWith('.test.ts') || entry.endsWith('.spec.ts')) && isTracked(TRACKED, fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Test coverage analysis interfaces
interface TestCoverageAnalysis {
  sourceFiles: string[];
  testFiles: ParsedFile[];
  /** source file -> test files that reach it DIRECTLY or through a barrel / side-effect import (traced). */
  coverageMap: Map<string, string[]>;
  /** source file -> test files that import it DIRECTLY (a `dist/` import resolves to its `src/` file). */
  directMap: Map<string, string[]>;
  /** Reached directly or traced. */
  testedFiles: string[];
  /** Imported directly by at least one test. Always a subset of `testedFiles`. */
  directlyTestedFiles: string[];
  /** Reached neither way. */
  untestedFiles: string[];
  testToSourceMap: Map<string, string[]>; // test file -> source files it imports
}

// Re-export map: barrel file -> source files it re-exports from
type ReExportMap = Map<string, Set<string>>;

/**
 * Build a map of barrel files to the source files they re-export from.
 * This allows tracing imports through barrel files (index.ts) to find
 * the actual source files being tested.
 */
function buildReExportMap(sourceFiles: ParsedFile[]): ReExportMap {
  const reExportMap: ReExportMap = new Map();
  const sourceFilePaths = new Set(sourceFiles.map(f => f.path));

  // Find all barrel files (files with re-exports)
  for (const file of sourceFiles) {
    const reExportedSources = new Set<string>();

    for (const dep of file.internalDependencies) {
      if (dep.reExport) {
        // This file re-exports from another file
        const resolved = resolvePath(file.path, dep.file);
        if (sourceFilePaths.has(resolved)) {
          reExportedSources.add(resolved);
        }
      }
    }

    if (reExportedSources.size > 0) {
      reExportMap.set(file.path, reExportedSources);
    }
  }

  // Recursively expand re-exports (handle chains like types/index.ts -> types/types.ts)
  let changed = true;
  while (changed) {
    changed = false;
    for (const [barrelPath, sources] of reExportMap) {
      const expanded = new Set(sources);
      for (const source of sources) {
        // If a source is itself a barrel, add its sources too
        const nestedSources = reExportMap.get(source);
        if (nestedSources) {
          for (const nested of nestedSources) {
            if (!expanded.has(nested)) {
              expanded.add(nested);
              changed = true;
            }
          }
        }
      }
      reExportMap.set(barrelPath, expanded);
    }
  }

  return reExportMap;
}

/**
 * Get all source files that are ultimately imported through a barrel file chain.
 * Given an import to a barrel file, returns all source files it re-exports.
 */
function traceReExports(importedPath: string, reExportMap: ReExportMap): Set<string> {
  const result = new Set<string>();
  result.add(importedPath); // Always include the directly imported file

  const sources = reExportMap.get(importedPath);
  if (sources) {
    for (const source of sources) {
      result.add(source);
    }
  }

  return result;
}

/**
 * Analyze test coverage by mapping source files to test files.
 *
 * Two coverages are kept apart. DIRECT: a test imports the file itself (an import of
 * `dist/<p>.js` resolves to `src/<p>.ts`, see `resolvePath`). TRACED: direct, plus every file
 * reached through a barrel re-export (`export … from`) or a bare side-effect import. A barrel
 * import credits every module behind the barrel, so the traced count alone over-states what
 * the suite exercises; the report states both.
 */
function analyzeTestCoverage(sourceFiles: ParsedFile[], testFiles: ParsedFile[]): TestCoverageAnalysis {
  const sourceFilePaths = new Set(sourceFiles.map(f => f.path));
  const coverageMap = new Map<string, string[]>();
  const directMap = new Map<string, string[]>();
  const testToSourceMap = new Map<string, string[]>();

  // Build re-export map to trace imports through barrel files
  const reExportMap = buildReExportMap(sourceFiles);
  const sourceByPath = new Map(sourceFiles.map(f => [f.path, f]));

  // Initialize coverage maps with empty arrays
  for (const source of sourceFiles) {
    coverageMap.set(source.path, []);
    directMap.set(source.path, []);
  }

  // Helper to add (traced) test coverage for a source file
  const addCoverage = (sourcePath: string, testPath: string, importedSources: string[]) => {
    if (!importedSources.includes(sourcePath)) {
      importedSources.push(sourcePath);
    }
    const tests = coverageMap.get(sourcePath) || [];
    if (!tests.includes(testPath)) {
      tests.push(testPath);
      coverageMap.set(sourcePath, tests);
    }
  };

  // A direct import is also traced coverage.
  const addDirect = (sourcePath: string, testPath: string, importedSources: string[]) => {
    addCoverage(sourcePath, testPath, importedSources);
    const tests = directMap.get(sourcePath) || [];
    if (!tests.includes(testPath)) {
      tests.push(testPath);
      directMap.set(sourcePath, tests);
    }
  };

  // Transitive SIDE-EFFECT coverage: a covered file that bare-imports
  // (`import './x.js';`) another module loads and exercises it — the CLI
  // command registry is exactly this shape (a test imports `main.ts`, which
  // side-effect-imports `commands/index.ts`, which side-effect-imports every
  // command module). Follow ONLY `sideEffect` edges — never an `import * as`
  // namespace binding of a barrel (e.g. `main.ts`'s `import * as api from
  // '../cli-api.js'`), which would leak coverage through cli-api's whole
  // re-export closure and falsely mark the library as tested.
  const creditSideEffectClosure = (
    fromPath: string, testPath: string, importedSources: string[], visited: Set<string>,
  ) => {
    const pf = sourceByPath.get(fromPath);
    if (!pf) return;
    for (const dep of pf.internalDependencies) {
      if (!dep.sideEffect) continue;
      const target = resolvePath(fromPath, dep.file);
      if (!sourceFilePaths.has(target) || visited.has(target)) continue;
      visited.add(target);
      addCoverage(target, testPath, importedSources);
      creditSideEffectClosure(target, testPath, importedSources, visited);
    }
  };

  // Analyze each test file to see which source files it imports
  for (const testFile of testFiles) {
    const importedSources: string[] = [];

    for (const dep of testFile.internalDependencies) {
      // Resolve the import path relative to the test file
      const resolvedPath = resolvePath(testFile.path, dep.file);

      // Check if it's a source file (in src/)
      if (sourceFilePaths.has(resolvedPath)) {
        // Add the directly imported file
        addDirect(resolvedPath, testFile.path, importedSources);

        // Trace through barrel re-exports to find underlying source files
        const reExportedSources = traceReExports(resolvedPath, reExportMap);
        for (const reExportedPath of reExportedSources) {
          if (sourceFilePaths.has(reExportedPath)) {
            addCoverage(reExportedPath, testFile.path, importedSources);
          }
        }

        // Trace through bare side-effect imports (the command-registry pattern)
        creditSideEffectClosure(resolvedPath, testFile.path, importedSources, new Set());
      }

      // Also check without .ts extension variations
      const withoutTs = resolvedPath.replace(/\.ts$/, '');
      const withTs = withoutTs + '.ts';
      if (sourceFilePaths.has(withTs)) {
        addDirect(withTs, testFile.path, importedSources);

        // Trace through barrel re-exports
        const reExportedSources = traceReExports(withTs, reExportMap);
        for (const reExportedPath of reExportedSources) {
          if (sourceFilePaths.has(reExportedPath)) {
            addCoverage(reExportedPath, testFile.path, importedSources);
          }
        }

        // Trace through bare side-effect imports (the command-registry pattern)
        creditSideEffectClosure(withTs, testFile.path, importedSources, new Set());
      }
    }

    testToSourceMap.set(testFile.path, importedSources);
  }

  // Determine tested and untested files
  const testedFiles: string[] = [];
  const directlyTestedFiles: string[] = [];
  const untestedFiles: string[] = [];

  for (const [sourcePath, tests] of coverageMap) {
    if (tests.length > 0) {
      testedFiles.push(sourcePath);
    } else {
      untestedFiles.push(sourcePath);
    }
    if ((directMap.get(sourcePath) ?? []).length > 0) {
      directlyTestedFiles.push(sourcePath);
    }
  }

  return {
    sourceFiles: sourceFiles.map(f => f.path),
    testFiles,
    coverageMap,
    directMap,
    testedFiles,
    directlyTestedFiles,
    untestedFiles,
    testToSourceMap,
  };
}

/**
 * Parse a TypeScript file for imports and exports.
 *
 * `isTestFile` gates the dynamic-`import()` scan (post-v0.32.0 fix, see below) —
 * it is only enabled for test files so a source file's dynamic `import()`
 * (e.g. lazy-loading an optional peer, or `engine-registry.ts` lazily
 * loading `./mathts-engine.js`) never gains a new structural graph edge
 * here, which would perturb the dependency graph's circular-dependency and
 * import-edge counts. Test files carry no structural-graph obligations, so
 * crediting their dynamic imports only affects the coverage/unused reports.
 */
function parseFile(filePath: string, isTestFile: boolean = false): ParsedFile {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  const result: ParsedFile = {
    path: relativePath,
    name: basename(filePath, '.ts'),
    externalDependencies: [],
    nodeDependencies: [],
    internalDependencies: [],
    exports: {
      named: [],
      default: null,
      types: [],
      interfaces: [],
      enums: [],
      classes: [],
      functions: [],
      constants: [],
      reExported: []
    },
    description: extractDescription(content)
  };

  // Parse imports - enhanced to detect type-only imports
  // Matches: import type { ... }, import { type X, Y }, import X from, import * as X from
  const importRegex = /import\s+(type\s+)?(?:(?:{([^}]+)}|(\w+)|\*\s+as\s+(\w+))(?:\s*,\s*(?:{([^}]+)}|(\w+)))?)\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  const nodeBuiltins = ['fs', 'path', 'url', 'crypto', 'util', 'stream', 'events', 'buffer', 'os', 'child_process', 'http', 'https', 'net', 'dns', 'tls', 'zlib', 'readline', 'assert', 'cluster', 'dgram', 'domain', 'inspector', 'module', 'perf_hooks', 'process', 'punycode', 'querystring', 'repl', 'string_decoder', 'timers', 'tty', 'v8', 'vm', 'worker_threads'];

  while ((match = importRegex.exec(content)) !== null) {
    const isTypeOnlyImport = !!match[1]; // "import type" prefix
    const namedImports = match[2] || match[5] || '';
    const defaultImport = match[3] || match[6] || '';
    const namespaceImport = match[4] || '';
    const source = match[7];

    const imports: string[] = [];
    let hasRuntimeImport = !isTypeOnlyImport;

    if (namedImports) {
      // post-v0.32.0 fix: strip comments before splitting on commas — mirrors
      // the C-9 fix already applied to export-side parsing
      // (splitBraceSymbols/stripBraceBlockComments below). Without this, an
      // interior line comment inside a multi-line named-import block (e.g.
      // src/numerical/lowering.ts's import of `lowerBianchiResidual` from
      // curvature-lowering-helpers.js, preceded by a two-line `// v0.6.1
      // Phase 2: ...` comment) gets glued onto the following symbol name by
      // the naive comma-split, producing a garbled multi-line string that
      // never matches the real export name — silently CORRUPTING (not
      // dropping) that one import, which then falsely reports the export as
      // unused. The trailing identifier-shape filter is a safety net for
      // any leftover comment fragments.
      const importItems = stripBraceBlockComments(namedImports).split(',').map(s => s.trim());
      for (const item of importItems) {
        // Check for inline type imports: import { type Foo, Bar }
        const isInlineType = item.startsWith('type ');
        const name = item.replace(/^type\s+/, '').split(' as ')[0].trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) {
          imports.push(name);
          // If any import is NOT a type, it's a runtime import
          if (!isInlineType && !isTypeOnlyImport) {
            hasRuntimeImport = true;
          }
        }
      }
    }
    if (defaultImport) imports.push(defaultImport);
    if (namespaceImport) imports.push(`* as ${namespaceImport}`);

    const typeOnly = isTypeOnlyImport || !hasRuntimeImport;

    if (source.startsWith('.')) {
      result.internalDependencies.push({
        file: source,
        imports: imports,
        typeOnly: typeOnly
      });
    } else if (source.startsWith('node:') || nodeBuiltins.includes(source.split('/')[0])) {
      result.nodeDependencies.push({
        module: source.replace('node:', ''),
        imports: imports
      });
    } else {
      result.externalDependencies.push({
        package: source,
        imports: imports
      });
    }
  }

  // v0.7.1 M-14 fix: parse side-effect-only imports (`import './foo.js'`).
  // Without this, files imported only for their side effects (e.g.,
  // `src/core/regime-rule-install.ts` and `src/core/regimes-builtins.ts`
  // via `import './core/regime-rule-install.js'` in src/index.ts) are
  // falsely reported as "unused files" in unused-analysis.md.
  //
  // post-v0.32.0 fix: the trailing `(?:\/\/.*)?` tolerates an end-of-line
  // comment after the statement (e.g. `import '../../src/core/
  // regimes-builtins.js'; // Side-effect: registers 18 built-ins`, as
  // written in tests/core/regime-registry.test.ts and its sibling test
  // files). The original regex's bare `$` anchor required nothing but
  // whitespace after the import, so any commented side-effect import line
  // was skipped entirely — falsely reporting the imported module as
  // untested even though a test file exercises it.
  const sideEffectImportRegex = /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*(?:\/\/.*)?$/mg;
  while ((match = sideEffectImportRegex.exec(content)) !== null) {
    const source = match[1];
    if (source.startsWith('.')) {
      // Only add if not already tracked (avoid duplicates with the main import loop)
      const alreadyTracked = result.internalDependencies.some(d => d.file === source);
      if (!alreadyTracked) {
        result.internalDependencies.push({
          file: source,
          imports: ['*'], // Side-effect import: treat as wildcard (all exports considered used)
          sideEffect: true, // bare `import './x.js';` — the coverage tracer follows these transitively
        });
      }
    }
  }

  // post-v0.32.0 fix: parse dynamic `import(...)` expressions in TEST files
  // (e.g. the top-level `await import('../../src/numerical/
  // formula-mathts.js')` a test uses to probe an optional-peer-gated
  // module). Without this, a module exercised only via a dynamic import
  // (never a static `from` import or a bare side-effect import) is
  // falsely reported as untested/unused. Scoped to `isTestFile` — see the
  // function-level doc comment for why source files are excluded.
  if (isTestFile) {
    const dynamicImportRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const source = match[1];
      if (source.startsWith('.')) {
        const alreadyTracked = result.internalDependencies.some(d => d.file === source);
        if (!alreadyTracked) {
          result.internalDependencies.push({
            file: source,
            imports: ['*'], // Dynamic import: treat as wildcard, same as a side-effect import
          });
        }
      }
    }
  }

  // Parse exports
  // Named exports: export { foo, bar }
  const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const exports = splitBraceSymbols(match[1]);
    result.exports.named.push(...exports);
  }

  // Export declarations
  // export const/let/var
  const constExportRegex = /export\s+(?:const|let|var)\s+(\w+)/g;
  while ((match = constExportRegex.exec(content)) !== null) {
    result.exports.constants.push(match[1]);
    result.exports.named.push(match[1]);
  }

  // export function
  const funcExportRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  while ((match = funcExportRegex.exec(content)) !== null) {
    result.exports.functions.push(match[1]);
    result.exports.named.push(match[1]);
  }

  // export class
  const classExportRegex = /export\s+class\s+(\w+)/g;
  while ((match = classExportRegex.exec(content)) !== null) {
    result.exports.classes.push(match[1]);
    result.exports.named.push(match[1]);
  }

  // export interface
  const interfaceExportRegex = /export\s+interface\s+(\w+)/g;
  while ((match = interfaceExportRegex.exec(content)) !== null) {
    result.exports.interfaces.push(match[1]);
    result.exports.types.push(match[1]);
  }

  // export type
  const typeExportRegex = /export\s+type\s+(\w+)/g;
  while ((match = typeExportRegex.exec(content)) !== null) {
    result.exports.types.push(match[1]);
  }

  // export enum
  const enumExportRegex = /export\s+enum\s+(\w+)/g;
  while ((match = enumExportRegex.exec(content)) !== null) {
    result.exports.enums.push(match[1]);
    result.exports.named.push(match[1]);
  }

  // export default
  const defaultExportRegex = /export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)?/;
  const defaultMatch = content.match(defaultExportRegex);
  if (defaultMatch) {
    result.exports.default = defaultMatch[1] || 'default';
  }

  // Re-exports: export * from
  const reExportAllRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportAllRegex.exec(content)) !== null) {
    result.internalDependencies.push({
      file: match[1],
      imports: ['*'],
      reExport: true
    });
    result.exports.reExported.push(`* from ${match[1]}`);
  }

  // Re-exports: export * as <name> from. The same dependency as `export * from`.
  // Without this, `src/index.ts`'s `export * as atlas from './atlas/public.js'`
  // does not count as an import, and unused-analysis.md lists `public.ts`.
  const reExportNamespaceRegex = /export\s+\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportNamespaceRegex.exec(content)) !== null) {
    result.internalDependencies.push({
      file: match[2],
      imports: ['*'],
      reExport: true
    });
    result.exports.named.push(match[1]);
    result.exports.reExported.push(`* as ${match[1]} from ${match[2]}`);
  }

  // Re-exports: export { foo } from
  // v0.7.1 M-13 fix: also match `export type { ... } from` (type-only named re-exports).
  // Without this, type-only re-exports from src/index.ts are not tracked as "imported"
  // by the source module, causing ~30 false-positive "unused" findings in unused-analysis.md.
  const reExportNamedRegex = /export\s+(?:type\s+)?{\s*([^}]+)\s*}\s*from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportNamedRegex.exec(content)) !== null) {
    const exports = splitBraceSymbols(match[1]);
    result.internalDependencies.push({
      file: match[2],
      imports: exports,
      reExport: true
    });
    result.exports.named.push(...exports);
    result.exports.reExported.push(...exports);
  }

  // Re-exports: export type * from (type-only re-exports)
  const reExportTypeAllRegex = /export\s+type\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportTypeAllRegex.exec(content)) !== null) {
    result.internalDependencies.push({
      file: match[1],
      imports: ['*'],
      reExport: true,
      typeOnly: true
    });
    result.exports.reExported.push(`type * from ${match[1]}`);
  }

  // Dedupe exports
  result.exports.named = [...new Set(result.exports.named)];
  result.exports.types = [...new Set(result.exports.types)];
  result.exports.reExported = [...new Set(result.exports.reExported)];

  return result;
}

/**
 * Strip line (`//`) and block (`/* *\/`) comments from the interior of an
 * `export { ... }` / `import { ... }` brace block before it is split on
 * commas. Without this, comment text inside a multi-line export block is
 * mis-parsed as exported symbol names (the C-9 generator bug observed in
 * the regenerated DEPENDENCY_GRAPH.md re-export rows).
 */
function stripBraceBlockComments(braceContent: string): string {
  return braceContent
    .replace(/\/\*[\s\S]*?\*\//g, '')  // block comments
    .replace(/\/\/[^\n]*/g, '');        // line comments
}

/** Split a brace-block body into symbol names. Comment text is stripped
 * first (the C-9 fix); aliasing (`X as Y` -> `X`) is resolved. An optional
 * leading `type ` qualifier (`export { type Foo }`) is preserved so that
 * type-only named re-exports still appear in the symbol list. Entries that
 * are not a bare identifier (optionally `type`-prefixed) are dropped —
 * this discards leftover comment fragments without losing real symbols. */
function splitBraceSymbols(braceContent: string): string[] {
  return stripBraceBlockComments(braceContent)
    .split(',')
    .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
    .filter((s) => /^(?:type\s+)?[A-Za-z_$][\w$]*$/.test(s))
    .map((s) => s.replace(/\s+/g, ' '));
}

/**
 * Extract file description from comments
 */
function extractDescription(content: string): string | null {
  // Try to find JSDoc comment at the top
  const jsdocMatch = content.match(/\/\*\*\s*\n([^*]*(?:\*(?!\/)[^*]*)*)\*\//);
  if (jsdocMatch) {
    const lines = jsdocMatch[1].split('\n')
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .filter(line => !line.startsWith('@') && line.length > 0);
    if (lines.length > 0) {
      return lines[0];
    }
  }

  // Try single-line comment
  const singleLineMatch = content.match(/^\/\/\s*(.+)$/m);
  if (singleLineMatch) {
    return singleLineMatch[1];
  }

  return null;
}

/**
 * Dynamically discover and categorize files into modules based on directory structure
 */
function categorizeFiles(files: ParsedFile[]): ModuleMap {
  const modules: ModuleMap = {};

  for (const file of files) {
    const relativePath = file.path;

    // Handle entry point (src/index.ts)
    if (relativePath === 'src/index.ts') {
      if (!modules.entry) modules.entry = {};
      modules.entry[relativePath] = file;
      continue;
    }

    // Extract the module name from path (first directory after src/)
    const parts = relativePath.split('/');
    if (parts.length >= 2 && parts[0] === 'src') {
      const moduleName = parts[1].replace('.ts', '');

      // If it's a file directly in src/, categorize by filename
      if (parts.length === 2) {
        if (!modules.root) modules.root = {};
        modules.root[relativePath] = file;
      } else {
        // It's in a subdirectory
        if (!modules[moduleName]) modules[moduleName] = {};
        modules[moduleName][relativePath] = file;
      }
    }
  }

  // Remove empty modules
  for (const key of Object.keys(modules)) {
    if (Object.keys(modules[key]).length === 0) {
      delete modules[key];
    }
  }

  return modules;
}

/**
 * Build dependency matrix
 */
function buildDependencyMatrix(files: ParsedFile[]): DependencyMatrix {
  const matrix: DependencyMatrix = {};

  for (const file of files) {
    const importedFrom = new Set<string>();
    const exportsTo = new Set<string>();

    // Find what this file imports from
    for (const dep of file.internalDependencies) {
      importedFrom.add(dep.file);
    }

    // Find what files export to this file
    for (const other of files) {
      if (other.path === file.path) continue;
      for (const dep of other.internalDependencies) {
        const resolvedPath = resolvePath(other.path, dep.file);
        if (resolvedPath === file.path || resolvedPath === file.path.replace('.ts', '')) {
          exportsTo.add(other.path);
        }
      }
    }

    matrix[file.path] = {
      importsFrom: [...importedFrom],
      exportsTo: [...exportsTo]
    };
  }

  return matrix;
}

/**
 * Resolve relative path
 */
function resolvePath(fromPath: string, relativePath: string): string {
  const dir = dirname(fromPath);
  let resolved = join(dir, relativePath);

  // Remove .js extension if present
  resolved = resolved.replace(/\.js$/, '');

  // Add .ts extension if not present
  if (!resolved.endsWith('.ts')) {
    resolved = resolved + '.ts';
  }

  // Normalize path separators
  resolved = resolved.replace(/\\/g, '/');

  // Map compiled-output imports back to their sources: tests that exercise the
  // built package (e.g. the CLI suite importing `../../dist/cli/main.js`)
  // resolve to `dist/...`, which matches no source file — so those files were
  // falsely reported as untested/unused. Source files never import from
  // `dist/`, so this rewrite only ever fires for such consumers. (Spawn-style
  // references to `bin/*.mjs` are not imports and remain out of scope.)
  resolved = resolved.replace(/^dist\//, 'src/');

  return resolved;
}

interface CircularDependencyResult {
  all: string[][];
  runtime: string[][];   // Non-type-only cycles (real runtime issues)
  typeOnly: string[][];  // Type-only cycles (safe, no runtime impact)
}

/**
 * Detect circular dependencies, distinguishing runtime from type-only cycles
 */
function detectCircularDependencies(files: ParsedFile[]): CircularDependencyResult {
  const filePaths = new Set(files.map(f => f.path));

  // Build both runtime-only and all-dependencies graphs
  const runtimeGraph = new Map<string, string[]>();
  const allGraph = new Map<string, string[]>();

  for (const file of files) {
    const runtimeDeps: string[] = [];
    const allDeps: string[] = [];

    for (const d of file.internalDependencies) {
      const resolved = resolvePath(file.path, d.file);
      if (filePaths.has(resolved)) {
        allDeps.push(resolved);
        // Only add to runtime graph if NOT type-only
        if (!d.typeOnly) {
          runtimeDeps.push(resolved);
        }
      }
    }
    runtimeGraph.set(file.path, runtimeDeps);
    allGraph.set(file.path, allDeps);
  }

  function findCycles(graph: Map<string, string[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    function dfs(node: string, path: string[]): void {
      if (inStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(node);
          const cycleKey = [...cycle].sort().join('->');
          if (!cycles.some(c => [...c].sort().join('->') === cycleKey)) {
            cycles.push(cycle);
          }
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      inStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, path);
      }

      path.pop();
      inStack.delete(node);
    }

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  const allCycles = findCycles(allGraph);
  const runtimeCycles = findCycles(runtimeGraph);

  // Type-only cycles = cycles in all but not in runtime
  const runtimeCycleKeys = new Set(runtimeCycles.map(c => [...c].sort().join('->')));
  const typeOnlyCycles = allCycles.filter(c => !runtimeCycleKeys.has([...c].sort().join('->')));

  return {
    all: allCycles,
    runtime: runtimeCycles,
    typeOnly: typeOnlyCycles
  };
}

/**
 * Detect unused files and exports
 */
/**
 * v0.6.1 Phase 3 Task 3.2 — Resolve every `package.json` `exports`
 * subpath to its corresponding `src/` source file. The shipped `exports`
 * map points at `dist/...js` paths; we reverse-map to `src/...ts`.
 * Returns the set of source paths (relative to ROOT_DIR) that are
 * implicitly reachable via the public package manifest, even if no
 * internal source file imports them.
 *
 * Example: `"./numerical/mathts-engine": { "import": "./dist/numerical/mathts-engine.js" }`
 * → `src/numerical/mathts-engine.ts`.
 */
function resolveExportsReachable(pkg: PackageJson): Set<string> {
  const reachable = new Set<string>();
  if (!pkg.exports) return reachable;
  const distToSrc = (distPath: string): string | null => {
    // "./dist/foo.js" -> "src/foo.ts"
    const m = distPath.match(/^\.\/dist\/(.+)\.js$/);
    if (!m) return null;
    return `src/${m[1]}.ts`;
  };
  for (const value of Object.values(pkg.exports)) {
    const candidates: string[] = typeof value === 'string'
      ? [value]
      : Object.values(value).filter((v): v is string => typeof v === 'string');
    for (const c of candidates) {
      const src = distToSrc(c);
      if (src) reachable.add(src);
    }
  }
  return reachable;
}

/**
 * post-v0.32.0 fix: an exported interface/type referenced only by another
 * exported function/const's SIGNATURE in the same file (e.g. a return
 * type) is not truly unused. Verified case: `SourceName` in
 * `src/cli/graphs.ts` is used only as a field of `resolveGraph`'s return
 * type, never imported by name elsewhere — but un-exporting it breaks the
 * `.d.ts` emit with TS4060. This is a simple identifier-occurrence check:
 * if the name appears more than once in the file's own source (once for
 * its declaration, at least once more elsewhere), treat it as used.
 * False negatives are possible (e.g. a name that only recurs inside a
 * comment) but acceptable here since the check only suppresses reports,
 * never adds them.
 */
const fileContentCache = new Map<string, string>();
function isTypeReferencedElsewhereInFile(filePath: string, typeName: string): boolean {
  let content = fileContentCache.get(filePath);
  if (content === undefined) {
    try {
      content = readFileSync(join(ROOT_DIR, filePath), 'utf-8');
    } catch {
      content = '';
    }
    fileContentCache.set(filePath, content);
  }
  const occurrences = content.match(new RegExp(`\\b${typeName}\\b`, 'g'));
  return !!occurrences && occurrences.length > 1;
}

function detectUnused(
  files: ParsedFile[],
  testFiles: ParsedFile[] = [],
  exportsReachable: Set<string> = new Set(),
): UnusedAnalysis {
  const filePaths = new Set(files.map(f => f.path));

  // Build a set of all imported files
  const importedFiles = new Set<string>(exportsReachable);
  // Build a map of all imported symbols per file
  const importedSymbols = new Map<string, Set<string>>();

  // Seed wildcard-imports for exports-reachable files (any export counts as used)
  for (const reachable of exportsReachable) {
    importedSymbols.set(reachable, new Set(['*']));
  }

  // v0.6.1 Phase 3 Task 3.1: union BOTH source and test imports into the
  // reachability scan. Without this, files imported only by tests (e.g. the
  // 40 src/bridges/equations/be-NN-*.ts modules consumed by their per-bridge
  // encoding tests) are falsely reported as unused. The `--include-tests`
  // flag already triggered a separate test-coverage report; this extension
  // makes the flag actually feed `detectUnused` too.
  const allConsumers: ParsedFile[] = [...files, ...testFiles];

  for (const file of allConsumers) {
    for (const dep of file.internalDependencies) {
      const resolved = resolvePath(file.path, dep.file);
      if (filePaths.has(resolved)) {
        importedFiles.add(resolved);

        // Track which symbols are imported
        if (!importedSymbols.has(resolved)) {
          importedSymbols.set(resolved, new Set());
        }
        const symbols = importedSymbols.get(resolved)!;
        for (const imp of dep.imports) {
          if (imp === '*') {
            // Wildcard import - mark all exports as used
            symbols.add('*');
          } else {
            symbols.add(imp.replace(/^\* as /, ''));
          }
        }
      }
    }
  }

  // Find unused files (excluding entry point and index files which are re-export hubs)
  const unusedFiles: string[] = [];
  for (const file of files) {
    if (file.path === 'src/index.ts') continue; // Entry point is always "used"
    if (file.name === 'index' && file.exports.reExported.length > 0) continue; // Re-export hubs
    // v0.7.1 M-14: ambient declaration files (*.ambient.d.ts) are included by the
    // TypeScript compiler via tsconfig typeRoots / /// <reference> directives, not
    // via ES import statements, so they never appear in importedFiles. They are not
    // "unused" — they provide ambient type declarations for optional peer dependencies.
    if (file.path.endsWith('.ambient.d.ts')) continue;
    if (!importedFiles.has(file.path)) {
      unusedFiles.push(file.path);
    }
  }

  // Find unused exports
  const unusedExports: UnusedExport[] = [];
  for (const file of files) {
    const usedSymbols = importedSymbols.get(file.path);
    const isWildcardImported = usedSymbols?.has('*');

    // Skip if file is not imported at all (already reported as unused file)
    // or if it's wildcard imported (all exports considered used)
    if (!usedSymbols || isWildcardImported) continue;

    // Check each export
    for (const fn of file.exports.functions) {
      if (!usedSymbols.has(fn)) {
        unusedExports.push({ file: file.path, name: fn, type: 'function' });
      }
    }
    for (const cls of file.exports.classes) {
      if (!usedSymbols.has(cls)) {
        unusedExports.push({ file: file.path, name: cls, type: 'class' });
      }
    }
    for (const iface of file.exports.interfaces) {
      if (!usedSymbols.has(iface) && !isTypeReferencedElsewhereInFile(file.path, iface)) {
        unusedExports.push({ file: file.path, name: iface, type: 'interface' });
      }
    }
    for (const type of file.exports.types) {
      if (
        !usedSymbols.has(type) &&
        !file.exports.interfaces.includes(type) &&
        !isTypeReferencedElsewhereInFile(file.path, type)
      ) {
        unusedExports.push({ file: file.path, name: type, type: 'type' });
      }
    }
    for (const en of file.exports.enums) {
      if (!usedSymbols.has(en)) {
        unusedExports.push({ file: file.path, name: en, type: 'enum' });
      }
    }
    for (const constant of file.exports.constants) {
      if (!usedSymbols.has(constant)) {
        unusedExports.push({ file: file.path, name: constant, type: 'constant' });
      }
    }
  }

  return { unusedFiles, unusedExports };
}

/**
 * Generate statistics from parsed files
 */
function generateStatistics(files: ParsedFile[], modules: ModuleMap, circularDeps: CircularDependencyResult, unusedAnalysis: UnusedAnalysis): Statistics {
  let totalExports = 0;
  let totalClasses = 0;
  let totalInterfaces = 0;
  let totalFunctions = 0;
  let totalTypeGuards = 0;
  let totalEnums = 0;
  let totalConstants = 0;
  let totalLines = 0;
  let totalReExports = 0;
  let totalTypeOnlyImports = 0;

  for (const file of files) {
    totalExports += file.exports.named.length;
    totalClasses += file.exports.classes.length;
    totalInterfaces += file.exports.interfaces.length;
    totalFunctions += file.exports.functions.length;
    totalEnums += file.exports.enums.length;
    totalConstants += file.exports.constants.length;
    totalReExports += file.exports.reExported.length;

    // Count type-only imports
    totalTypeOnlyImports += file.internalDependencies.filter(d => d.typeOnly).length;

    // Count type guards (functions starting with 'is')
    totalTypeGuards += file.exports.functions.filter(f => f.startsWith('is')).length;

    // Count lines
    try {
      const content = readFileSync(join(ROOT_DIR, file.path), 'utf-8');
      totalLines += content.split('\n').length;
    } catch {
      // Ignore
    }
  }

  return {
    totalTypeScriptFiles: files.length,
    totalModules: Object.keys(modules).length,
    totalLinesOfCode: totalLines,
    totalExports,
    totalClasses,
    totalInterfaces,
    totalFunctions,
    totalTypeGuards,
    totalEnums,
    totalConstants,
    totalReExports,
    totalTypeOnlyImports,
    runtimeCircularDeps: circularDeps.runtime.length,
    typeOnlyCircularDeps: circularDeps.typeOnly.length,
    unusedFilesCount: unusedAnalysis.unusedFiles.length,
    unusedExportsCount: unusedAnalysis.unusedExports.length
  };
}

/**
 * Generate JSON output
 */
function generateJSON(files: ParsedFile[], modules: ModuleMap, stats: Statistics, circularDeps: CircularDependencyResult): object {

  // Convert modules to JSON-friendly format
  const modulesJson: Record<string, Record<string, object>> = {};
  for (const [category, categoryFiles] of Object.entries(modules)) {
    modulesJson[category] = {};
    for (const [path, file] of Object.entries(categoryFiles)) {
      const fileData: Record<string, unknown> = {
        description: file.description || `${file.name} module`,
        externalDependencies: file.externalDependencies,
        nodeDependencies: file.nodeDependencies,
        internalDependencies: file.internalDependencies.map(d => ({
          file: d.file,
          imports: d.imports,
          ...(d.reExport ? { reExport: true } : {}),
          ...(d.typeOnly ? { typeOnly: true } : {})
        })),
        exports: file.exports.named,
        reExported: file.exports.reExported.length > 0 ? file.exports.reExported : undefined,
        classes: file.exports.classes.length > 0 ? file.exports.classes : undefined,
        interfaces: file.exports.interfaces.length > 0 ? file.exports.interfaces : undefined,
        functions: file.exports.functions.length > 0 ? file.exports.functions : undefined,
        enums: file.exports.enums.length > 0 ? file.exports.enums : undefined,
        constants: file.exports.constants.length > 0 ? file.exports.constants : undefined
      };

      // Clean up undefined values
      Object.keys(fileData).forEach(key => {
        if (fileData[key] === undefined) {
          delete fileData[key];
        }
      });

      modulesJson[category][path] = fileData;
    }
  }

  // Build layers from modules
  const layers = Object.keys(modules).map(name => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    files: Object.keys(modules[name])
  })).filter(l => l.files.length > 0);

  return {
    metadata: {
      name: packageJson.name,
      version: packageJson.version,
      totalFiles: stats.totalTypeScriptFiles,
      totalModules: stats.totalModules,
      totalExports: stats.totalExports
    },
    entryPoints: files
      .filter(f => f.path === 'src/index.ts')
      .map(f => ({
        file: f.path,
        type: 'main',
        description: f.description || 'Entry Point'
      })),
    modules: modulesJson,
    dependencyGraph: {
      circularDependencies: {
        runtime: circularDeps.runtime,
        typeOnly: circularDeps.typeOnly,
        total: circularDeps.all.length,
        runtimeCount: circularDeps.runtime.length,
        typeOnlyCount: circularDeps.typeOnly.length
      },
      layers
    },
    statistics: stats
  };
}

/**
 * Generate a dynamic Mermaid diagram from actual dependencies
 */
function generateMermaidDiagram(modules: ModuleMap, files: ParsedFile[]): string {
  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('graph TD');

  // Create subgraphs for each module
  const moduleNames = Object.keys(modules);
  const nodeIds = new Map<string, string>();
  let nodeCounter = 0;

  for (const moduleName of moduleNames) {
    const title = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    lines.push(`    subgraph ${title}`);

    const moduleFiles = Object.keys(modules[moduleName]);
    for (const filePath of moduleFiles.slice(0, 5)) { // Limit to 5 files per module for readability
      const name = basename(filePath, '.ts');
      const nodeId = `N${nodeCounter++}`;
      nodeIds.set(filePath, nodeId);
      lines.push(`        ${nodeId}[${name}]`);
    }

    if (moduleFiles.length > 5) {
      const nodeId = `N${nodeCounter++}`;
      lines.push(`        ${nodeId}[...${moduleFiles.length - 5} more]`);
    }

    lines.push('    end');
    lines.push('');
  }

  // Add edges for dependencies (limited for readability)
  const addedEdges = new Set<string>();
  let edgeCount = 0;
  const maxEdges = 30;

  for (const file of files) {
    const sourceId = nodeIds.get(file.path);
    if (!sourceId) continue;

    for (const dep of file.internalDependencies) {
      if (edgeCount >= maxEdges) break;

      const resolved = resolvePath(file.path, dep.file);
      const targetId = nodeIds.get(resolved);

      if (targetId && sourceId !== targetId) {
        const edgeKey = `${sourceId}-${targetId}`;
        if (!addedEdges.has(edgeKey)) {
          lines.push(`    ${sourceId} --> ${targetId}`);
          addedEdges.add(edgeKey);
          edgeCount++;
        }
      }
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Generate Markdown output
 */
/**
 * An export list longer than this renders as a fenced `text` block under its label instead of an
 * inline list of code spans. An identifier list is data, not prose: a long inline list reads as a
 * run-on sentence to a prose checker and to a reader. Lists at or under the threshold keep the
 * inline form.
 */
const LONG_EXPORT_LIST_THRESHOLD = 8;
/** Target line width inside the fenced block. */
const EXPORT_LIST_WRAP_WIDTH = 100;

function renderExportList(lines: string[], label: string, names: readonly string[]): void {
  if (names.length === 0) return;
  if (names.length <= LONG_EXPORT_LIST_THRESHOLD) {
    lines.push(`- ${label}: \`${names.join('`, `')}\``);
    return;
  }
  lines.push(`- ${label}:`);
  lines.push('');
  lines.push('  ```text');
  let row = '';
  names.forEach((name, i) => {
    const piece = i < names.length - 1 ? `${name},` : name;
    if (row !== '' && row.length + 1 + piece.length > EXPORT_LIST_WRAP_WIDTH) {
      lines.push(`  ${row}`);
      row = piece;
    } else {
      row = row === '' ? piece : `${row} ${piece}`;
    }
  });
  if (row !== '') lines.push(`  ${row}`);
  lines.push('  ```');
  lines.push('');
}

function generateMarkdown(files: ParsedFile[], modules: ModuleMap, stats: Statistics, circularDeps: CircularDependencyResult, matrix: DependencyMatrix): string {
  const lines: string[] = [];
  const projectName = packageJson.name || 'Project';

  // Do-not-edit banner + an EXPLICIT drift-gate opt-out. The architecture-docs
  // gate treats a missing '## Verification' section as a failure, never a pass,
  // so a generated report must opt out in its own source rather than by omission.
  // Opting out is right here: the docs-fresh CI job byte-compares this file
  // against a fresh generation, which is strictly stronger than a claim table.
  lines.push('<!-- repo-map:no-verification -->');
  lines.push('<!-- GENERATED FILE -- do not edit by hand. Edit the generator at');
  lines.push('     tools/create-dependency-graph/create-dependency-graph.ts, then run');
  lines.push('     `npm run docs:deps`. Hand edits are caught by the docs-fresh job. -->');
  lines.push('');
  lines.push(`# ${projectName} - Dependency Graph`);
  lines.push('');
  lines.push(`**Version**: ${packageJson.version}`);
  lines.push('');
  lines.push('This document provides a comprehensive dependency graph of all files, components, imports, functions, and variables in the codebase.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  lines.push('1. [Overview](#overview)');
  let tocIndex = 2;
  for (const category of Object.keys(modules)) {
    const title = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
    lines.push(`${tocIndex}. [${title} Dependencies](#${category.toLowerCase().replace(/\s+/g, '-')}-dependencies)`);
    tocIndex++;
  }
  lines.push(`${tocIndex}. [Dependency Matrix](#dependency-matrix)`);
  lines.push(`${tocIndex + 1}. [Circular Dependency Analysis](#circular-dependency-analysis)`);
  lines.push(`${tocIndex + 2}. [Visual Dependency Graph](#visual-dependency-graph)`);
  lines.push(`${tocIndex + 3}. [Summary Statistics](#summary-statistics)`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push('The codebase is organized into the following modules:');
  lines.push('');
  for (const [moduleName, moduleFiles] of Object.entries(modules)) {
    const fileCount = Object.keys(moduleFiles).length;
    lines.push(`- **${moduleName}**: ${fileCount} file${fileCount !== 1 ? 's' : ''}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Generate sections for each module category
  for (const [category, categoryFiles] of Object.entries(modules)) {
    const title = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
    lines.push(`## ${title} Dependencies`);
    lines.push('');

    for (const [path, file] of Object.entries(categoryFiles)) {
      const fileName = basename(path, '.ts');
      lines.push(`### \`${path}\` - ${file.description || `${fileName} module`}`);
      lines.push('');

      // External dependencies
      if (file.externalDependencies.length > 0) {
        lines.push('**External Dependencies:**');
        lines.push('| Package | Import |');
        lines.push('|---------|--------|');
        for (const dep of file.externalDependencies) {
          lines.push(`| \`${dep.package}\` | \`${dep.imports.join(', ')}\` |`);
        }
        lines.push('');
      }

      // Node dependencies
      if (file.nodeDependencies.length > 0) {
        lines.push('**Node.js Built-in Dependencies:**');
        lines.push('| Module | Import |');
        lines.push('|--------|--------|');
        for (const dep of file.nodeDependencies) {
          lines.push(`| \`${dep.module}\` | \`${dep.imports.join(', ')}\` |`);
        }
        lines.push('');
      }

      // Internal dependencies
      if (file.internalDependencies.length > 0) {
        lines.push('**Internal Dependencies:**');
        lines.push('| File | Imports | Type |');
        lines.push('|------|---------|------|');
        for (const dep of file.internalDependencies) {
          let usage = dep.reExport ? 'Re-export' : 'Import';
          if (dep.typeOnly) usage += ' (type-only)';
          lines.push(`| \`${dep.file}\` | \`${dep.imports.join(', ')}\` | ${usage} |`);
        }
        lines.push('');
      }

      // Exports
      if (file.exports.named.length > 0 || file.exports.default || file.exports.reExported.length > 0) {
        lines.push('**Exports:**');
        renderExportList(lines, 'Classes', file.exports.classes);
        renderExportList(lines, 'Interfaces', file.exports.interfaces);
        renderExportList(lines, 'Enums', file.exports.enums);
        renderExportList(lines, 'Functions', file.exports.functions);
        renderExportList(lines, 'Constants', file.exports.constants);
        renderExportList(lines, 'Re-exports', file.exports.reExported);
        if (file.exports.default) {
          lines.push(`- Default: \`${file.exports.default}\``);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  // Dependency Matrix
  lines.push('## Dependency Matrix');
  lines.push('');
  lines.push('### File Import/Export Matrix');
  lines.push('');
  lines.push('| File | Imports From | Exports To |');
  lines.push('|------|--------------|------------|');

  const matrixEntries = Object.entries(matrix).slice(0, 30); // Limit for readability
  for (const [path, deps] of matrixEntries) {
    const shortPath = basename(path, '.ts');
    const importsCount = deps.importsFrom.length;
    const exportsCount = deps.exportsTo.length;
    lines.push(`| \`${shortPath}\` | ${importsCount} files | ${exportsCount} files |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Circular Dependencies
  lines.push('## Circular Dependency Analysis');
  lines.push('');
  if (circularDeps.all.length === 0) {
    lines.push('**No circular dependencies detected.**');
  } else {
    lines.push(`**${circularDeps.all.length} circular dependencies detected:**`);
    lines.push('');
    lines.push(`- **Runtime cycles**: ${circularDeps.runtime.length} (require attention)`);
    lines.push(`- **Type-only cycles**: ${circularDeps.typeOnly.length} (safe, no runtime impact)`);
    lines.push('');

    if (circularDeps.runtime.length > 0) {
      lines.push('### Runtime Circular Dependencies');
      lines.push('');
      lines.push('These cycles involve runtime imports and may cause issues:');
      lines.push('');
      for (const cycle of circularDeps.runtime.slice(0, 10)) {
        lines.push(`- ${cycle.join(' -> ')}`);
      }
      if (circularDeps.runtime.length > 10) {
        lines.push(`- ... and ${circularDeps.runtime.length - 10} more`);
      }
      lines.push('');
    }

    if (circularDeps.typeOnly.length > 0) {
      lines.push('### Type-Only Circular Dependencies');
      lines.push('');
      lines.push('These cycles only involve type imports and are safe (erased at runtime):');
      lines.push('');
      for (const cycle of circularDeps.typeOnly.slice(0, 10)) {
        lines.push(`- ${cycle.join(' -> ')}`);
      }
      if (circularDeps.typeOnly.length > 10) {
        lines.push(`- ... and ${circularDeps.typeOnly.length - 10} more`);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');

  // Visual Dependency Graph
  lines.push('## Visual Dependency Graph');
  lines.push('');
  lines.push(generateMermaidDiagram(modules, files));
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary Statistics
  lines.push('## Summary Statistics');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('|----------|-------|');
  lines.push(`| Total TypeScript Files | ${stats.totalTypeScriptFiles} |`);
  lines.push(`| Total Modules | ${stats.totalModules} |`);
  lines.push(`| Total Lines of Code | ${stats.totalLinesOfCode} |`);
  lines.push(`| Total Exports | ${stats.totalExports} |`);
  lines.push(`| Total Re-exports | ${stats.totalReExports} |`);
  lines.push(`| Total Classes | ${stats.totalClasses} |`);
  lines.push(`| Total Interfaces | ${stats.totalInterfaces} |`);
  lines.push(`| Total Functions | ${stats.totalFunctions} |`);
  lines.push(`| Total Type Guards | ${stats.totalTypeGuards} |`);
  lines.push(`| Total Enums | ${stats.totalEnums} |`);
  lines.push(`| Type-only Imports | ${stats.totalTypeOnlyImports} |`);
  lines.push(`| Runtime Circular Deps | ${stats.runtimeCircularDeps} |`);
  lines.push(`| Type-only Circular Deps | ${stats.typeOnlyCircularDeps} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Version*: ${packageJson.version}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate compact summary for LLM consumption (~10KB target)
 * Uses CTON-style compression: no whitespace, abbreviated keys
 */
function generateCompactSummary(files: ParsedFile[], modules: ModuleMap, stats: Statistics, circularDeps: CircularDependencyResult): string {
  // Abbreviate module names and create compact structure
  const summary = {
    m: { // metadata
      n: packageJson.name,
      v: packageJson.version,
      f: stats.totalTypeScriptFiles,
      e: stats.totalExports,
      re: stats.totalReExports
    },
    s: { // statistics
      loc: stats.totalLinesOfCode,
      cls: stats.totalClasses,
      int: stats.totalInterfaces,
      fn: stats.totalFunctions,
      tg: stats.totalTypeGuards,
      en: stats.totalEnums,
      co: stats.totalConstants,
      toi: stats.totalTypeOnlyImports
    },
    c: { // circular deps
      rt: circularDeps.runtime.length,
      to: circularDeps.typeOnly.length,
      // Only include first 5 runtime cycles (if any) for context
      rtp: circularDeps.runtime.slice(0, 5).map(c => c.map(p => p.split('/').pop()?.replace('.ts', '')).join('→'))
    },
    mod: {} as Record<string, { f: number; exp: string[]; cls?: string[]; int?: string[] }>,
    // Hot paths: files with most dependencies
    hp: [] as { p: string; i: number; o: number }[]
  };

  // Compact module summary
  for (const [modName, modFiles] of Object.entries(modules)) {
    const fileList = Object.values(modFiles);
    const exports = fileList.flatMap(f => f.exports.named).slice(0, 20);
    const classes = fileList.flatMap(f => f.exports.classes);
    const interfaces = fileList.flatMap(f => f.exports.interfaces).slice(0, 10);

    summary.mod[modName] = {
      f: Object.keys(modFiles).length,
      exp: [...new Set(exports)]
    };
    if (classes.length > 0) summary.mod[modName].cls = [...new Set(classes)];
    if (interfaces.length > 0) summary.mod[modName].int = [...new Set(interfaces)];
  }

  // Find hot paths (files with highest connectivity)
  const connectivity = files.map(f => ({
    p: f.path.split('/').slice(-2).join('/'),
    i: f.internalDependencies.length,
    o: files.filter(other =>
      other.internalDependencies.some(d => {
        const resolved = resolvePath(other.path, d.file);
        return resolved === f.path;
      })
    ).length
  })).sort((a, b) => (b.i + b.o) - (a.i + a.o));

  summary.hp = connectivity.slice(0, 15);

  // Output as minified JSON (CTON-style: no whitespace)
  return JSON.stringify(summary);
}

/**
 * Generate test coverage analysis markdown
 */
function generateTestCoverageMarkdown(coverage: TestCoverageAnalysis): string {
  const lines: string[] = [];

  // Do-not-edit banner + an EXPLICIT drift-gate opt-out. The architecture-docs
  // gate treats a missing '## Verification' section as a failure, never a pass,
  // so a generated report must opt out in its own source rather than by omission.
  // Opting out is right here: the docs-fresh CI job byte-compares this file
  // against a fresh generation, which is strictly stronger than a claim table.
  lines.push('<!-- repo-map:no-verification -->');
  lines.push('<!-- GENERATED FILE -- do not edit by hand. Edit the generator at');
  lines.push('     tools/create-dependency-graph/create-dependency-graph.ts, then run');
  lines.push('     `npm run docs:deps`. Hand edits are caught by the docs-fresh job. -->');
  lines.push('');
  lines.push('# Test Coverage Analysis');
  lines.push('');
  lines.push('');

  // Summary statistics. Two coverages, never one headline: a test that imports a barrel is
  // credited for every module behind it (TRACED), which over-states what the suite exercises;
  // DIRECT counts only files a test imports itself. An import of `dist/<p>.js` is a direct
  // import of `src/<p>.ts`.
  const totalSource = coverage.sourceFiles.length;
  const totalTraced = coverage.testedFiles.length;
  const totalDirect = coverage.directlyTestedFiles.length;
  const totalUntested = coverage.untestedFiles.length;
  const percent = (n: number) => (totalSource > 0 ? ((n / totalSource) * 100).toFixed(1) : '0');

  lines.push('## Summary');
  lines.push('');
  lines.push('Direct: a test file imports the source file itself (`dist/<p>.js` counts as `src/<p>.ts`).');
  lines.push('Traced: direct, or reached through a barrel re-export or a bare side-effect import.');
  lines.push('Traced credit through a barrel says the module was LOADED, not that any assertion touched it.');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Source Files | ${totalSource} |`);
  lines.push(`| Total Test Files | ${coverage.testFiles.length} |`);
  lines.push(`| Source files imported directly by a test | ${totalDirect} |`);
  lines.push(`| Source files reached directly or through a barrel or side-effect import | ${totalTraced} |`);
  lines.push(`| Source files no test reaches either way | ${totalUntested} |`);
  lines.push(`| Direct coverage | ${percent(totalDirect)}% |`);
  lines.push(`| Traced coverage | ${percent(totalTraced)}% |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Files no test reaches (the main deliverable)
  lines.push('## Source Files No Test Reaches');
  lines.push('');
  if (coverage.untestedFiles.length === 0) {
    lines.push('Every source file is reached by at least one test, directly or traced.');
  } else {
    lines.push(`The following ${coverage.untestedFiles.length} source files are reached by no test file, directly or through a barrel or side-effect import:`);
    lines.push('');

    // Group by module
    const byModule = new Map<string, string[]>();
    for (const file of coverage.untestedFiles) {
      const parts = file.split('/');
      const module = parts.length >= 3 ? parts[1] : 'root';
      if (!byModule.has(module)) byModule.set(module, []);
      byModule.get(module)!.push(file);
    }

    for (const [module, files] of byModule) {
      lines.push(`### ${module}/`);
      lines.push('');
      for (const file of files.sort()) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');

  // Files with tests: direct importers, then the tests that reach the file only by tracing.
  lines.push('## Source Files With Test Coverage');
  lines.push('');
  lines.push('| Source File | Direct | Traced only |');
  lines.push('|-------------|--------|-------------|');

  const sortedTested = [...coverage.testedFiles].sort();
  for (const sourcePath of sortedTested) {
    const direct = coverage.directMap.get(sourcePath) || [];
    const tracedOnly = (coverage.coverageMap.get(sourcePath) || []).filter(t => !direct.includes(t));
    const shortSource = sourcePath.split('/').slice(-2).join('/');
    const cell = (tests: string[]) => (tests.length === 0 ? '—' : tests.map(t => `\`${basename(t)}\``).join(', '));
    lines.push(`| \`${shortSource}\` | ${cell(direct)} | ${cell(tracedOnly)} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Test file details
  lines.push('## Test File Details');
  lines.push('');
  lines.push('| Test File | Imports from Source |');
  lines.push('|-----------|---------------------|');

  for (const [testPath, sources] of coverage.testToSourceMap) {
    const shortTest = testPath.split('/').slice(-2).join('/');
    const sourceCount = sources.length;
    lines.push(`| \`${shortTest}\` | ${sourceCount} files |`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate test coverage JSON
 */
function generateTestCoverageJson(coverage: TestCoverageAnalysis): object {
  const coverageMapObj: Record<string, string[]> = {};
  for (const [source, tests] of coverage.coverageMap) {
    coverageMapObj[source] = tests;
  }

  const directMapObj: Record<string, string[]> = {};
  for (const [source, tests] of coverage.directMap) {
    directMapObj[source] = tests;
  }

  const testToSourceObj: Record<string, string[]> = {};
  for (const [test, sources] of coverage.testToSourceMap) {
    testToSourceObj[test] = sources;
  }

  const percent = (n: number) =>
    coverage.sourceFiles.length > 0 ? ((n / coverage.sourceFiles.length) * 100).toFixed(1) : '0';

  return {
    metadata: {
      totalSourceFiles: coverage.sourceFiles.length,
      totalTestFiles: coverage.testFiles.length,
      // `testedCount` / `coveragePercent` are the TRACED figures (direct, barrel, side-effect).
      testedCount: coverage.testedFiles.length,
      directlyTestedCount: coverage.directlyTestedFiles.length,
      untestedCount: coverage.untestedFiles.length,
      coveragePercent: percent(coverage.testedFiles.length),
      directCoveragePercent: percent(coverage.directlyTestedFiles.length),
    },
    untestedFiles: coverage.untestedFiles.sort(),
    testedFiles: coverage.testedFiles.sort(),
    directlyTestedFiles: coverage.directlyTestedFiles.sort(),
    coverageMap: coverageMapObj,
    directMap: directMapObj,
    testToSourceMap: testToSourceObj,
  };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const cliOptions = parseCliOptions();
  console.log('Scanning codebase for dependencies...');
  if (cliOptions.includeTests) {
    console.log('Test file analysis enabled');
  }

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  // Get all TypeScript files
  const tsFiles = getAllTsFiles(SRC_DIR);
  console.log(`Found ${tsFiles.length} TypeScript files`);

  if (tsFiles.length === 0) {
    console.error('No TypeScript files found in src/');
    process.exit(1);
  }

  // Parse all files. Explicit arrow (not a bare `.map(parseFile)`) so
  // `Array.prototype.map`'s (element, index, array) signature doesn't leak
  // the index into `parseFile`'s `isTestFile` parameter.
  const parsedFiles = tsFiles.map((f) => parseFile(f));
  console.log('Parsed all files');

  // v0.6.1 Phase 3 Task 3.1: parse test files BEFORE detectUnused so
  // their imports feed the reachability scan. Original ordering put
  // test parsing at the bottom of main() (test-coverage report only);
  // that meant files imported by tests (40 src/bridges/equations/*.ts
  // modules) were falsely flagged as unused.
  let parsedTestFiles: ParsedFile[] = [];
  if (cliOptions.includeTests) {
    const testDir = join(ROOT_DIR, 'tests');
    const testFilePaths = [
      ...getAllTestFiles(testDir),
      ...getAllTestFiles(SRC_DIR),
    ];
    console.log(`Found ${testFilePaths.length} test files`);
    // `isTestFile = true` enables the dynamic-import() scan (post-v0.32.0 fix).
    parsedTestFiles = testFilePaths.map((f) => parseFile(f, true));
    console.log('Parsed all test files');
  }

  // v0.6.1 Phase 3 Task 3.2: resolve package.json `exports` subpaths
  // to source paths and treat them as implicitly reachable. Eliminates
  // the `src/numerical/mathts-engine.ts` false-positive (declared in
  // exports as `./numerical/mathts-engine` but never re-exported by
  // src/index.ts).
  const exportsReachable = resolveExportsReachable(packageJson);
  if (exportsReachable.size > 0) {
    console.log(`Marked ${exportsReachable.size} file(s) as reachable via package.json exports`);
  }

  // Categorize into modules
  const modules = categorizeFiles(parsedFiles);
  console.log(`Categorized into ${Object.keys(modules).length} modules`);

  // Detect circular dependencies
  const circularDeps = detectCircularDependencies(parsedFiles);
  console.log(`Found ${circularDeps.all.length} circular dependencies (${circularDeps.runtime.length} runtime, ${circularDeps.typeOnly.length} type-only)`);

  // Detect unused files and exports
  const unusedAnalysis = detectUnused(parsedFiles, parsedTestFiles, exportsReachable);

  // Generate statistics
  const stats = generateStatistics(parsedFiles, modules, circularDeps, unusedAnalysis);
  console.log('Generated statistics');

  // Build dependency matrix
  const matrix = buildDependencyMatrix(parsedFiles);
  console.log('Built dependency matrix');

  // Generate outputs
  const json = generateJSON(parsedFiles, modules, stats, circularDeps);
  const markdown = generateMarkdown(parsedFiles, modules, stats, circularDeps, matrix);

  // Write outputs
  writeFileSync(join(OUTPUT_DIR, 'dependency-graph.json'), JSON.stringify(json, null, 2));
  console.log('Written: docs/architecture/dependency-graph.json');

  // Write YAML output (more compact, ~40% smaller than JSON)
  // js-yaml v5: named `dump` import (no default export). v4's
  // `quotingType: '"'` + `forceQuotes: false` map to `quoteStyle: 'auto'` —
  // quote only when necessary, preferring double quotes. ('double' would force
  // quotes on every scalar, tagging integers as `!!int "189"`.)
  // GUARD — which js-yaml evaluates `quoteStyle: 'auto'` decides the quote
  // CHARACTER of every scalar that needs quoting, and nothing downstream can
  // tell the two apart until the docs-freshness gate reports a large diff that
  // is ENTIRELY quote characters and that no edit can clear.
  //
  // This repo hit exactly that twice on 2026-09-21. The trap: THIS directory
  // declares its own `js-yaml` and `tools/**/node_modules` is gitignored, so a
  // stray `npm install` here shadows the copy the root lockfile pins — node
  // resolves from THIS file's directory first. It is invisible to git, differs
  // per machine, and produced the state where one machine could push and
  // another could not, each with a "clean" install.
  //
  // So probe the BEHAVIOUR, not the version. A version string can be read and
  // still not tell you what `'auto'` will do; the quote character is the thing
  // the committed artifact actually depends on.
  const quoteProbe = dumpYaml({ probe: 'a: b' }, { quoteStyle: 'auto' });
  if (!quoteProbe.includes('"a: b"')) {
    throw new Error(
      `create-dependency-graph: js-yaml 'auto' quoting is not the calibrated behaviour.\n` +
        `  expected: probe: "a: b"   (double quotes)\n` +
        `  got     : ${quoteProbe.trim()}\n` +
        `The committed docs/architecture/ artifacts were generated by the js-yaml the ROOT ` +
        `lockfile pins (5.4.2), which double-quotes. A different copy is being resolved — ` +
        `almost certainly tools/create-dependency-graph/node_modules/js-yaml, which is ` +
        `gitignored and therefore invisible to git and different on every machine.\n` +
        `Fix: delete tools/create-dependency-graph/node_modules, then re-run. Do NOT set ` +
        `quoteStyle:'double' instead — that forces quotes on EVERY scalar and tags integers ` +
        `as !!int "189", trading a cosmetic diff for a semantic one.`,
    );
  }

  const yamlOutput = dumpYaml(json, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quoteStyle: 'auto',
  });
  writeFileSync(join(OUTPUT_DIR, 'dependency-graph.yaml'), yamlOutput);
  console.log('Written: docs/architecture/dependency-graph.yaml');

  writeFileSync(join(OUTPUT_DIR, 'DEPENDENCY_GRAPH.md'), markdown);
  console.log('Written: docs/architecture/DEPENDENCY_GRAPH.md');

  // Write compact summary for LLM consumption (CTON-style, ~10KB)
  const compactSummary = generateCompactSummary(parsedFiles, modules, stats, circularDeps);
  writeFileSync(join(OUTPUT_DIR, 'dependency-summary.compact.json'), compactSummary);
  const compactSize = Buffer.byteLength(compactSummary, 'utf8');
  console.log(`Written: docs/architecture/dependency-summary.compact.json (${(compactSize / 1024).toFixed(1)}KB)`);

  // Test coverage analysis (when --include-tests is specified)
  // v0.6.1: test files were already parsed up-top so `detectUnused` could
  // consume them; re-use that here instead of re-parsing.
  let testCoverage: TestCoverageAnalysis | null = null;
  if (cliOptions.includeTests) {
    console.log('\nAnalyzing test coverage...');
    // post-v0.32.0 fix: exclude ambient `.d.ts` declaration files from the
    // test-coverage denominator and untested-files list. They are included
    // by the TypeScript compiler via tsconfig typeRoots / <reference>
    // directives (see the `.ambient.d.ts` skip in detectUnused below), never
    // imported by a test, and untestable by definition. This only narrows
    // the coverage report's input set — `parsedFiles` itself (used for the
    // structural dependency graph / statistics) is untouched.
    const coverageEligibleFiles = parsedFiles.filter(f => !f.path.endsWith('.d.ts'));
    // Analyze test coverage (parsedTestFiles is already populated)
    testCoverage = analyzeTestCoverage(coverageEligibleFiles, parsedTestFiles);

    // Generate test coverage outputs
    const testCoverageMarkdown = generateTestCoverageMarkdown(testCoverage);
    const testCoverageJson = generateTestCoverageJson(testCoverage);

    // Write test coverage outputs
    writeFileSync(join(OUTPUT_DIR, 'TEST_COVERAGE.md'), testCoverageMarkdown);
    console.log('Written: docs/architecture/TEST_COVERAGE.md');

    writeFileSync(join(OUTPUT_DIR, 'test-coverage.json'), JSON.stringify(testCoverageJson, null, 2));
    console.log('Written: docs/architecture/test-coverage.json');
  }

  if (cliOptions.apiSurface !== null) {
    const load = (p: string): string | null => {
      const abs = join(ROOT_DIR, p);
      return existsSync(abs) && statSync(abs).isFile() ? readFileSync(abs, 'utf-8') : null;
    };
    const resolver = createTsResolver((p) => load(p) !== null);
    const opts = { stabilityTags: cliOptions.stabilityTags };
    const surface = resolveSurface(cliOptions.apiEntry.split('\\').join('/'), load, resolver, opts);
    const files = parsedFiles.map((f) => ({ path: f.path, exports: extractExportDetails(load(f.path) ?? '', opts) }));
    const report = buildApiSurfaceReport(surface, files, cliOptions.stabilityTags);
    const outPath = resolvePathAbs(cliOptions.apiSurface);
    writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`Written: ${outPath} (${surface.symbols.length} surface symbols, ${surface.unresolved.length} unresolved)`);
  }

  console.log('\nDependency graph generation complete!');
  console.log(`  - ${stats.totalTypeScriptFiles} files analyzed`);
  console.log(`  - ${stats.totalExports} exports found (${stats.totalReExports} re-exports)`);
  console.log(`  - ${stats.totalTypeOnlyImports} type-only imports detected`);
  console.log(`  - ${circularDeps.all.length} circular dependencies:`);
  console.log(`      ${circularDeps.runtime.length} runtime (require attention)`);
  console.log(`      ${circularDeps.typeOnly.length} type-only (safe)`);
  console.log(`  - ${unusedAnalysis.unusedFiles.length} potentially unused files`);
  console.log(`  - ${unusedAnalysis.unusedExports.length} potentially unused exports`);

  // Print unused files if any
  if (unusedAnalysis.unusedFiles.length > 0) {
    console.log('\nPotentially unused files:');
    for (const file of unusedAnalysis.unusedFiles.slice(0, 20)) {
      console.log(`  - ${file}`);
    }
    if (unusedAnalysis.unusedFiles.length > 20) {
      console.log(`  ... and ${unusedAnalysis.unusedFiles.length - 20} more`);
    }
  }

  // Print unused exports if any (grouped by file)
  if (unusedAnalysis.unusedExports.length > 0) {
    console.log('\nPotentially unused exports:');
    const byFile = new Map<string, UnusedExport[]>();
    for (const exp of unusedAnalysis.unusedExports) {
      if (!byFile.has(exp.file)) byFile.set(exp.file, []);
      byFile.get(exp.file)!.push(exp);
    }
    let shown = 0;
    for (const [file, exports] of byFile) {
      if (shown >= 10) {
        console.log(`  ... and ${byFile.size - 10} more files with unused exports`);
        break;
      }
      console.log(`  ${file}:`);
      for (const exp of exports.slice(0, 5)) {
        console.log(`    - ${exp.name} (${exp.type})`);
      }
      if (exports.length > 5) {
        console.log(`    ... and ${exports.length - 5} more`);
      }
      shown++;
    }
  }

  // Live duplicate-owner list. Narrative docs point here and do not restate the rows.
  // Scans are registered by the phase that makes a single owner true. Until one
  // is registered, the committed file has an empty hit list, and docs-fresh
  // fails if a later scan is not regenerated into this file.
  const duplicateOwnerPath = join(OUTPUT_DIR, 'duplicate-owners.md');
  writeFileSync(duplicateOwnerPath, renderDuplicateOwners(ROOT_DIR));
  console.log('Written: docs/architecture/duplicate-owners.md');

  // Write full unused analysis to a separate file
  const unusedReportPath = join(OUTPUT_DIR, 'unused-analysis.md');
  // Same rationale as the banner in generateMarkdown above.
  let unusedReport = '<!-- repo-map:no-verification -->\n'
    + '<!-- GENERATED FILE -- do not edit by hand. Edit the generator at\n'
    + '     tools/create-dependency-graph/create-dependency-graph.ts, then run\n'
    + '     `npm run docs:deps`. Hand edits are caught by the docs-fresh job. -->\n\n'
    + '# Unused Files and Exports Analysis\n\n';
  unusedReport += `## Summary\n\n`;
  unusedReport += `- **Potentially unused files**: ${unusedAnalysis.unusedFiles.length}\n`;
  unusedReport += `- **Potentially unused exports**: ${unusedAnalysis.unusedExports.length}\n\n`;

  unusedReport += `## Potentially Unused Files\n\n`;
  unusedReport += `These files are not imported by any other file in the codebase:\n\n`;
  for (const file of unusedAnalysis.unusedFiles) {
    unusedReport += `- \`${file}\`\n`;
  }

  unusedReport += `\n## Potentially Unused Exports\n\n`;
  unusedReport += `These exports are not imported by any other file in the codebase:\n\n`;
  const byFileForReport = new Map<string, UnusedExport[]>();
  for (const exp of unusedAnalysis.unusedExports) {
    if (!byFileForReport.has(exp.file)) byFileForReport.set(exp.file, []);
    byFileForReport.get(exp.file)!.push(exp);
  }
  for (const [file, exports] of byFileForReport) {
    unusedReport += `### \`${file}\`\n\n`;
    for (const exp of exports) {
      unusedReport += `- \`${exp.name}\` (${exp.type})\n`;
    }
    unusedReport += '\n';
  }

  writeFileSync(unusedReportPath, unusedReport);
  console.log(`\nWritten: ${unusedReportPath}`);

  // Print test coverage summary if enabled
  if (testCoverage) {
    const coveragePercent = testCoverage.sourceFiles.length > 0
      ? ((testCoverage.testedFiles.length / testCoverage.sourceFiles.length) * 100).toFixed(1)
      : '0';

    console.log('\n=== Test Coverage Analysis ===');
    console.log(`  - ${testCoverage.testFiles.length} test files analyzed`);
    console.log(`  - ${testCoverage.testedFiles.length}/${testCoverage.sourceFiles.length} source files reached by a test, directly or traced (${coveragePercent}%)`);
    console.log(`  - ${testCoverage.directlyTestedFiles.length}/${testCoverage.sourceFiles.length} imported directly by a test`);
    console.log(`  - ${testCoverage.untestedFiles.length} source files no test reaches`);

    if (testCoverage.untestedFiles.length > 0) {
      console.log('\nSource files without test coverage:');
      for (const file of testCoverage.untestedFiles.slice(0, 15)) {
        console.log(`  - ${file}`);
      }
      if (testCoverage.untestedFiles.length > 15) {
        console.log(`  ... and ${testCoverage.untestedFiles.length - 15} more (see TEST_COVERAGE.md for full list)`);
      }
    }
  }
}

main().catch(console.error);
