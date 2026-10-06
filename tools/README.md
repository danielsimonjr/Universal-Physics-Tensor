# `tools/` — vendored utility tools

Standalone developer utilities adapted from the `memoryjs` sister repo and
retrofitted for `universal-physics-tensor`. Each tool is self-contained in
its own subdirectory.

| Tool | Purpose |
|---|---|
| `create-dependency-graph/` | Scans `src/` and writes dependency-graph docs to `docs/architecture/`. Run via `npm run docs:deps`. One dep (`js-yaml`). |
| `plan-doc-audit/` | Audits `docs/planning/` checkboxes against shipped `src/` symbols (stub-aware). Run via `npm run audit:plans` (dry-run) or `-- --apply`. Zero deps. |
| `formalref-axiom-gate/` | Checks every `lean4-physjs` formalRef against `formal/physjs/manifest.json`, and re-measures the axioms of every `lean4-physlib` formalRef with the probes in `formal/physlib/`, including a positive control. Run via `bun run atlas:formal-gate -- --physlib <checkout>` when a Physlib reference exists. The manifest check does not need Lean. |
| `citation-quote-check/` | Matches every quoted span and locator of the `// source:` comments in `docs/research/phase-1-source-comments.txt` against downloaded source texts, with a negative control per check. Run via `bun run atlas:quote-check -- --sources <dir> [--write]`. Needs pdftotext, pdftoppm and tesseract; zero npm deps. |
| `criterion3-export/` | Exports the blind-labeler inputs for pre-registration criterion 3 (`docs/research/criterion3/`): the canonical corpus and the frozen items with opaque ids, a leakage report with a control, and the SHA-256 freeze. Run via `bun run atlas:c3-export [-- --copy <dir>]`. Zero npm deps. |
| `criterion3-study/` | Criterion 3 after the export: `labels.ts` copies the two blind labelers' files into `docs/research/criterion3/labels/` byte for byte and derives the PRIMARY and SECONDARY truth sets (`truth.json`). Run via `bun run atlas:c3-labels -- --labels <dir>`. `run.ts` runs the three in-process retrieval conditions after checking every pin of Amendment 8, and writes `results-interim.json` / `.md`. Run via `bun run atlas:c3-run -- --write`, then `bun run atlas:study`. `embedding.ts` is the embedding condition (Amendment 11): `embed` writes frozen vectors once; `score` checks the Amendment 8 and 11 pins and the amendment's commit and CI, then writes `results-embedding.json` / `.md` with the verdict. Zero npm deps. |
| `chunking-for-files/` | Splits large markdown/JSON/TypeScript files into editable chunks and merges them back. Zero deps. |
| `compress-for-context/` | Compresses files (JSON/YAML/MD/CSV/code/etc.) to fit LLM context windows; reversible. Zero deps. |

## node_modules is not committed

Tool dependencies are installed per-tool and are gitignored
(`tools/**/node_modules` in the root `.gitignore`). Only
`create-dependency-graph` currently has a runtime dependency — install it
before first use:

```bash
cd tools/create-dependency-graph && npm install
```

The other three tools use only Node built-ins and run directly with
`npx tsx <tool>.ts` — no `npm install` needed.
