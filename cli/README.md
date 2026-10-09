# `upt` — Universal Physics Tensor CLI

Every flag, with its default, is generated into [`docs/CLI.md`](../docs/CLI.md) from the command
registry (`bun scripts/cli-reference.ts`). This file keeps the exit codes, the input syntax, and
the troubleshooting notes.

A small command-line interface over the UPT bridge-inference and
canonical-physics suite, for exploring the catalog and the composition graph
**without reading any TypeScript**.

> **Where the tool lives.** The executable is `bin/upt.mjs` (wired to the `upt`
> binary via the `"bin"` field in the root `package.json`). This `cli/` folder
> holds its documentation; it does not relocate the script, so the published
> `upt` command and all `npm run` aliases keep working unchanged.

The CLI is a thin presentation layer. Every command calls the same public API
and internal analysis modules the test-suite exercises — it fabricates nothing,
and it never mutates the catalog.

---

## Requirements

- **Node.js ≥ 18** (the package is ESM, `"type": "module"`).
- **Bun ≥ 1.4.2** for the repository scripts (`package.json` pins `packageManager` to `bun@1.4.2`). Node does not install that Bun: `corepack prepare bun@1.4.2 --activate` exits with `Unsupported package manager specification`. Install it from <https://bun.sh/install>, then `bun install` and `bun run build`.
- A **built checkout**. The CLI loads from `dist/`, so you must compile first. With only Node, from a clone:

  ```bash
  npm install
  npm run build      # tsc → dist/
  node bin/upt.mjs help
  ```

  The MathTS packages are required dependencies, so formula commands use the MathTS parser. `upt eval --debug` names it.

  If you skip the build you'll see:

  > `Could not load the built package. Run \`npm run build\` first.`

---

## Running the CLI

There are three equivalent ways to invoke it. Pick whichever fits your setup.

| Context | Command |
|---|---|
| Built checkout (direct) | `node bin/upt.mjs <command> [args]` |
| Built checkout (npm script) | `npm run upt -- <command> [args]` |
| Installed package | `npx universal-physics-tensor <command> [args]` &nbsp;→ exposes `upt` |

When using the **`npm run upt --`** form, the `--` is required so npm forwards
the rest of the arguments to the script rather than consuming them itself.

Two convenience script aliases also exist in `package.json`:

```bash
npm run explain          # → node bin/upt.mjs explain
npm run bridge-priority  # → node bin/upt.mjs priority
```

### Quick start

```bash
# No arguments → a short demo (explains Hawking temperature, then prints the
# bridge-priority board):
node bin/upt.mjs

# Full usage text:
node bin/upt.mjs help        # also: --help, -h
```

---

## Command reference

Every command the registry holds, grouped as the registry groups them. The tables between the markers are written by `bun scripts/cli-reference.ts` from the command registry; edit a command's own `summary` and `group`, not this file. Every data-bearing command (all but `help` and `version`) also accepts `--json` for a machine-readable envelope instead of text; see [JSON output](#json-output).

<!-- cli-reference:commands -->
30 commands: 28 registered, plus `help` and `version`.

**Evaluate and check**

| Command | What it does |
|---|---|
| `audit` | Derive every bridge equation by dimensions and sort derived, coefficient unset, decoy, not a monomial, and open. |
| `derive` (`dim`) | Derive the dimensional form of your own equation and, with --formula, the prefactor. |
| `eval` (`calc`) | Evaluate a scalar formula. A bare e is the elementary charge; Euler's number is exp(x). |
| `evaluate` | Evaluate a closed-form bridge or an applied case, with units on every input. |
| `metric` (`curvature`) | Print Christoffel symbols and curvature scalars for one exact metric. |
| `symbolic` (`compose-symbolic`) | Compose the symbolic forms of the registered bridge chains. |

**Explore bridges and the atlas**

| Command | What it does |
|---|---|
| `atlas` | Show one atlas bridge with its relation, regime, bound, witnesses, and formal reference. |
| `canonical` (`laws`) | List the canonical-equation registry, its fidelity, and the coverage gap. |
| `explain` | Show how the graph determines a quantity, or say that it does not cover that name. |
| `map` (`linkage`) | Show how equations link, or where your own equation lands on that graph. |
| `path` | Show the bridge chain between two models and whether a bound is claimed there. |
| `recover` (`recovery`, `validate`) | Classify each bridge-to-canonical link as restates, recovers, or dimensional-only. |
| `regime` | Report where a family's models are valid, violated, or unknown. |
| `search` | Find a bridge, equation, model, quantity, case, or regime by the words in its record. |

