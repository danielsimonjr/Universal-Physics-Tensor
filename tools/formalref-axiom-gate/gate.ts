/**
 * The formalRef axiom gate.
 *
 * A `formalRef` records the axioms that its Lean proof depends on. This gate measures them again
 * with `#print axioms`, from the probes in `formal/physlib/`, run inside a Physlib checkout at the
 * pinned commit. It fails when:
 *
 * - a positive control does not report `sorryAx`, because then a clean result cannot be told apart
 *   from a probe that never detects a hole. `HoleProbe.lean` has a `sorry` in the probe file itself.
 *   `ImportedHoleProbe.lean` imports `UptImportedHole`, a `module` file (the form of every Physlib
 *   file) with a `sorry`, which the gate first compiles. For an imported theorem `#print axioms`
 *   reads the axiom list stored in the `.olean`; this control shows that the stored list carries
 *   `sorryAx` for a hole. It does not check how the Physlib `.olean` files were built;
 * - the imported-hole module does not compile (the gate deletes its old output first, so a failed
 *   compile cannot leave an earlier `.olean` for the control to pass on);
 * - a probed theorem is missing from the output, or depends on `sorryAx`;
 * - a `lean4-physlib` formalRef names a theorem that the probe does not print, or records axioms
 *   that differ from the measured ones;
 * - the checkout is not at the commit and toolchain that each `formalRef.version` records;
 * - there is nothing to check (no probed theorem, no reference, or a `#print axioms` line that the
 *   gate cannot parse), so that the gate cannot pass by checking nothing;
 * - a `lean4-physjs` formalRef disagrees with `formal/physjs/manifest.json` (commit, theorem, key,
 *   axioms, or the coverage phrase), or a manifest entry does not resolve to a bridge. That system
 *   is not skipped. The manifest check does not run Lean.
 *
 * Lean exits 0 for a proof that uses `sorry` (it only warns), so the gate reads the printed axioms
 * and never the exit code.
 *
 * Run (needs Lean and a built Physlib checkout; see `formal/physlib/README.md`):
 *   bun tools/formalref-axiom-gate/gate.ts --physlib <dir> [--probes <dir>] [--lake <exe>] [--write-captured]
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** A recorded formal reference, reduced to what the gate compares. */
export interface ProbedReference {
  /** The Lean theorem name. */
  readonly statement: string;
  readonly axioms: readonly string[];
  /** `formalRef.version`, for example `physlib@<sha> lean4:v4.34.0`. */
  readonly version: string;
}

/** The gate's verdict. `ok` is true only when `problems` is empty. */
export interface GateVerdict {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

const HOLE_THEOREM = 'holeProbe';
const IMPORTED_HOLE_THEOREM = 'uptImportedHole';
const IMPORTED_HOLE_MODULE = 'UptImportedHole';

/**
 * Parse `#print axioms` output into theorem name → axioms. Lean wraps a long list across lines,
 * and prints "does not depend on any axioms" for an axiom-free proof.
 */
export function parseAxiomReport(text: string): Map<string, string[]> {
  const report = new Map<string, string[]>();
  // Anchored at the line start, and lazy up to the fixed suffix, so a name that contains `'`
  // (common in Mathlib, for example `foo'`) is read whole.
  for (const m of text.matchAll(/^'(.+?)' depends on axioms: \[([^\]]*)\]/gm)) {
    report.set(
      m[1]!,
      m[2]!
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0),
    );
  }
  for (const m of text.matchAll(/^'(.+?)' does not depend on any axioms/gm)) report.set(m[1]!, []);
  return report;
}

