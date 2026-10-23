# Universal Physics Tensor — File Inventory

Every source file that this repository tracks, by zone.

> **Derived from `file-inventory.json`.** A person writes this file from that report.
> `repo-tools map` writes the report. Regenerate it, then update the tables and the
> Verification block below.

## Scope: what is counted

The census is the set of source files that git tracks. Build output, `node_modules/` and
ignored scratch files are absent because git does not track them. The tool does not guess
from a directory name.

The scope of this document is the **whole repository**: 1150 source files. The library
alone is smaller. `src/` holds 385 TypeScript files, and `bun run docs:deps` counts the same
385. The zone `src` below counts 387 files: the 385 files under `src/`, the launcher
`bin/upt.mjs` and the smoke entry `test-example.js`.

## By zone

| Zone | Files | What lives here |
|---|---|---|
| `tests` | 713 | The vitest suite under `tests/` |
| `src` | 387 | The library, the CLI and the physics catalog code, plus `bin/upt.mjs` and `test-example.js` |
| `tools` | 32 | Repository tooling: 18 files under `tools/` and 14 files under `scripts/` |
| `benchmarks` | 15 | `bench/*.bench.ts` and their fixture, run by `npm run bench` |
| `examples` | 1 | `examples/basic-usage.ts` |
| `docs` | 1 | One script under `docs/persona-sessions/` |
| `config` | 1 | `vitest.config.ts` |
| **Total** | **1150** | |

**Tests outnumber source files: 713 against 387.** The ratio fits a repository whose claims
are physical: a wrong number is a wrong prediction, not a cosmetic defect.

## The two orphans, and why neither is dead code

**Read this table before you delete anything.** An orphan is a file that no import reaches.
A file that no import reaches can still run.

| File | Why no import reaches it | Verdict |
|---|---|---|
| `bin/upt.mjs` | The published `bin` launcher. It loads `dist/cli/main.js` through a path built at run time, so no import resolver can follow it. The tool reads the launcher to recover `src/cli/main.ts` as a root. It does not treat the launcher itself as a root. | **Live.** It is the shipped CLI entry. |
| `test-example.js` | The `npm run smoke` entry. The `npm` script runs it by name, and `npm run validate` runs `smoke`. | **Live.** |

**Zero of the two are dead code.** Two reading errors would make the count much worse, and
the tool avoids both:

- If the launcher's entry cannot be resolved, the whole `src/cli/` subtree looks orphaned. The
  tool recovers `src/cli/main.ts` as a root from `bin/upt.mjs` (see the `bin/upt.mjs` row above).
- If only a folder named `benchmarks/` is matched, every file under `bench/` looks like source
  and looks orphaned. The tool also matches `bench/`, so those files get the `bench` disposition.

`unused-analysis.md` lists the unused files and exports of `src/`.

## Verification

Regenerate: `repo-tools map <repo> --out=<dir>` · Check: `repo-tools check <repo> --docs=docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 1150 | `dependency-graph.json` `statistics.totalSourceFiles` |

The claim counts every tracked source file, tests and tools included. The `dependency-graph.json` in the Source column is the output of `repo-tools map`. The committed `docs/architecture/dependency-graph.json` is a different file, which `bun run docs:deps` writes for `src/`.

**Claims the gate cannot hold.** The per-zone table comes from the `byArea` block of
`file-inventory.json`, which the gate does not read. The verdict column comes from a reading
of each file and of how it is invoked, not from a metric. `tsc` include semantics and an
`npm` script name are outside any dependency graph.