**Discovery and probes**

| Command | What it does |
|---|---|
| `axes` (`axis-audit`) | Report which tensor classification axes gate the discovery funnel. |
| `candidates` (`propose`) | Propose same-dimension links between clusters for physicist review. |
| `connectors` (`orphans`) | Find same-dimension identifications that would pull an isolated bridge into the core. |
| `discover` (`discovery`) | Vet quantity identifications and rank them promising, inert, or contradictory. |
| `frontier` | Print null results and missing connections as two lists, neither of them a score. |
| `ground` | Show which falsifiers ran on one discovery candidate, and which abstained. |
| `predict` (`predictions`) | Rank empty regime cells as undiscovered-connection hypotheses. |
| `priority` (`prioritize`, `triage`) | Triage speculative bridges by structural decidability, not by credibility. |
| `probe` | Search expressions and residuals. This is not `upt discover`. |

**Data and confrontation**

| Command | What it does |
|---|---|
| `confront` | Run the committed predicted-versus-observed confrontations. |
| `coverage` (`grounding`) | Count catalog bridges by empirical grounding tier. |
| `retrieve` | Search the atlas for a claim. --embed asks a local Ollama model and does not accept that order. |
| `testplan` | Print the measurement plan stored on a confrontation or an applied case. |

**Utilities**

| Command | What it does |
|---|---|
| `help` | Show every command, or one command's usage and flags. `upt help statuses` defines the status words. |
| `version` | Print the installed package version as one semver line. |
| `chain` | Name the internal chain orchestrator and exit 2. It does not run it. |
<!-- /cli-reference:commands -->

Global options, read before the command:

<!-- cli-reference:globals -->
| Option | Default | What it does |
|---|---|---|
| `--help` |  | Show this command list, or `upt help <command>` for one command. `-h` is the same. `upt <command> --help` prints that command. |
| `--version` |  | Print the package version as one semver line and exit. `-v` and `upt version` are the same. Neither takes --json. |
| `--json` |  | Write a JSON envelope to stdout instead of the text report. |
| `--record` |  | Run the following command unchanged and append one JSONL entry to FILE: arguments, stdout, stderr, exit code, versions, and hashes. A failed run is recorded too. |
| `--replay` |  | Re-run every entry of FILE and report reproduced, differs, or not replayable. Takes no command. `--json` after it selects the JSON report. Exit 0 when every entry is reproduced and unchanged, 3 when any differs, 1 otherwise. |
| `--show-record` |  | Print FILE as a transcript and run nothing. Takes no command. `--json` after it selects the JSON report. |
<!-- /cli-reference:globals -->

`upt chain` is registered and is not one of those commands. `upt help` does
not list it. Running it prints that the chain orchestrator stays internal,
that a chain is provisional and is not written to the catalog, and that the
command does not run the orchestrator, then exits 2. The design is
`https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/docs/planning/Bridge-Discovery-Pipeline-Design.md`.
`upt help chain` prints that same status.

---

## The `--source` flag

The graph-analysis commands accept `--source=<which>` to choose which graph
the analysis runs over: `discover`, `ground`, `candidates`, `map`, `explain`,
`priority`, `audit`, `predict`, and `connectors` (`probe` also takes it; see `upt help probe`).

**Every result names what it used.** `explain`, `ground`, `discover`, `map`, `candidates` and
`connectors` print the effective source in their text banner and set `source` in `--json`, whether
or not `--source` was given. Where a result is relative to an anchor, it names that too, in text and
as the envelope's `anchor`. Two anchors exist, and they are different things: the discovery
**ground truth** (`discover`, `ground`, `map --proposed`; `--anchor=k=v`, default one solar mass),
printed as the values and whether they are the default; and the **anchored core** (`map`,
`candidates`, `connectors`), the clusters that hold at least one established-confidence edge,
printed with the count of such edges in the graph used. A bridge id given to `explain` is answered
from the catalog bridge registry whatever `--source` says, and the result says so.

