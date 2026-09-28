# Experiment record and replay — design note

Design and intent only. State, results and history live in `NOTES.md`, `CHANGELOG.md` and
`todo.md`.

## Problem

A physicist who runs a sequence of `upt` invocations has no way, inside the CLI, to keep what was
run, what came out, and under which configuration. Reconstructing a session means an external
wrapper that captures arguments, streams, exit codes and hashes, and even then the environment
that produced the numbers (package version, the constant table, which optional parser answered)
is not written down. A colleague cannot tell whether a different number on their machine is a
different input, a different constant, or a different parser.

The record must keep **failures**: an `eval "ln(x)" x=-1` that exits 2 and an
`evaluate be-58 T_K=abc` that exits 1 are part of the analysis — they show which inputs were
tried and refused. A record that kept only the successful calls would present a cleaner history
than the one that happened.

## Surface

Three global options, placed **before** the command. They are not commands, so the command
registry, `upt --help`'s command list and every stated command count are unchanged.

```
upt --record=FILE <command> [args...]   run the command normally and append one entry to FILE
upt --replay=FILE [--json]              re-run every entry in FILE and compare
upt --show-record=FILE [--json]         print FILE as a readable transcript, running nothing
```

`--record` does not alter the command: stdout, stderr and the exit code are exactly what the
same invocation without `--record` produces. The file is opened for append **before** the
command runs, so an unwritable path fails (exit 1) without running anything rather than after
printing a result that was never recorded.

A global option after the command is the command's argument, and is refused by that command's
flag parser as it is today. `--record` combined with `--replay` or `--show-record` is a usage
error (exit 2), as is a missing or empty `FILE`.

## The record

JSON Lines, one entry per invocation, **append-only**. Appending never rewrites earlier entries,
so a failed invocation cannot be displaced by a later successful one, and several sessions can
accumulate in one file.

Each entry holds:

| Field | Content |
|---|---|
| `schema` | the entry format identifier, `upt-record/2` |
| `recordedAt` | ISO timestamp — **metadata only, never compared on replay** |
| `argv` | the command and its arguments exactly as given, global options removed |
| `argvSha256` | SHA-256 of `argv` |
| `parsed` | `{command, flags, positionals}` as the command's own flag parser read them, or `null` when there is no command (help, version, the demo) or the arguments did not parse |
| `attribution` | the constants the command's code can reach and the source hash of each module it loads (below), or `null` when `argv` names no command |
| `environment` | the facts below |
| `result` | `exitCode`, or `threw` (the message of an unexpected exception, with `exitCode: null`); `stdout`, `stderr`, and the SHA-256 of each |
| `artifacts` | files the invocation wrote (`map --out=PATH`): path and SHA-256 |
| `inputs` | files the invocation reads, hashed before it runs (below): the flag that named each, its path, and its SHA-256, or `null` when it was absent or unreadable |
| `entrySha256` | SHA-256 of every other field, serialised with object keys sorted at every depth |

`environment`:

| Field | Content |
|---|---|
| `uptVersion` | the package version (`upt version`) |
| `node` | `process.version` |
| `formulaParser` | `mathts` or `builtin` — the kind `getFormulaParserKind()` resolves, which is what `eval` and `derive` actually use |
| `simplifier` | whether the MathTS simplifier passes its smoke test (`symbolic --simplify`) |
| `peers` | for each optional peer dependency the package declares, the installed version or `null` |
| `constantTables` | every constant table, keyed by name: `{values, sha256}`, the SHA-256 of `values` serialised with sorted keys |

**Source selection, anchors, units, supplied inputs and assumptions** are recorded as the
invocation stated them: `--source`, `--anchor`, `--at`, `--assume`/`--deny` and `key=value[unit]`
positionals are in `argv` and in `parsed`. A default the command applied because a flag was absent
is not interpreted by the recorder; it appears in the command's own output (for example the
`--json` envelope's `source` and `options`), which the record keeps verbatim. The record states
what was asked and what was answered; it does not re-derive the command's semantics.

