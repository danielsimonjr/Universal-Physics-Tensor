# CLI coverage dogfood — 2026-10-02

Three personas against a packed tarball of this tree, installed outside the repository. Not an independent human review. Scratch directory `/tmp/upt-cli-dogfood`: `npm init` and `npm install` of `universal-physics-tensor-1.0.3.tgz`. Node v22.14.0, npm 10.9.7. The installed `upt` is `node_modules/.bin/upt`. `upt version` prints `1.0.3`. `upt eval --show-parser` prints `builtin`. MathTS is not installed in that tree.

Personas match `docs/dogfood/2026-10-02-npm-1.0.2.md`: an engineering physicist, an applied physicist, and a theoretical physics student. The driver assigned 106, 72, and 61 invocations to those three, in that order.

## Inventory

Counted from the command registry (`registerCommand` in `src/cli/commands/`), not from a grep of flag spellings.

| Kind | Count |
|---|---:|
| Registered commands | 28 |
| Parsed flags on those commands, including each command's `--json` | 106 |
| `probe` subcommands | 9 (`scan`, `show`, `run`, `candidates`, `falsify`, `rank`, `design`, `reproduce`, `study`) |
| Global options parsed in `src/cli/main.ts` | 6 (`--help`, `--version`, `--json`, `--record`, `--replay`, `--show-record`) |

`help` and `version` are builtins. They are not in the 28. `chain` is in the 28, takes no flags, and exits 2 without running the orchestrator.

## What the previous dogfood ran

`docs/dogfood/2026-10-02-npm-1.0.2.md` names these `upt` flags: `--allow-euler`, `--debug`, `--equation`, `--equation-only`, `--evidence`, `--formula`. It records invocations of `atlas`, `chain`, `derive`, `eval`, `evaluate`, `explain`, `map`, and `search`. It does not record `audit`, `axes`, `candidates`, `canonical`, `connectors`, `coverage`, `discover`, `confront`, `frontier`, `ground`, `metric`, `path`, `predict`, `priority`, `probe`, `recover`, `regime`, `retrieve`, `symbolic`, or `testplan`.

## Tarball

`npm pack` wrote `/tmp/upt-cli-dogfood/universal-physics-tensor-1.0.3.tgz`, 1,870,783 bytes, 1,680 files. sha256 `bd61d4c711b3e17c800b5d9edda4216bcbf094e49fbed2f0a04bc79aa781730e`. npm's shasum is `ff0aee60bb1332070ef9f188661004fe3c244eb2`.

## Second pass

239 invocations of the installed binary. 239 matched the expected exit code. Every `--json` case with exit 0 parsed as JSON. No coverage miss: each of the 106 flags, each of the 9 subcommands, and each of the 6 globals appears in at least one argv. The driver is not in the repository.

A case counts as hitting a flag when its first argument is that command or an alias and some later argument is the flag or starts with `flag=`. A leading `--json` is counted against the global, and the command's own `--json` is also exercised after the verb.

## First pass, before the three fixes

The same driver, 236 invocations, against the packed tree from before the frontier and exit-code fixes: 231 matched, 5 did not, and the coverage misses were already empty. The five are the findings below. Three more invocations were added for the exit-code fixes (`path` with one endpoint, `path` with three, `regime` with an extra positional).

## Findings

### 1. `upt probe scan --source=canonical` threw — fixed

Severity: crash. The text and JSON scans both call `scanWithExpressionGaps`, which calls `wrapRelationLinkGaps`. That called `candidateId` on quantity names taken off the canonical graph. `candidateId` throws unless both names are kebab-case slugs. The canonical Bekenstein–Hawking entry names the horizon area `A`. The pair `A` / `area` is a same-dimension link candidate.

Repro, on the packed binary before the fix:

```text
upt probe --json scan --source=canonical
```

Exit was 1 with an uncaught stack, not a `CliError`:

```text
Error: candidateId: quantity names must be kebab-case slugs (got 'A', 'area')
    at candidateId (dist/composition/adjudication.js)
    at wrapRelationLinkGaps (dist/composition/probe/frontier.js)
```

`candidateId('A', 'area')` still throws. That guard is the ledger key. `candidateIdIfSlug` returns undefined for a non-slug, and the frontier id for that pair is length-prefixed (`fg-link-raw:1:A~4:area`) so a `~` inside a symbol cannot alias two pairs and the token cannot collide with a slug id. Registered quantity identifications are still dropped, and only when both names are slugs. After the fix, the same argv exits 0 and the JSON parses. `upt probe --json scan --all --source=canonical` reports `total: 704`, `searchable: 6`, and includes `A ≟ area`.

The regression is `tests/composition/probe/modules.test.ts` (the ledger guard still throws, and the canonical scan lists the pair) and `tests/cli/probe.test.ts` (the CLI argv exits 0 and parses).