| Value | Graph |
|---|---|
| `catalog` | The bridge-catalog graph (`CATALOG_GRAPH`); its banner label states the catalog size. |
| `canonical` | The standard-physics **L-layer alone** — every canonical equation as an `established` law edge, **with the speculative bridges excluded**. |
| `both` | The bridges **plus** the canonical established-physics backbone. |

**Per-command default:** `discover`, `candidates`, `explain`, `priority`,
`audit`, and `predict` default to `catalog`. `map` and `connectors` default
to `both` — they ask pure connectivity questions ("how does this graph
link together?"), so they answer against all known physics by default
rather than the bridge catalog alone; `--source=catalog` still gives the
catalog-only view for either command.

Running on `canonical` does two things:

1. **Finds candidates from established physics only** — e.g.
   `compton-wavelength ≟ de-broglie-wavelength` — without the speculation that
   pollutes the catalog run.
2. **Acts as a self-consistency check.** Standard physics, fed to the inference
   suite, must introduce no contradiction — so `discover --source=canonical`
   should report **0 contradictory** verdicts.

`--source=canonical` is honest about degenerate cases rather than erroring:
the canonical L-layer is all-established, so `priority --source=canonical`
prints `0 non-established bridges in this graph … triage is vacuous here.`
and exits `0` — it says so instead of printing an empty table.

```bash
# Run the discovery funnel on textbook physics alone:
node bin/upt.mjs discover --source=canonical

# Map the canonical graph's clusters:
node bin/upt.mjs map --source=canonical

# Bridges + canonical backbone together:
node bin/upt.mjs candidates --source=both
```

An unrecognised value exits with an error and status `1`.

---

## JSON output

Every data-bearing command (all 27 — every command in the tables above except
`help` and `version`) accepts a global `--json` flag: instead of the text
report, it prints one JSON envelope to stdout. The exit code is the text
command's exit code. A check that ran and failed is still exit 3 under
`--json`. A no-claim, including `cross-family-unmapped`, stays exit 0.

```bash
node bin/upt.mjs priority --json
node bin/upt.mjs explain hawking-temperature mass=1.989e30 --json
```

**Envelope shape:**

```ts
{
  command: string;                                  // e.g. "priority"
  source?: 'catalog' | 'canonical' | 'both';         // only on --source-bearing commands
  options?: Record<string, unknown>;                 // e.g. discover's max-orders/anchor
  anchor?: { groundTruth?: { values: Record<string, number>; isDefault: boolean };
            core?: { establishedEdges: number; edges: number } };  // what the result is relative to
  epistemics?: string;                                // the command's own "review surface, not truth" caveat
  definitions?: Record<string, string>;               // the meaning of each status the command can emit
  result: unknown;                                    // the same library object the text report is printed from
}
```

**Status words.** `upt help statuses` defines every status word the commands print, from one table
(`src/cli/statuses.ts`). `definitions` holds the entries for the statuses the envelope's command can
emit; a command that emits none has no `definitions`. A word can name different statuses in different
commands (`decoy` in `audit` and in `discover`), and each envelope defines its own command's.

**`discover`'s additive fields.** Every candidate in `result` (unless `--derive`
is also set) carries an optional `adjudication: {id, verdict, grounds, source,
date}` when the ledger has one — including folded (`decoy`/`entailed`)
candidates, since `--json` never folds, only the text report does. The
envelope also gains a top-level `adjudicationSummary: {total, genuine, decoy,
entailed, deferred}`, tallied over every candidate in `result` regardless of
funnel bucket. Every `promising` candidate also carries an optional
`consequence: {signal, evidence}` field — `signal` is
`entailed | novel-consequence | inconclusive`, `evidence` is the array of
`{target, governing, derivedNormalForm, canonicalMatch, sourceEquationIds}`
records backing the signal (empty for `inconclusive`). Annotation-only: it
never changes which bucket a candidate falls into.

**Sanitizer contract.** `result` is deep-copied through a JSON-safe sanitizer
before printing, because physics results genuinely contain non-finite numbers
(e.g. `anchoring: Infinity` in the priority board) that `JSON.stringify`
would otherwise silently turn into `null`:

- `NaN` / `Infinity` / `-Infinity` → the strings `"NaN"` / `"Infinity"` /
  `"-Infinity"` (so round-tripping through JSON preserves them instead of
  losing them to `null`).
