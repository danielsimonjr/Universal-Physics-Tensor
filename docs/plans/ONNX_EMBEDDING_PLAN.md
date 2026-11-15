# Plan: an in-process ONNX embedder for `upt retrieve --embed`

## 0. The decision that comes first: the study record

The criterion 3 study is closed (pre-registration Amendments 11 and 12). Its embedding condition
used `qwen3-embedding:4b` through Ollama, 2,560 dimensions, scored from the frozen file
`docs/research/criterion3/embeddings/qwen3-embedding-4b.json` (SHA-256 `8fd79d2c…`).

Two options:

- **(a) Recommended. Keep the study record. Change only the live path.** The frozen file, its hash,
  `FROZEN_VECTOR_DIMS = 2560`, `FROZEN_VECTOR_SHA256` and the frozen-file test stay unchanged. That
  test reads the file and never embeds, so it does not need the 4b model. The new embedder serves
  only the live `--embed` path. A new pre-registration amendment records the owner decision that
  replaces Amendment 12 item (b), which named `qwen3-embedding:4b` for the future hybrid work. The
  amendment re-runs nothing and re-scores nothing. It quotes the owner decision verbatim with its
  date, as Amendment 12 does: "For UPT, we need to plan to use an ONNX Runtime enable embedding like
  transformerjs instead of qwen3 embedding 4b." (2026-11-15).
- **(b) Register a new embedding condition.** A new amendment registers the ONNX model, its file
  hash, the query form and a new frozen vector file before any score. The condition is then scored
  beside the closed one. This re-opens a closed study, so it needs an explicit owner decision.

The rest of this plan assumes (a).

## 1. Goal

`upt retrieve --embed` computes embeddings in process with ONNX Runtime, through
`@huggingface/transformers` (transformers.js). No Ollama process, no GPU and no network service are
necessary after the model files are in the local cache.

The design rules of `docs/design/tier-11-hybrid-retrieval.md` stay:

- An embedding order is a proposal. `rankByStructure` accepts. Cosine similarity does not enter that
  score.
- The default command path does not call out of process and does not import an embedding library.
- A failed `--embed` prints the atlas search and a named reason, and exits 0.

## 2. Model

| Candidate | Width | Files (from the Hub listing) | Verdict |
|---|---|---|---|
| `onnx-community/Qwen3-Embedding-0.6B-ONNX`, dtype `q8` | 1024 | `onnx/model_quantized.onnx` 614 MB | **Default.** Same family and query form as the study model. Card shows transformers.js use. |
| same repository, dtype `fp16` | 1024 | `onnx/model_fp16.onnx` + data 1.20 GB | Option for a caller that wants less quantization error. |
| same repository, dtype `fp32` | 1024 | `onnx/model.onnx` + data 2.40 GB | Reference only. |
| `onnx-community/Qwen3-Embedding-4B-ONNX` | 2560 | `model.onnx_data` 16.1 GB, fp32 only | Refused: too large for a CPU library default. |
| third-party INT8 builds of the 4B model (for example `mariusbrt/Qwen3-Embedding-4B-ONNX-int8`) | 2560 | not measured | Not chosen: not from `onnx-community`, and the 2560 width matters only under option (b). |

The width 1024 is `hidden_size` in the repository's `config.json`.

Facts from the model card that the implementation must obey:

- Pooling is `last_token`, and the vectors are L2-normalized (`pooling: "last_token", normalize: true`).
- The query form is `Instruct: <task>` newline `Query:<query>`. The card writes no space after
  `Query:`. The registered UPT form has a space. Keep the UPT form, and record the difference in the
  amendment. A spike measures whether the space changes the rank on the criterion 3 queries.
- Documents have no instruction prefix. This agrees with the registered UPT form.

The model id and the dtype are parameters with one default in one place. `--embed-model=ID` and a
new `--embed-dtype=q8|fp16|fp32` replace them.

## 3. Package shape

- `@huggingface/transformers` becomes an **optional peer dependency**, in the same pattern as
  `@viz-js/viz` (`peerDependenciesMeta.optional`, dynamic `import()` in one module).
- Version 4.3.2 depends on `onnxruntime-node` 1.30.0, `onnxruntime-web`, `sharp` and
  `@huggingface/tokenizers`. `sharp` and `onnxruntime-node` are native. An optional peer keeps them
  out of every install that does not ask for embeddings.
- Alternative, lighter but more code: `onnxruntime-node` plus `@huggingface/tokenizers`, with the
  tokenize, session, last-token pool and normalize steps written in UPT. Choose this only if spike 1
  shows that `sharp` fails to install on a supported platform.
- A new module `src/atlas/benchmark/onnx-embedder.ts` exports one `Embedder`. The `Embedder` seam of
  `hybrid-retrieval.ts` does not change.

## 4. Fallback reasons

The present reasons are Ollama-shaped. The in-process path adds these:

| Reason key | Text |
|---|---|
| `library-not-installed` | the embedding library is not installed |
| `model-not-cached` | the model is not in the local cache, and the download is not allowed or failed |
| `session-failed` | the ONNX session did not load |
| `reply-not-a-vector` | (existing) the reply is not a vector, or its length is not the expected length |
| `call-did-not-finish` | (existing) the call does not finish |

The first run downloads the model. A download must not count as "the call does not finish".
`--embed` therefore never downloads by default. A new `upt retrieve --fetch-model` downloads to the
transformers.js cache and prints the path and the file hash. The cache location is the
transformers.js cache setting, verified in spike 1, and an environment variable replaces it.

## 5. The Ollama backend and the version

"Instead of" removes the Ollama backend. Two forms:

- **Remove** `--ollama-url` and the Ollama embedder. This is a breaking CLI change, so the release is
  a major version.
- **Keep it behind `--embed-backend=ollama`**, with ONNX as the default. This is a minor version.

Recommendation: keep it for one major version as an explicit backend, then remove it. The
frozen-file test does not need either backend.

A kept Ollama backend needs a new default model, because `qwen3-embedding:4b` is not installed.
The default becomes `qwen3-embedding:8b`. The width rule `model === OLLAMA_EMBEDDING_MODEL ?
FROZEN_VECTOR_DIMS : undefined` then no longer applies to the live default: the frozen width is
checked only where the frozen file is read. `--embed-model` names a Hugging Face model id for the
ONNX backend and an Ollama tag for the Ollama backend.

## 6. Spikes before implementation

Each spike is a measurement, recorded in the PR body.

1. **Install and load.** The CLI runs under Node (`bin/upt.mjs`), and `onnxruntime-node` is a
   native addon. Load `@huggingface/transformers` 4.3.2 under Node 22 (the CI Node) and under the
   `engines.node` floor of `package.json`, on ubuntu-latest and on Windows 11. Install under bun 1.4.2
   (the CI pin). Record whether `sharp` and `onnxruntime-node` install and whether a session loads.
   If the addon needs a higher Node than the package floor, the optional path states that floor.
2. **Cost.** Cold load time, warm time per text, and peak resident memory for q8 and fp16, on the
   107 corpus records and 125 queries. Compare with the present `OLLAMA_TIMEOUT_MS = 5000`, and set
   the in-process timeout from the measured numbers.
3. **Agreement.** Recall at depth 10 on the criterion 3 PRIMARY queries, q8 against fp16. This is a
   disclosed measurement, not a study score, under option (a). The study is closed (Amendment 13:
   not re-run and not re-scored), so the new amendment explicitly authorizes this measurement as
   disclosed and non-scoring. Read the guard of `tools/criterion3-study/run.ts` before the run.
4. **The query space.** `Query: x` against `Query:x`: the count of queries whose top-10 changes.
5. **Determinism.** Two runs on the same input: byte-identical or not, and the minimum cosine
   between them.

## 7. Tests

- The stub embedder tests and the frozen-file test stay unchanged.
- New unit tests for `onnx-embedder.ts` inject a fake pipeline. They assert the pooling options, the
  query form, the width check and each new fallback reason. They do not load a model.
- `--embed` without the library installed gives `library-not-installed` and the atlas order, exit 0.
- One live test runs only when an environment variable names a cached model. CI does not run it.
- `tests/cli/golden/help.txt` is regenerated by running the CLI, not edited by hand.

## 8. Documentation

- `docs/design/tier-11-hybrid-retrieval.md` §2: the ONNX implementation replaces the Ollama one as the
  default. The sentence that the reply of the default model has the length of the frozen file
  changes: the frozen width applies only where the frozen file is read. §3 lists the new reasons. §5 "no new package dependency" becomes "no required
  dependency: the library is an optional peer".
- `src/cli/commands/retrieve.ts` help text, `README.md` and `ROADMAP.md` §8. `docs/CLI.md` is
  generated: run `bun scripts/cli-reference.ts`. Regenerate `tests/cli/golden/help.txt` by running
  the CLI.
- A new pre-registration amendment, as in section 0.
- `CHANGELOG.md` under Unreleased.
- The gates that fail on this change: `bun run docs:deps` (a new `src/` file moves the
  architecture claims), `bun scripts/readme-status.ts --check`, `bun scripts/cli-reference.ts
  --check`, `bun run layer:check`, `tests/internal/src-parses.test.ts`, and the two doc gates
  `repo-tools check . --docs=docs/architecture` and `repo-tools docs check src`.

## 9. Order of work

1. Owner decision on section 0 and section 5.
2. Spikes 1 and 2. Stop if spike 1 fails on a supported platform, and choose the lighter path of
   section 3.
3. The amendment, committed before any implementation.
4. Tests first, then `onnx-embedder.ts`, then the CLI flags, then the docs.
5. Spikes 3 to 5 as disclosed records.
6. PR for Mothership. Mothership merges and releases.