### Constant tables

A table is named by the source module that holds it, relative to the source root and without the
extension, and is fingerprinted on its own. There are two kinds:

- **module exports**: every numeric export of `core/constants` and of each module under `bridges/`
  and `cases/` (for example `bridges/be58-johnson-nyquist-confrontation`, which holds the CODATA
  2014 Boltzmann constant its confrontation compares against, and the regime thresholds of the
  applied cases). The modules are found by listing those directories, so a module added later is
  fingerprinted without being listed anywhere;
- **object tables**: the unit, prefix and degree-Celsius offset tables of `dimensional/units`, and
  the constant registries `composition/symbolic-constants` and `composition/canonical-graph`,
  flattened to `key.field` entries (`eV.scale`, `k_B.value`, `k_B.dimension`). A dimension is
  written as its exponents in a fixed base order, not through the named-dimension formatter, so
  renaming a dimension does not change a fingerprint.

A fingerprint alone says *that* a table changed. The values say *which*: replay compares each
recorded table against the live one and names each entry whose value moved, with its table, so a
changed Boltzmann constant is reported as `constant core/constants K_B_SI`, and the same value
seen through the symbolic registry as `constant composition/symbolic-constants k_B.value`.

### Attribution

Each entry records which constants its command's code **can reach**. It is derived from the
import graph of the modules on disk when the entry is written, never declared by hand, and it is
an **upper bound**, not an observation: ES module bindings cannot be intercepted as they are read,
so nothing here says which constants a run actually read. The derivation:

- start at the command's own module, `cli/commands/<command>`; follow every relative static
  import and re-export and every literal dynamic import, since loading a module runs its
  top-level code;
- a `cli/` module reaches the `cli-api` barrel through the injected `ctx.api`, not through an
  import, so each barrel export whose name occurs as a word in a reached `cli/` module counts as
  read from its source module;
- an import reads the names it binds (a namespace import reads all of them); a re-export passes on
  only the names that are themselves read from it, so a barrel that re-exports a constant nobody
  imports does not make it reachable;
- a named export of a module-exports table is reachable when it is read, or when its own module
  mentions it outside its declaration and some export of that module is read. Comments that open
  a line are ignored for that count; any other comment or string counts, which errs toward
  "reachable";
- an object table is reachable whole (`*`) when any export of its module is read.