### 2. `upt path` with the wrong number of models exited 1 — fixed

Severity: wrong exit code. `cli/README.md` says a missing required argument is exit 2. The command threw `CliError`.

Repro:

```text
upt path
```

Before: exit 1, `upt path: exactly two model ids are required (got 0)`. After: exit 2, same sentence. One endpoint and three endpoints are exit 2 as well. An unknown model id stays exit 1.

### 3. `upt regime` with no family, or with an extra positional, exited 1 — fixed

Severity: wrong exit code. Same contract as finding 2.

Repro:

```text
upt regime
upt regime oscillators waves
```

Before: both exit 1. After: both exit 2. `upt regime not-a-family` stays exit 1 (unknown family). A malformed `--at` stays exit 1.

### 4. A bad `evaluate` number and a bad `confront` positional stay exit 1

These matched neither the first driver's guessed exit 2 nor a crash. They match the command contract, so they were not changed.

`upt evaluate be-63 mu_e=nope` exits 1: `upt evaluate: be-63: 'nope' is not a number with an optional unit`. The command treats a missing `=` as exit 2 and a bad value as exit 1. `tests/cli/confront.test.ts` pins `upt confront nope` at exit 1, and the exit-code table names an invalid confront bridge as exit 1. `upt confront not-a-bridge` exits 1 and says a positional is not ignored.

## Left for the owner

`upt eval` and `upt evaluate` do not use the same exit code for a non-numeric value. `upt eval x x=nope` exits 2: `'x=nope' is not a finite number or a known unit`. `upt evaluate be-63 mu_e=nope` exits 1, and the command's comment says a bad value is exit 1. The exit-code table calls a parse error exit 2 and a malformed `--at` exit 1. Both behaviors are tested. Changing either one would contradict a written contract. That choice is the owner's.

The owner later decided a bad value exits 1 in both commands. The sentences above are the record of this run, before that decision. A missing `=`, a bad flag, a missing argument, and unparseable expression syntax stay exit 2.

## Offline paths

| Invocation | Exit | What happened |
|---|---:|---|
| `upt retrieve --embed --ollama-url=http://127.0.0.1:9 pendulum` | 0 | `Embeddings were requested. the process is not there.` The command continues as atlas search and lists canonical ids. |
| `upt map --format=svg --source=catalog` | 1 | Names the missing optional renderer `@viz-js/viz`. `--format=dot` and `--format=mermaid` exit 0. |
| `upt map --family=oscillators --stored` | 1 | `data/atlas/witness-results.json` is not in the package. `--run` exits 0. |
| `upt atlas --stored` | 1 | The same missing artifact. |

## Coverage

Every row was run on the installed binary in the second pass. Exit is the exit of the invocation that covered that flag. "pass" means that exit was the one the driver required and, where `--json` was requested on a zero exit, the stdout parsed.