- Functions are dropped (omitted from objects/`Map`s, `null` in arrays).
- `Map` values become plain objects (string-keyed).

**Errors never emit a JSON envelope.** A failing invocation — bad usage, a
runtime `CliError`, an unknown flag — always prints plain text to stderr and
exits non-zero with **empty stdout**, `--json` or not. That means **zero-exit
stdout is always parseable JSON** on a `--json` invocation; a consumer never
needs to guess whether stdout holds an error payload.

`map`'s visual formats and `--json` are two different output forms — combine
them and the command refuses rather than picking one silently:

```bash
node bin/upt.mjs map --json --format=mermaid
# upt: pick one output form: --json or --format   (exit 2)
```

---

## Session record

`--record=FILE`, placed **before** the command, runs it unchanged (same stdout,
stderr and exit code) and appends one JSON line to FILE: the arguments as given
and as parsed, stdout, stderr, the exit code, and the environment — package
version, Node version, the active formula parser, whether the MathTS simplifier
is available, each MathTS package's installed version, the optional `@viz-js/viz` version, and every constant table,
each named by its source module (`core/constants`, `dimensional/units`,
`dimensional/symbolic-constants`, `composition/canonical-graph`, and each
`bridges/*` or `cases/*` module that exports a number) with its own fingerprint.
The arguments, each stream and the entry as a whole are hashed. Each entry also
carries an **attribution**: the constants its command's code can reach through
the import graph — a static upper bound, not a record of what it read. Failed
invocations are recorded like the others, so a record keeps the attempts that
were refused. A `map --out=PATH` entry also records the written file's SHA-256.
An entry also hashes the **files it reads** (`probe`'s `--problem`, `--h1`,
`--h2`, `--bounds`, `--data`, `--replication` and the observations file a
problem names; the witness-results artifact `--stored` reads) and the **source
of every module** its command loads, so a changed literal that no constant table
holds is still named, as a change to its module.

```bash
node bin/upt.mjs --record=session.jsonl evaluate be-58 T_K=300 R_ohm=1000
node bin/upt.mjs --record=session.jsonl eval "ln(x)" x=-1          # exit 2, recorded
node bin/upt.mjs --show-record=session.jsonl                       # readable transcript
```

`--show-record=FILE` prints the record as a transcript — the environment, then
each invocation as `$ upt …` with its exit code and output (`|` stdout, `!`
stderr) — without running anything; `--show-record=FILE --json` emits the entries
in the JSON envelope. The file is opened before the command runs, so an
unwritable path exits `1` without running it. A `--record` after the command is
that command's (unknown) flag. Design:
`docs/planning/Experiment-Record-Replay-Design-Note.md`.

`--replay=FILE [--json]` re-runs every entry in-process and compares exit code,
stdout and stderr byte for byte. Each entry is exactly one of:

- **reproduced** — all three identical (and a file written with `--out`, which
  the replay writes to a temporary path, never over PATH, has the recorded
  SHA-256);
- **differs** — the differing streams (or the written file, `artifact`) are
  named, each with its first differing line, recorded and replayed;
- **not replayable** — not re-run, or not compared, with the reason: an
  unreadable line; an `--out` entry that wrote no file; a probe run with an
  external `--worker`; a file it read that changed, vanished or appeared since
  recording (named with its flag); or a probe search whose recorded or replayed
  output says it stopped on its wall-clock budget (`stop: time-limit`).

Beside the outcome, replay names every environment fact that changed since
recording (`uptVersion`, `node`, `formulaParser`, `simplifier`, `peer <name>`,
`constant <table> <NAME>`, `table <table> sha256`, `module <name>`), and marks each changed
constant **reachable** or **not reachable** from the entry's command by its
attribution. It flags a record edited after it was written (arguments, a stream,
a constant table or the entry itself no longer matching its recorded hash). It
names what changed; it does not claim the change caused a difference. Exit `0`
when every entry reproduced under an unchanged environment with no edit found,
`3` when any entry differs, `1` otherwise (not replayable, changed environment,
edited record, missing or empty file).

```bash
node bin/upt.mjs --replay=session.jsonl
# [line 1] $ upt evaluate be-58 T_K=300 R_ohm=1000
#     reproduced — exit 0, stdout and stderr identical
# [line 2] $ upt eval 'ln(x)' x=-1
#     reproduced — exit 2, stdout and stderr identical
# summary: 2 reproduced, 0 differ, 0 not replayable; environment changed for 0 of 2; 0 integrity findings
```

