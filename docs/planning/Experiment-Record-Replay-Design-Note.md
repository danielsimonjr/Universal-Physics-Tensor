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
| `schema` | the entry format identifier, `upt-record/1` |
| `recordedAt` | ISO timestamp — **metadata only, never compared on replay** |
| `argv` | the command and its arguments exactly as given, global options removed |
| `parsed` | `{command, flags, positionals}` as the command's own flag parser read them, or `null` when there is no command (help, version, the demo) or the arguments did not parse |
| `environment` | the facts below |
| `result` | `exitCode`, or `threw` (the message of an unexpected exception, with `exitCode: null`); `stdout`, `stderr`, and the SHA-256 of each |
| `artifacts` | files the invocation wrote (`map --out=PATH`): path and SHA-256 |

`environment`:

| Field | Content |
|---|---|
| `uptVersion` | the package version (`upt version`) |
| `node` | `process.version` |
| `formulaParser` | `mathts` or `builtin` — the kind `getFormulaParserKind()` resolves, which is what `eval` and `derive` actually use |
| `simplifier` | whether the MathTS simplifier passes its smoke test (`symbolic --simplify`) |
| `peers` | for each optional peer dependency the package declares, the installed version or `null` |
| `constants` | every numeric export of `src/core/constants.ts`, the SI constant table the evaluators read |
| `constantsSha256` | SHA-256 of `constants` serialised with sorted keys |

**Source selection, anchors, units, supplied inputs and assumptions** are recorded as the
invocation stated them: `--source`, `--anchor`, `--at`, `--assume`/`--deny` and `key=value[unit]`
positionals are in `argv` and in `parsed`. A default the command applied because a flag was absent
is not interpreted by the recorder; it appears in the command's own output (for example the
`--json` envelope's `source` and `options`), which the record keeps verbatim. The record states
what was asked and what was answered; it does not re-derive the command's semantics.

### Why the constant table is recorded in full

A fingerprint alone says *that* the constants changed. The table says *which*: replay compares
the recorded table against the live one and names each constant whose value moved, so a changed
Boltzmann constant is reported as `K_B_SI`, not as an opaque hash difference.

## Replay

Each entry is re-run **in-process** through the same dispatcher, with the recorded `argv`, and
compared **byte for byte**: exit code (or thrown message), stdout, stderr. Every entry gets
exactly one of three outcomes, never merged:

| Outcome | Meaning |
|---|---|
| `reproduced` | exit code, stdout and stderr are identical |
| `differs` | at least one of them is not; each differing stream is named, with its first differing line (recorded and replayed text) and both hashes |
| `not-replayable` | the entry was not re-run, and the reason is stated |

Independently of the outcome, replay compares each entry's recorded `environment` with the live
one and lists every changed fact: version, Node, parser kind, simplifier, each peer, and each
constant by name. An entry can be `reproduced` under a changed environment; that is reported as
such, not folded into either "reproduced" or "differs". Replay names **what changed**; it does not
claim the change **caused** a difference — no command reports which constants it read.

Replay also checks the record against itself: a `stdout`/`stderr` whose text no longer hashes to
its recorded SHA-256, or a `constants` table that no longer hashes to `constantsSha256`, means the
record was edited after it was written. Such an entry carries an integrity finding naming the
field.

### Not replayable, by construction

An entry is `not-replayable`, with the reason printed, when:

- the line is not valid JSON or not a `upt-record/1` entry (the line number is given);
- it wrote a file (`map --out=PATH`): replaying would overwrite that path. Its recorded artifact
  hash stays in the record;
- it is a `probe` subverb other than `scan` or `show`: those search under a **wall-clock budget**
  (`--budget-ms`) and read problem, observation and worker files the record does not capture, so
  their output is timing-dependent. `upt probe reproduce` is the probe workflow's own replay.

These are declared, not detected after the fact: output that depends on time is excluded
explicitly rather than compared and then ignored. `recordedAt` is the only timestamp in an entry,
and it is never compared.

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

- The constant fingerprint covers `src/core/constants.ts`. A constant written as a literal in
  another module is not in the table, and a change to it shows up only as an output difference.
- Replay runs in one process: module-level caches (the parser selection) are shared across the
  replayed entries, as they are within one CLI process, not as they are across separate processes.
- Files a command reads are not captured, which is why the file-reading `probe` subverbs are
  declared not replayable.
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
- a `probe run` entry and a malformed line are `not-replayable` with their reasons, counted apart
  from `differs`.