/** The theorem names that a probe source prints with `#print axioms`, in order. */
export function probedTheorems(leanSource: string): string[] {
  return [...leanSource.matchAll(/^\s*#print axioms\s+(\S+)\s*(?:--.*)?$/gm)].map((m) => m[1]!);
}

/**
 * Check that the Physlib checkout is at the commit and toolchain that every reference records.
 * `toolchain` is the content of the checkout's `lean-toolchain` file.
 */
export function checkPin(input: {
  readonly references: readonly ProbedReference[];
  readonly headSha: string;
  readonly toolchain: string;
}): string[] {
  const tag = input.toolchain.trim().split('/').pop() ?? '';
  const problems: string[] = [];
  for (const ref of input.references) {
    if (!ref.version.includes(`physlib@${input.headSha.trim()}`)) {
      problems.push(`checkout is at ${input.headSha.trim()}, but formalRef '${ref.statement}' records '${ref.version}'`);
    }
    if (!tag || !ref.version.includes(tag)) {
      problems.push(`checkout toolchain is '${input.toolchain.trim()}', but formalRef '${ref.statement}' records '${ref.version}'`);
    }
  }
  return problems;
}

/**
 * Every `lean4-physlib` formalRef among the given bridges: atlas bridges and
 * catalog rows alike, the same flat list `physjsManifestProblems` reads. The
 * statement text starts with the theorem name, followed by a colon and a
 * description. The sentence that this scanned only `ATLAS_FAMILIES`, so a
 * catalog row carrying such a reference was silently excluded, is the record
 * from before this signature.
 */
export function lean4PhyslibReferences(
  bridges: readonly {
    readonly formalRef?: { system: string; statement: string; axioms: readonly string[]; version: string };
  }[],
): ProbedReference[] {
  const refs: ProbedReference[] = [];
  for (const bridge of bridges) {
    const ref = bridge.formalRef;
    if (ref?.system !== 'lean4-physlib') continue;
    refs.push({ statement: ref.statement.split(':')[0]!.trim(), axioms: ref.axioms, version: ref.version });
  }
  return refs;
}

/** Judge the probe outputs against the probe source and the recorded references. */
export function judgeAxiomGate(input: {
  readonly probeSource: string;
  readonly probeOutput: string;
  readonly holeOutput: string;
  /** The output of `ImportedHoleProbe.lean`, the control for a hole inside an imported module. */
  readonly importedHoleOutput: string;
  readonly references: readonly ProbedReference[];
}): GateVerdict {
  const problems: string[] = [];

  const hole = parseAxiomReport(input.holeOutput).get(HOLE_THEOREM);
  if (!hole?.includes('sorryAx')) {
    problems.push(
      `positive control failed: '${HOLE_THEOREM}' did not report sorryAx, so this probe cannot detect a hole`,
    );
  }
  const importedHole = parseAxiomReport(input.importedHoleOutput).get(IMPORTED_HOLE_THEOREM);
  if (!importedHole?.includes('sorryAx')) {
    problems.push(
      `imported-module control failed: '${IMPORTED_HOLE_THEOREM}' (a sorry in a compiled, imported module) did not ` +
        'report sorryAx, so this probe cannot detect a hole inside an imported module',
    );
  }

  const theorems = probedTheorems(input.probeSource);
  const printLines = input.probeSource.split(/\r?\n/).filter((l) => l.includes('#print axioms')).length;
  if (theorems.length === 0) problems.push('the probe source prints no theorem, so there is nothing to check');
  if (printLines !== theorems.length) {
    problems.push(`the probe source has ${printLines} '#print axioms' lines but ${theorems.length} parse as theorems`);
  }
  if (input.references.length === 0) problems.push('no lean4-physlib formalRef to check');
  const report = parseAxiomReport(input.probeOutput);
  for (const name of theorems) {
    const axioms = report.get(name);
    if (!axioms) problems.push(`'${name}' is probed but not reported in the output`);
    else if (axioms.includes('sorryAx')) problems.push(`'${name}' depends on sorryAx`);
  }

  for (const ref of input.references) {
    if (!/^[^\s:()]+$/.test(ref.statement)) {
      problems.push(`formalRef statement must start with a Lean theorem name, then ':'; got '${ref.statement}'`);
      continue;
    }
    if (!theorems.includes(ref.statement)) {
      problems.push(`formalRef '${ref.statement}' is not probed by the probe source`);
      continue;
    }
    const measured = report.get(ref.statement);
    if (!measured) continue;
    const same =
      measured.length === ref.axioms.length && [...measured].sort().join() === [...ref.axioms].sort().join();
    if (!same) {
      problems.push(
        `formalRef '${ref.statement}' records axioms [${ref.axioms.join(', ')}] but measures [${measured.join(', ')}]`,
      );
    }
  }
  return { ok: problems.length === 0, problems };
}

function argValue(args: readonly string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

/**
 * The problem with a compile of the imported-hole module, or `null` when it succeeded. A compile
 * succeeded only when the compiler exited 0 AND wrote the `.olean`: Lean writes no `.olean` for a
 * file with errors.
 */
export function compileProblem(result: {
  readonly status: number | null;
  readonly oleanWritten: boolean;
  readonly output: string;
}): string | null {
  if (result.status === 0 && result.oleanWritten) return null;
  return (
    `imported-module control could not be compiled (exit ${result.status ?? 'none'}, ` +
    `.olean ${result.oleanWritten ? 'written' : 'not written'}): ${result.output.trim()}`
  );
}

/**
 * Copy the imported-hole module into the checkout and compile it into the checkout's build
 * directory, where `lake env lean` finds it for `import`. The old output is deleted first.
 */
function compileImportedHoleModule(
  lake: string,
  physlibDir: string,
  probesDir: string,
): { problem: string | null; output: string } {
  const file = `${IMPORTED_HOLE_MODULE}.lean`;
  copyFileSync(join(probesDir, file), join(physlibDir, file));
  const outDir = join(physlibDir, '.lake', 'build', 'lib', 'lean');
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) {
    if (f.startsWith(`${IMPORTED_HOLE_MODULE}.`)) rmSync(join(outDir, f), { force: true });
  }
  const olean = join(outDir, `${IMPORTED_HOLE_MODULE}.olean`);
  const run = spawnSync(lake, ['env', 'lean', '-o', olean, '-i', join(outDir, `${IMPORTED_HOLE_MODULE}.ilean`), file], {
    cwd: physlibDir,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error) throw run.error;
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  return { problem: compileProblem({ status: run.status, oleanWritten: existsSync(olean), output }), output };
}

/** Copy one probe into the checkout and run it with `lake env lean`. */
function runProbe(lake: string, physlibDir: string, probePath: string): string {
  const name = probePath.split(/[\\/]/).pop()!;
  copyFileSync(probePath, join(physlibDir, name));
  const run = spawnSync(lake, ['env', 'lean', name], {
    cwd: physlibDir,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error) throw run.error;
  return `${run.stdout ?? ''}${run.stderr ?? ''}`;
}

async function main(args: readonly string[]): Promise<number> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const physlibDir = argValue(args, '--physlib');
  const { ATLAS_FAMILIES } = await import('../../src/atlas/families.js');
  const { BRIDGE_EQUATIONS } = await import('../../src/bridges/index.js');
  const { catalogFormalRef } = await import('../../src/atlas/catalog-formal-ref.js');
  const { physjsManifestProblems } = await import('../../src/atlas/physjs-ref.js');
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'formal', 'physjs', 'manifest.json'), 'utf-8'));
  const bridges = [
    ...ATLAS_FAMILIES.flatMap((family) => family.bridges),
    ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: catalogFormalRef(entry.id) })),
  ];
  const physjsProblems = physjsManifestProblems({ manifest, bridges });
  for (const p of physjsProblems) console.error(`FAIL: ${p}`);

  const references = lean4PhyslibReferences(bridges);
  if (references.length === 0) {
    console.log(
      physjsProblems.length === 0
        ? 'formalRef axiom gate: PASS (lean4-physjs manifest; no lean4-physlib formalRef)'
        : `formalRef axiom gate: FAIL (${physjsProblems.length})`,
    );
    return physjsProblems.length === 0 ? 0 : 1;
  }
  if (!physlibDir) {
    console.error('usage: gate.ts --physlib <dir> [--probes <dir>] [--lake <exe>] [--write-captured]');
    return 2;
  }
  const probesDir = resolve(argValue(args, '--probes') ?? join(repoRoot, 'formal', 'physlib'));
  const lake = argValue(args, '--lake') ?? 'lake';
  // The pin is checked first: a Lean run takes minutes, and its result means nothing for a commit
  // that no record names.
  const head = spawnSync('git', ['-C', physlibDir, 'rev-parse', 'HEAD'], { encoding: 'utf-8' });
  const pinProblems = checkPin({
    references,
    headSha: head.status === 0 ? head.stdout : '(not a git checkout)',
    toolchain: readFileSync(join(physlibDir, 'lean-toolchain'), 'utf-8'),
  });
  if (pinProblems.length > 0) {
    for (const p of pinProblems) console.error(`FAIL: ${p}`);
    console.log(`formalRef axiom gate: FAIL (${pinProblems.length})`);
    return 1;
  }

  const probePath = join(probesDir, 'AxiomProbe.lean');
  const probeOutput = runProbe(lake, physlibDir, probePath);
  const holeOutput = runProbe(lake, physlibDir, join(probesDir, 'HoleProbe.lean'));
  const compiled = compileImportedHoleModule(lake, physlibDir, probesDir);
  if (compiled.problem) {
    console.error(`FAIL: ${compiled.problem}`);
    console.log('formalRef axiom gate: FAIL (1)');
    return 1;
  }
  const importedHoleOutput = runProbe(lake, physlibDir, join(probesDir, 'ImportedHoleProbe.lean'));

  if (args.includes('--write-captured')) {
    mkdirSync(join(probesDir, 'captured'), { recursive: true });
    writeFileSync(join(probesDir, 'captured', 'AxiomProbe.out'), probeOutput);
    writeFileSync(join(probesDir, 'captured', 'HoleProbe.out'), holeOutput);
    writeFileSync(join(probesDir, 'captured', 'ImportedHoleProbe.out'), importedHoleOutput);
    writeFileSync(join(probesDir, 'captured', `${IMPORTED_HOLE_MODULE}.compile.out`), compiled.output);
  }

  const verdict = judgeAxiomGate({
    probeSource: readFileSync(probePath, 'utf-8'),
    probeOutput,
    holeOutput,
    importedHoleOutput,
    references,
  });
  const problems = [...physjsProblems, ...verdict.problems];
  for (const p of verdict.problems) console.error(`FAIL: ${p}`);
  console.log(problems.length === 0 ? 'formalRef axiom gate: PASS' : `formalRef axiom gate: FAIL (${problems.length})`);
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