---

## Worked examples

```bash
# Explain how Hawking temperature is determined from a solar mass:
node bin/upt.mjs explain hawking-temperature mass=1.989e30

# Triage which speculative bridges are closest to being decidable:
node bin/upt.mjs priority

# List the canonical registry and the bridge↔canonical recovery scan:
node bin/upt.mjs canonical
node bin/upt.mjs recover

# Render the physics map. Mermaid (renders inline in GitHub/Markdown):
node bin/upt.mjs map --source=both --format=mermaid --out=docs/architecture/maps/both.mmd
# SVG in one step (needs the optional @viz-js/viz peer — npm i @viz-js/viz):
node bin/upt.mjs map --source=both --format=svg --out=both.svg
# ...or DOT → SVG via a system Graphviz instead of the peer:
node bin/upt.mjs map --source=both --format=dot | dot -Tsvg > both.svg
# Overlay the unadjudicated proposed relations (gray dashed):
node bin/upt.mjs map --source=both --relation=derivation
# only the edges whose DERIVED evidence contains a tag (nothing is stored)
node bin/upt.mjs map --source=both --evidence=proposed --format=dot

node bin/upt.mjs map --source=both --proposed --format=mermaid
# Inject YOUR OWN equation: dimensional check + where it lands in the graph:
node bin/upt.mjs map --source=canonical --equation "period = 2*pi*sqrt(length/gravity)"
#   → ✓ dimensionally consistent: [time]; joins the anchored cluster via {gravity, length, period}
#   → ✓ agrees with CE-pendulum-period, prefactor included (2π from the sourced prefactor table)
node bin/upt.mjs map --source=canonical --equation "period = pi*sqrt(length/gravity)"
#   → ⚠ differs from CE-pendulum-period by a constant factor: yours/canonical = 0.500000
node bin/upt.mjs map --equation "hawking_temperature = hbar*c^3/(4*pi*G*mass*k_B)"
#   → ⚠ differs from CE-hawking-temperature by a constant factor: yours/canonical = 2.00000
node bin/upt.mjs map --source=canonical --equation "period = mass"
#   → ⚠ dimensional MISMATCH: RHS is [mass] but the target is [time]
node bin/upt.mjs map --source=canonical --equation "period = uu / gravity"
#   → ⚠ 'uu' is unknown — by its inferred dimension, did you mean: speed?
node bin/upt.mjs map --source=both --equation "photon_energy = h * nu" --format=svg --out=mine.svg

# Compose symbolic bridge forms, then simplify the composed AST:
node bin/upt.mjs symbolic --simplify

# Evaluate your own formula (Hawking temperature, SI units):
node bin/upt.mjs eval "hbar*c^3/(8*pi*G*M*k_B)" \
    hbar=1.054571817e-34 c=299792458 G=6.6743e-11 \
    M=1.989e30 k_B=1.380649e-23

# Derive your own equation's dimensional form and recover its prefactor:
node bin/upt.mjs derive period:time length:length gravity:acceleration \
    --formula "2*pi*sqrt(length/gravity)"

# Run every committed real-data confrontation:
node bin/upt.mjs confront
# Just be-37 (Cassini Shapiro-delay PPN gamma), with the deciding-measurement
# elasticity ranking:
node bin/upt.mjs confront --bridge=be-37 --sensitivity
```

### Input syntax notes