| Command | Flag | Exit | Result | Exercised by | Persona | Note |
|---|---|---:|---|---|---|---|
| `atlas` | `--run` | 0 | pass | atlas --run | applied physicist |  |
| `atlas` | `--evidence` | 0 | pass | atlas --evidence | applied physicist |  |
| `atlas` | `--stored` | 1 | pass | atlas --stored | applied physicist | Exit 1 names the missing repository artifact. Not runnable as a stored-witness read from this install. |
| `atlas` | `--json` | 0 | pass | atlas --json | applied physicist |  |
| `audit` | `--source` | 0 | pass | audit --source=canonical | applied physicist |  |
| `audit` | `--json` | 0 | pass | audit --json | applied physicist |  |
| `axes` | `--json` | 0 | pass | axes --json | theoretical physics student |  |
| `candidates` | `--source` | 0 | pass | candidates --source | theoretical physics student |  |
| `candidates` | `--json` | 0 | pass | candidates --json | theoretical physics student |  |
| `canonical` | `--json` | 0 | pass | canonical --json | applied physicist |  |
| `canonical` | `--vars` | 0 | pass | canonical --vars | applied physicist |  |
| `confront` | `--bridge` | 0 | pass | confront --bridge | engineering physicist |  |
| `confront` | `--sensitivity` | 0 | pass | confront --sensitivity | engineering physicist |  |
| `confront` | `--rigor` | 0 | pass | confront --rigor | engineering physicist |  |
| `confront` | `--frontier` | 0 | pass | confront --frontier | engineering physicist |  |
| `confront` | `--json` | 0 | pass | confront --json | engineering physicist |  |
| `connectors` | `--source` | 0 | pass | connectors --source | theoretical physics student |  |
| `connectors` | `--json` | 0 | pass | connectors --json | theoretical physics student |  |
| `coverage` | `--json` | 0 | pass | coverage --json | engineering physicist |  |
| `derive` | `--formula` | 0 | pass | derive | engineering physicist |  |
| `derive` | `--debug` | 0 | pass | derive --debug | engineering physicist |  |
| `derive` | `--json` | 0 | pass | derive --json | engineering physicist |  |
| `discover` | `--source` | 0 | pass | discover canonical | theoretical physics student |  |
| `discover` | `--max-orders` | 0 | pass | discover canonical | theoretical physics student |  |
| `discover` | `--anchor` | 0 | pass | discover canonical | theoretical physics student |  |
| `discover` | `--derive` | 0 | pass | discover --derive | theoretical physics student |  |
| `discover` | `--show-adjudicated` | 0 | pass | discover --show-adjudicated | theoretical physics student |  |
| `discover` | `--require-falsifier` | 0 | pass | discover --json | theoretical physics student |  |
| `discover` | `--json` | 0 | pass | discover --json | theoretical physics student |  |
| `eval` | `--debug` | 0 | pass | eval --debug | engineering physicist |  |
| `eval` | `--json` | 0 | pass | eval --json | engineering physicist |  |
| `eval` | `--show-parser` | 0 | pass | eval --show-parser | engineering physicist |  |
| `eval` | `--natural` | 0 | pass | eval --natural | engineering physicist |  |
| `eval` | `--geometrized` | 0 | pass | eval --geometrized | engineering physicist |  |
| `evaluate` | `--sigma` | 0 | pass | evaluate --sigma --corr --json | engineering physicist |  |
| `evaluate` | `--corr` | 0 | pass | evaluate --sigma --corr --json | engineering physicist |  |
| `evaluate` | `--json` | 0 | pass | evaluate --sigma --corr --json | engineering physicist |  |
| `explain` | `--source` | 0 | pass | explain --source | applied physicist |  |
| `explain` | `--json` | 0 | pass | explain --json | applied physicist |  |
| `frontier` | `--json` | 0 | pass | frontier --json | theoretical physics student |  |
| `ground` | `--source` | 1 | pass | ground flags | theoretical physics student |  |
| `ground` | `--anchor` | 1 | pass | ground flags | theoretical physics student |  |
| `ground` | `--max-orders` | 1 | pass | ground flags | theoretical physics student |  |
| `ground` | `--json` | 1 | pass | ground flags | theoretical physics student |  |
| `map` | `--source` | 0 | pass | map | applied physicist |  |
| `map` | `--format` | 0 | pass | map --format=mermaid | applied physicist | Covering case is mermaid, exit 0. A separate `--format=svg` exits 1: `@viz-js/viz` is not installed. |
| `map` | `--out` | 0 | pass | map --out | applied physicist |  |
| `map` | `--max-orders` | 0 | pass | map --proposed | applied physicist |  |
| `map` | `--anchor` | 0 | pass | map --proposed | applied physicist |  |
| `map` | `--proposed` | 0 | pass | map --proposed | applied physicist |  |
| `map` | `--relation` | 0 | pass | map --relation | applied physicist |  |
| `map` | `--evidence` | 0 | pass | map --evidence | applied physicist |  |
| `map` | `--around` | 0 | pass | map --around | applied physicist |  |
| `map` | `--depth` | 0 | pass | map --around | applied physicist |  |
| `map` | `--route` | 0 | pass | map --route | applied physicist |  |
| `map` | `--all-routes` | 0 | pass | map --all-routes | applied physicist |  |
| `map` | `--max-routes` | 0 | pass | map --all-routes | applied physicist |  |
| `map` | `--family` | 0 | pass | map --evidence | applied physicist |  |
| `map` | `--observable` | 0 | pass | map --observable | applied physicist |  |
| `map` | `--stored` | 1 | pass | map --stored | applied physicist | Exit 1 names the missing artifact. `--run` on the same command exited 0. |
| `map` | `--run` | 0 | pass | map --run | applied physicist |  |
| `map` | `--equation` | 0 | pass | map --equation | applied physicist |  |
| `map` | `--equation-only` | 0 | pass | map --equation-only | applied physicist |  |
| `map` | `--verbose` | 0 | pass | map --verbose | applied physicist |  |
| `map` | `--bind-short` | 3 | pass | map --bind-short | applied physicist |  |
| `map` | `--natural` | 0 | pass | map --natural | applied physicist |  |
| `map` | `--geometrized` | 0 | pass | map --geometrized | applied physicist |  |
| `map` | `--json` | 0 | pass | map --json | applied physicist |  |
| `metric` | `--json` | 0 | pass | metric --json | engineering physicist |  |
| `metric` | `--geodesic` | 0 | pass | metric --geodesic | engineering physicist |  |
| `path` | `--at` | 0 | pass | path | applied physicist |  |
| `path` | `--sweep` | 0 | pass | path --sweep --csv | applied physicist |  |
| `path` | `--compare` | 0 | pass | path --compare | applied physicist |  |
| `path` | `--csv` | 0 | pass | path --sweep --csv | applied physicist |  |
| `path` | `--tolerance` | 0 | pass | path --tolerance | applied physicist |  |
| `path` | `--json` | 0 | pass | path --json | applied physicist |  |
| `predict` | `--source` | 0 | pass | predict --source | theoretical physics student |  |
| `predict` | `--json` | 0 | pass | predict --json | theoretical physics student |  |
| `priority` | `--source` | 0 | pass | priority --source | theoretical physics student |  |
| `priority` | `--json` | 0 | pass | priority --json | theoretical physics student |  |
| `probe` | `--source` | 0 | pass | probe scan --json | theoretical physics student |  |
| `probe` | `--json` | 0 | pass | probe scan --json | theoretical physics student |  |
| `probe` | `--problem` | 0 | pass | probe run | theoretical physics student |  |
| `probe` | `--budget-ms` | 0 | pass | probe run | theoretical physics student |  |
| `probe` | `--holdout-tol` | 0 | pass | probe run | theoretical physics student |  |
| `probe` | `--worker` | 2 | pass | probe worker bad | theoretical physics student |  |
| `probe` | `--bounds` | 0 | pass | probe design | theoretical physics student |  |
| `probe` | `--h1` | 0 | pass | probe design | theoretical physics student |  |
| `probe` | `--h2` | 0 | pass | probe design | theoretical physics student |  |
| `probe` | `--searchable-only` | 0 | pass | probe scan --searchable-only | theoretical physics student |  |
| `probe` | `--all` | 0 | pass | probe scan --all | theoretical physics student |  |
| `probe` | `--data` | 0 | pass | probe study | theoretical physics student |  |
| `probe` | `--replication` | 1 | pass | probe study --replication | theoretical physics student |  |
| `probe` | `--alpha` | 0 | pass | probe study | theoretical physics student |  |
| `probe` | `subcommand `scan`` | 0 | pass | probe scan | theoretical physics student |  |
| `probe` | `subcommand `show`` | 2 | pass | probe show missing | theoretical physics student |  |
| `probe` | `subcommand `run`` | 0 | pass | probe run | theoretical physics student |  |
| `probe` | `subcommand `candidates`` | 0 | pass | probe candidates | theoretical physics student |  |
| `probe` | `subcommand `falsify`` | 0 | pass | probe falsify | theoretical physics student |  |
| `probe` | `subcommand `rank`` | 0 | pass | probe rank | theoretical physics student |  |
| `probe` | `subcommand `design`` | 0 | pass | probe design | theoretical physics student |  |
| `probe` | `subcommand `reproduce`` | 0 | pass | probe reproduce | theoretical physics student |  |
| `probe` | `subcommand `study`` | 0 | pass | probe study | theoretical physics student |  |
| `recover` | `--json` | 0 | pass | recover --json | applied physicist |  |
| `regime` | `--at` | 0 | pass | regime | applied physicist |  |
| `regime` | `--assume` | 0 | pass | regime --assume --deny | applied physicist |  |
| `regime` | `--deny` | 0 | pass | regime --assume --deny | applied physicist |  |
| `regime` | `--json` | 0 | pass | regime --json | applied physicist |  |
| `retrieve` | `--json` | 0 | pass | retrieve --json | theoretical physics student |  |
| `retrieve` | `--embed` | 0 | pass | retrieve --embed | theoretical physics student | Exit 0. Ollama was not running; the command fell back to atlas search. |
| `retrieve` | `--ollama-url` | 0 | pass | retrieve --embed | theoretical physics student | Same invocation as `--embed`, pointed at `http://127.0.0.1:9`. |
| `search` | `--json` | 0 | pass | search --json | engineering physicist |  |
| `symbolic` | `--simplify` | 0 | pass | symbolic --simplify | applied physicist |  |
| `symbolic` | `--json` | 0 | pass | symbolic --json | applied physicist |  |
| `testplan` | `--json` | 0 | pass | testplan --json | engineering physicist |  |
| `(global)` | `--help` | 0 | pass | help --help | engineering physicist |  |
| `(global)` | `--version` | 0 | pass | version --version | engineering physicist |  |
| `(global)` | `--json` | 2 | pass | version --json | engineering physicist |  |
| `(global)` | `--record` | 0 | pass | record | engineering physicist |  |
| `(global)` | `--replay` | 0 | pass | replay | engineering physicist |  |
| `(global)` | `--show-record` | 0 | pass | show-record | engineering physicist |  |