The same import graph gives the **modules the command loads**, and `attribution.modules` holds the
SHA-256 of each one's source, keyed by module name as a table is named. A literal a module keeps
private (a bridge's solar luminosity, a prefactor inside an expression) is in no table; a change to
it changes its module's source hash, which replay names as `module <name>`, `reachable`. It names
the module, not the literal, and it also fires on an edit that changes no value (a comment).

Replay marks each changed constant (and each changed or missing table) `reachable`,
`not-reachable` or `unattributed` (no command, so no attribution). A changed table fingerprint
takes the reach of the values that changed with it — reachable if any of them is — and the table's
own reach only when no value changed (an edited fingerprint). `not-reachable` says the
command's code has no import path to that constant. `reachable` says only that it has one: an
`evaluate` entry reaches every bridge evaluator's constants whichever bridge it evaluated.

Attribution is **per command, not per entry**, and cannot be narrowed from the import graph: the
graph does not depend on the arguments, and ES modules load every static import before the command
runs, so every `evaluate` entry loads the same modules whichever bridge it names. An observed-read
attribution would have to see a module read its own private bindings, which never cross a module
boundary and cannot be intercepted from outside it; a hand-kept map from bridge id to module would
be declared rather than derived. Neither is done.

### Input files

A file an invocation reads is hashed before it runs, by rule from its parsed arguments:

- `probe`: the files named by `--problem`, `--h1`, `--h2`, `--bounds`, `--data` and
  `--replication`, and the observations file a problem file names (`observationsPath`, resolved
  as the problem loader resolves it), recorded under the flag `--problem observationsPath`;
- `atlas --stored` and `map --stored`: the committed witness-results artifact.

A file that is absent is recorded with `sha256: null`, so a run that failed because its input was
missing is replayed against the same absence.

## Replay

Each entry is re-run **in-process** through the same dispatcher, with the recorded `argv`, and
compared **byte for byte**: exit code (or thrown message), stdout, stderr. An entry that wrote a
file is re-run with `--out` pointed at a temporary path, never over the recorded one; the
temporary path is written back as the recorded path in the replayed streams, and the file is
compared by SHA-256 with the recorded artifact (a mismatch is the `artifact` difference). Every
entry gets exactly one of three outcomes, never merged:

| Outcome | Meaning |
|---|---|
| `reproduced` | exit code, stdout and stderr are identical |
| `differs` | at least one of them is not; each differing stream is named, with its first differing line (recorded and replayed text) and both hashes |
| `not-replayable` | the entry was not re-run, and the reason is stated |

Independently of the outcome, replay compares each entry's recorded `environment` with the live
one and lists every changed fact: version, Node, parser kind, simplifier, each peer, and each
constant by name. An entry can be `reproduced` under a changed environment; that is reported as
such, not folded into either "reproduced" or "differs". Replay names **what changed** and whether
the entry's command could reach it; it does not claim the change **caused** a difference.

Replay also checks the record against itself: an `argv`, `stdout` or `stderr` that no longer
hashes to its recorded SHA-256, a constant table whose values no longer hash to its `sha256`, or an
entry that no longer hashes to `entrySha256`, means the record was edited after it was written.
The entry hash covers every field, so an edit to one no other hash covers (`parsed`,
`attribution`, `recordedAt`, an environment fact) is still found. A missing hash is a finding too,
since the writer always writes them. An edited argument therefore shows up twice, as the
difference its replay produces and as an integrity finding, and the two are reported apart.

### Not replayable, by construction

An entry is `not-replayable`, with the reason printed, when:

- the line is not valid JSON or not a `upt-record/2` entry (the line number is given). A
  `upt-record/1` line is named as such: it predates the argument, entry and per-table hashes, so it
  cannot be checked for edits;
- it was to write a file (`--out=PATH`) and wrote none: there is no artifact to compare with,
  and a replay to another path would not repeat the failure;
- it ran an external probe worker (`--worker`): the worker's output is not UPT's and is not
  recorded;
- a file it read no longer hashes as recorded — changed, missing now, or present now though absent
  at recording — or it reads files and was recorded before input files were hashed. Each such
  file is named with its flag;
- it is a `probe` search whose recorded output states it stopped on its **wall-clock budget**
  (`stop: time-limit`, or `"stopReason": "time-limit"`): what it searched depends on the speed of
  the machine. When the recorded run did not stop on the budget and the replay does, the replay is
  reported not replayable for the same reason, and nothing is compared.

These are declared by rule from the record, the files and the runs' own stated stop reason, never
inferred from a mismatch of the outputs: output that depends on time is excluded explicitly
rather than compared and then ignored. A probe search that did not stop on its budget is
deterministic (its run id is a hash of its inputs), so it is compared like any other entry.
`recordedAt` is the only timestamp in an entry, and it is never compared.

### Exit status

| Code | When |
|---|---|
| `0` | every entry reproduced, no environment fact changed, no integrity finding |
| `3` | at least one entry `differs` — the replay ran and the check came out negative |
| `1` | nothing differs, but an entry was not replayable, an environment fact changed, or an integrity finding was raised; also a missing file or a record with no entries |

The exit code is the coarse signal; the report keeps `reproduced`, `differs`, `not-replayable`,
environment changes and integrity findings as separate counts.

## Readable and machine-readable forms

- The record file itself is the machine-readable form (JSONL).
- `--show-record` renders it as a transcript: the environment (printed once, and again only where
  it changes between entries), then each invocation as `$ upt …` with its exit code and its
  output, failures included.
- `--replay` prints a per-entry report and a summary; with `--json` it emits the CLI's JSON
  envelope (`command: "replay"`) holding every entry's outcome, differences and environment
  changes. `--show-record --json` emits the entries as one envelope.

## Limits

- The tables cover exported numeric constants of `core/constants`, `bridges/` and `cases/`, and the
  object tables named above. A literal a module keeps private (a bridge's atomic mass unit, a
  prefactor inside an expression) is in no table; a change to it is named only through its
  module's source hash, as a module change, not as the literal that moved.
- Module source hashes cover the modules in the command's static reach, not every module the
  process loads.
- Attribution is static. It does not see a value that reaches a command through shared state
  written at import time by a module outside the command's import graph, a non-literal dynamic
  import, or a mention on a line of a multi-line template literal that begins with `/*` or `//`
  (the comment filter drops it). It is computed from the
  modules on disk at recording, which are the modules that ran only if the tree was not changed
  in between.
- The hashes detect an edit that did not recompute them. They are not signatures: an editor who
  recomputes `argvSha256` and `entrySha256` is not detected.
- Replay runs in one process: module-level caches (the parser selection) are shared across the
  replayed entries, as they are within one CLI process, not as they are across separate processes.
- Input files are hashed, not captured: a replay needs the same files on disk, and one whose input
  changed is declared not replayable rather than replayed against the recorded bytes. Only the
  files named above are hashed; a probe worker script is not.
- A probe search near its wall-clock budget can stop on it in one run and not in the other; the
  rule declares that case, but it cannot make the two runs comparable.
- Output identity is byte identity. A change in formatting only is reported as `differs`; the
  report shows the first differing line so a reader can judge it.

## Tests

Each invariant is proven RED against the tree without the feature before it is made green:

- recording captures a **failing** invocation (non-zero exit, its stderr) alongside a successful
  one, in order;
- replay of an untouched record reports every entry `reproduced` and exits 0;
- editing a recorded stdout makes replay report `differs`, name `stdout`, and exit 3, and raises
  the integrity finding for that field;
- editing the recorded constant table or its fingerprint makes replay name the changed constant
  or the fingerprint;
- a malformed line is `not-replayable` with its reason, counted apart from `differs`;
- a `map --out` entry replays into a temporary file, leaves the recorded path untouched, and a
  recorded artifact hash that does not match makes it differ on `artifact`; an `--out` entry that
  wrote no file is not replayable;
- a probe entry records each input file (the observations file a problem names included) with its
  hash, checked by an independent SHA-256; it reproduces while its inputs are unchanged and is not
  replayable, naming the file, when one changed or was removed; a run that stopped on a 1 ms budget,
  a replay that stops on it when the record did not, and a run with an external worker are not
  replayable;
- each entry hashes the source of every module its command loads, checked by an independent
  SHA-256; an edited module hash is named `reachable` beside a reproduced output; and, by a second
  method, a real change to a private literal in a copy of the built package is named as a module
  change though no constant table holds it, while an entry whose command does not load that
  module reports no change;
- an edited argument raises the `argv` integrity finding beside its difference; an edit to a field
  no other hash covers raises the entry finding alone; a removed hash is a finding;
- each table's fingerprint matches an independent sorted-key SHA-256, and every exported numeric
  constant found in the source text of `bridges/` and `cases/` is in its module's table;
- attribution marks a changed constant `reachable` for a command whose code imports it and
  `not-reachable` for one whose code does not; and, by a second method, a real change to that
  constant in a copy of the built package makes the reachable entry differ while the unreachable
  one reproduces;
- the builtin formula parser is exercised in-process by mocking the optional MathTS module to a
  namespace without `parse`, which is the fallback an absent peer takes, with an unmocked child
  process as the paired control that selects `mathts`; a record made under one parser is replayed
  under the other in both directions.