- **`explain` inputs** are either a set of `name=value` pairs (numeric anchor,
  used to recover values) **or** a set of bare `name`s (treated as "known but
  unmeasured"). If any argument carries a numeric value, the whole set is read
  as values; otherwise as names.
- **`eval`/`derive`** read `name=value` pairs for the supplied variables.
- A **`<dim>`** in `derive` is a named dimension (`length`, `time`, `mass`,
  `velocity`, …), a constant (`hbar`, `c`, `G`, `k_B`, `e`), or an explicit
  exponent form like `L^3.M^-1.T^-2`.

---

## Reading the output

The discovery-style commands print **review surfaces, not discoveries**. A
`promising` verdict means "worth a physicist's minute", not "true"; a shared
dimension is a weak prior. The commands say so in their own headers — take them
at their word. The triage/`priority` ranking is about **decidability**, which is
orthogonal to whether a bridge is correct.

**`discover`'s adjudication fold-out.** Some PROMISING candidates have already
been put to a physicist (recorded in `src/composition/adjudication.ts`, sourced
from `docs/research/*-adjudication.md`). This is **review memory, not a
re-litigation prompt**: it never touches the catalog or the funnel itself
(`rankDiscoveries` is unchanged) — it only annotates what the command prints.
Only the `decoy` (dimensional coincidence, no mechanism) and `entailed`
(real physics, but already carried by the L-layer — not a new link) verdicts
fold a candidate out of the default PROMISING listing; `deferred` and
`genuine` verdicts stay listed, each with an `[adjudicated: …]` trailer giving
the verdict and its grounds. When any of the PROMISING set carries a verdict,
an `adjudicated: N of the M promising carry recorded verdicts (…) — …` line
is printed underneath so the shorter list never looks inconsistent against the
funnel count above it. Pass `--show-adjudicated` to re-list the folded
candidates.

---

## Flags summary

Every flag a registered command parses, written by `bun scripts/cli-reference.ts` from the registry (a flag whose sentence differs between commands lists each command's own sentence).

<!-- cli-reference:flags -->
| Flag | Commands | What it does |
|---|---|---|
| `--all` | `probe` | scan: include Product A wrappers, which are not searchable here. |
| `--all-routes` | `map` | With --route, list every simple route, shortest first. |
| `--alpha` | `probe` | study: χ² test level. |
| `--anchor` | `discover`, `ground`, `map` | discover: Override a numeric anchor as k=v or k=v,k2=v2. ground: Override a numeric anchor as k=v or k=v,k2=v2. map: Override a numeric anchor as k=v for the --proposed overlay. |
| `--around` | `map` | Keep edges within --depth shared-quantity hops of QUANTITY. |
| `--assume` | `regime` | Record a prose premise as your declaration. It is not evidence and it is not evaluated. |
| `--at` | `path`, `regime` | State one regime coordinate as group=value. A value may be an expression such as pi/2. |
| `--bind-short` | `map` | Bind a one-letter catalog name in --equation. Without it, those names are reported and not bound. |
| `--bounds` | `probe` | Bounds for design, as the design subverb reads them. |
| `--bridge` | `confront` | Select one bridge id, the same selection as a positional be-XX. |
| `--budget-ms` | `probe` | Wall-clock cap in milliseconds. |
| `--compare` | `path` | Sweep a second route from the same source to this model id and mark NEITHER where no limit applies. |
| `--corr` | `evaluate` | A pairwise correlation as a,b=rho, used with --sigma. |
| `--csv` | `path` | Write sweep rows as CSV. |
| `--data` | `probe` | Study file (JSON, or CSV when the name ends in .csv) for study. |
| `--debug` | `derive`, `eval` | Print the formula parser name and version on stderr. |
| `--deny` | `regime` | Mark one prose premise contradicted. The others stay unspecified. |
| `--depth` | `map` | Hop count for --around. |
| `--derive` | `discover` | For each promising identification, print the one algebraic relation it implies. That relation is not a bridge. |
| `--embed` | `retrieve` | Ask a local Ollama model for an order. Acceptance stays the atlas search. A failure of Ollama still prints that search and exits 0. |
| `--equation` | `map` | Inject TARGET = EXPR as a user node and report where it lands. |
| `--equation-only` | `map` | Print only the equation verdict. Errors when --equation is missing. |
| `--evidence` | `atlas`, `map` | atlas: With no bridge id, list every bridge's derived evidence and the witness results it observes. map: Keep atlas edges whose derived evidence set contains TAG. |
| `--family` | `map` | Map one atlas family by name. |
| `--format` | `map` | Output form: text, mermaid, dot, or svg. svg needs the optional @viz-js/viz peer. |
| `--formula` | `derive` | Check EXPR against the declared dimensions and recover the dimensionless prefactor. |
| `--frontier` | `confront` | Rank the σ-tests by margin to this tool's 1σ acceptance line. That line is a software criterion. |
| `--geodesic` | `metric` | Integrate a short Schwarzschild circular orbit, or a Kerr geodesic at the given θ. |
| `--geometrized` | `eval`, `map` | eval: Set ħ = c = G = 1 when reading values. map: With the natural-unit rules, also set G = 1. |
| `--h1` | `probe` | First hypothesis for design. |
| `--h2` | `probe` | Second hypothesis for design. |
| `--holdout-tol` | `probe` | Relative holdout RMSE cap. |
| `--json` | `atlas`, `audit`, `axes`, `candidates`, `canonical`, `confront`, `connectors`, `coverage`, `derive`, `discover`, `eval`, `evaluate`, `explain`, `frontier`, `ground`, `map`, `metric`, `path`, `predict`, `priority`, `probe`, `recover`, `regime`, `retrieve`, `search`, `symbolic`, `testplan` | Write a JSON envelope to stdout instead of the text report. |
| `--max-orders` | `discover`, `ground`, `map` | discover: Magnitude-clash threshold. A larger value keeps more pairs promising. ground: Magnitude-clash threshold. A larger value keeps more pairs promising. map: Magnitude-clash threshold for the --proposed overlay. |
| `--max-routes` | `map` | Cap on --all-routes. The maximum accepted is 1000. |
| `--natural` | `eval`, `map` | eval: Set ħ = c = 1 (and h = 2π) when reading values. map: Set ħ = c = 1 when a dimension difference is a power of those constants. |
| `--observable` | `map` | Map bridges whose recorded text names this observable. |
| `--ollama-url` | `retrieve` | Ollama base URL. Used only with --embed. |
| `--out` | `map` | Write the report to PATH instead of stdout. |
| `--problem` | `probe` | Problem JSON file for run, candidates, falsify, rank, and reproduce. |
| `--proposed` | `map` | Overlay unadjudicated identity-consequence relations. |
| `--relation` | `map` | Keep atlas edges whose recorded relation is TYPE. |
| `--replication` | `probe` | study: replication rows from a separate JSON or CSV file. |
| `--require-falsifier` | `discover` | Hide promising rows that no independent falsifier ran on and survived. |
| `--rigor` | `confront` | Show one rigor tier: stringent, moderate, or loose. |
| `--route` | `map` | Map the atlas route FROM,TO instead of the equation graph. |
| `--run` | `atlas`, `map` | atlas: Execute the in-process registered witnesses. Exit 3 if one is refuted. map: Run the shown bridges' in-process witnesses now. Exit 3 if one is refuted. |
| `--searchable-only` | `probe` | scan: list only Product-B-searchable gaps. This is the default. |
| `--sensitivity` | `confront` | Rank the prediction's input elasticities. Value-kind records only. |
| `--show-adjudicated` | `discover` | List candidates a physicist has already adjudicated, with the recorded verdict. |
| `--show-parser` | `eval` | Print mathts. With no formula, that is the whole output and the exit code is 0. |
| `--sigma` | `evaluate` | One input uncertainty as key=u, in the input's unit. A temperature uncertainty in degC or degF is a difference. |
| `--simplify` | `symbolic` | Fold each composed AST with MathTS, then check the fold dimensionally and numerically. |
| `--source` | `audit`, `candidates`, `connectors`, `discover`, `explain`, `ground`, `map`, `predict`, `priority`, `probe` | audit: Which graph to read: catalog, canonical, or both. candidates: Which graph to read: catalog, canonical, or both. connectors: Which graph to read: catalog, canonical, or both. This command defaults to both. discover: Which graph to read: catalog, canonical, or both. canonical excludes bridges. explain: Which graph to read: catalog, canonical, or both. ground: Which graph to read: catalog, canonical, or both. Use the same value as the discover run. map: Which graph to draw: catalog, canonical, or both. This command defaults to both. predict: Which graph to read: catalog, canonical, or both. priority: Which graph to read: catalog, canonical, or both. probe: Which graph a subverb reads: catalog, canonical, or both. |
| `--stored` | `atlas`, `map` | atlas: Read witness results from https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/data/atlas/witness-results.json. That file is not in the published package; the command then names --run. map: Derive evidence from https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/data/atlas/witness-results.json. That file is not in the published package; the command then names --run. |
| `--sweep` | `path` | Sample one coordinate as name=lo:hi:n or name=lo:hi:n:log, with n from 2 to 200. |
| `--tolerance` | `path` | Judge adequacy against EPS in the bound's norm, or name:EPS through a declared translation. Exit 3 when inadequate. |
| `--vars` | `canonical` | Also print each entry's target and governing variable names. |
| `--verbose` | `map` | With --equation, also print the linkage map. |
| `--worker` | `probe` | Optional NDJSON worker, spawned as node PATH. The path must be a .js, .mjs, or .cjs file. |
<!-- /cli-reference:flags -->


### `upt map` filtering changes what a MISSING overlay means

Unfiltered, an edge that records no Atlas `relation` is **kept**: the map answers a
connectivity question, and an unaudited edge still connects two quantities.

Set `--relation=` or `--evidence=` and that same edge is **dropped**, because nothing
shows it satisfies the filter. The legend therefore reports two counts, never one:

```
filter: relation=derivation — 6 of 66 kept; 1 dropped (did not match); 59 dropped (no overlay metadata)
```

`did not match` is an answer. `no overlay metadata` is the absence of one. A single
combined figure would let a graph nobody has audited render as a complete result. Both
counts print even when they are zero — an omitted line and a zero are indistinguishable
to a reader.

An edge with no numeric `beId` (a diagonal law edge, every `--source=canonical` edge)
cannot have its evidence derived at all, so `--evidence=` counts it as lacking metadata
rather than as not matching.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | Bad `--source`/`--format` value, empty `--out=`, an invalid or unregistered `confront --bridge` value, an unknown `regime` family, an unknown `path` model id, an `explain` name that is not a quantity of the graph (NOT COVERED), a malformed `--at` assignment, a non-numeric `upt eval` or `upt evaluate` binding value (`x=nope`, `mu_e=nope`, an empty value after `=`, a non-finite value), a Kerr `--geodesic` with a non-positive mass or with `|a|` above GM/c², the optional SVG renderer is missing, or the built package could not be loaded. **A `path` that carries no composite claim is NOT an error — it exits 0.** |
| `2` | Usage error: missing required argument, unparseable expression syntax, a binding with no `=`, unknown command, an **unknown/mistyped flag** (e.g. `--sourc=canonical`), a malformed or dimensionally non-homogeneous `--equation`, or combining `--json` with `map --format=mermaid\|dot\|svg`. |
| `3` | **The command ran and its check came out negative** (since 0.47.0): `derive --formula` whose dimension differs from the target, that does not match the dimensional monomial, or that differs from the canonical equation by a factor or in form; `map --equation` with a dimension mismatch (every name resolved) or a canonical difference; `path` with a violated regime or horizon at the `--at` point; `regime` when any record is VIOLATED; an applied case whose regime check fails; `--replay` with an entry whose output differs from the record. An UNKNOWN result, where a coordinate was not supplied or a name did not resolve, is not a failure and exits `0`. A `regime` survey that is VACUOUS or UNKNOWN, with no violated record, exits `0`. |

---

## Hardening

**Unknown flags are rejected, not silently ignored.** This is the one
behavior change from earlier releases: a mistyped or unsupported flag (e.g.
`upt discover --sourc=canonical`) used to be swallowed without effect; it now
exits `2` with a diagnostic naming the bad flag and the command
(`upt: unknown flag '--sourc' for 'discover' (see upt help discover)`). Every
command's flag set is fixed and typed — a flag valid on one command but not
another (e.g. `upt derive --source=catalog`) is rejected the same way, since
`--source`/`--json`/etc. are per-command, not global.

## Troubleshooting

- **"Could not load the built package."** Run `npm run build` first. The `upt`
  binary (`bin/upt.mjs`) is now a thin shim — it resolves and imports
  `dist/cli/main.js`, where all the real logic lives (`src/cli/` compiled by
  `tsc`); the CLI still runs entirely from `dist/`, never from `src/`, so the
  build-first requirement is unchanged.
- **Windows cold-start.** The test suite (run by `prepublishOnly`) has a 3–5 min
  cold-start tax on Windows; the CLI itself does not. The release publish is
  `.github/workflows/publish.yml`, which does not pass `--ignore-scripts`, so
  `prepublishOnly` still runs. The CLI resolves `dist/` paths via
  `pathToFileURL`, so absolute Windows paths work under Node's ESM loader.
- **`npm run upt` swallows my flags.** Use the `--` separator:
  `npm run upt -- discover --source=canonical`.
