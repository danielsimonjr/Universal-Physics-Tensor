# Root-cause analysis

Dogfood items 9–14 in `docs/dogfood/2026-10-03-applied-physicist-bridges.md`, and the
same mechanisms where an earlier session left a second copy, are six causes.
A later report joins this note by adding its symptoms under the cause that
produces them. A new symptom does not get its own cause when one of these
mechanisms already explains it.

Line numbers name the text in the tree this note was written against. The
function name is the stable handle when a later edit moves the line.

The fixes below are the work. This note does not change a command.

## 1. Published text names a repository path

### Symptoms

- Item 10. `upt connectors` ends on `docs/research/Orphan-Connector-Analysis.md`.
  That file is not in the published tarball.
- Item 14. `upt atlas` says `symbolically-checked` is decided by
  `data/atlas/witness-results.json`, and tells the reader to run
  `bunx vitest run` on a `tests/atlas/` file. Neither is in the tarball.
- The same shape, already printed by other commands: `upt candidates` names
  `docs/research/Linkage-Candidate-Proposals.md`; `upt axes` names
  `docs/research/rank7-axis-measurement.md`; `upt probe` names
  `tests/fixtures/probe-study/`; `upt discover` names
  `docs/research/*-adjudication.md`; `upt confront` says each statement cites
  a repository file; `upt map` and `upt atlas` describe `--stored` as the
  missing witness file; a route and a composite-evidence line name
  `docs/planning/` notes.
- `upt chain` is the exception that shows the contract. It prints a GitHub
  blob URL because `docs/planning/` is not in the tarball.

### Evidence

The published package is `dist`, `bin`, `README.md`, and `LICENSE`
(`package.json` lines 71–76). A path under `docs/`, `tests/`, or `data/` is
not a file the installed command can open.

`upt connectors` prints the analysis path at `src/cli/commands/connectors.ts`
lines 66–68. `upt atlas` builds `rerun: bunx vitest run ${w.test}` at
`src/cli/commands/atlas.ts` line 352, and prints the witness path at lines
439–441 and 491–492, and the vitest line at line 568. `upt map` names the
same file at lines 54 and 149. The path constant is
`STORED_RESULTS_PATH` in `src/cli/commands/_atlas-map.ts` line 137.
`src/cli/commands/candidates.ts` line 50, `src/cli/commands/axes.ts` line 22,
`src/cli/commands/probe.ts` line 188, `src/cli/commands/discover.ts` line 77,
`src/cli/commands/confront.ts` line 41, `src/cli/commands/_atlas-route.ts`
lines 95 and 120, and `src/cli/commands/_atlas-map.ts` line 438 are the other
copies.

`upt chain` already holds the URL in `DESIGN_URL`
(`src/cli/commands/chain.ts` lines 16–17) and interpolates it into the
message. Every other command invented its own string.

### Fix at the root

One helper turns a repository path into the GitHub blob URL of that path on
`master`, in the form `upt chain` already prints. Every command that tells
the reader where a record lives calls that helper. A witness rerun line is
that URL for the test file, not a `bunx vitest` invocation of a file the
package does not contain. `--stored` keeps reading the repository artifact
when the process is inside the repository; the sentence the user sees is the
URL, and the command says the artifact is absent when the file is absent.

### What it replaces

The per-command string literals, including `DESIGN_URL` as a private
constant. Shipping `docs/`, `tests/`, or `data/` inside the npm package is
not this fix. The tarball stays the library and the CLI.

### Risk

A blob URL follows `master`, so a line that moved still opens the file and
may open the wrong paragraph. The helper takes a path, not a line, for that
reason. A command that today tells a repository checkout how to rerun a
witness with vitest will tell a published install how to open the test on
GitHub. The vitest invocation remains in the repository test, which is where
it runs.

## 2. Search, explain, and suggest each resolve a name on their own

### Symptoms

- Item 11. `upt explain debye-length` exits 1 and suggests `planck-length`.
  `upt search debye` finds `CE-debye-frequency`. The suggestion is the shared
  token `length`. The search hit is the word `debye`.
- `upt map` answers a different question with a third function: once a
  symbol's dimension has been inferred, `suggestByDimension` ranks catalog
  names of that dimension. `lenght` → `length` is that question. It is not
  the question `upt explain debye-length` asked.

### Evidence

The word index is `queryWords` and `matchWord` in `src/cli/search-index.ts`
lines 70–88. A query breaks on everything that is not a letter or a digit.
A word longer than two characters matches a field word that starts with it.
Dimension equality is not a match.

`upt explain` does not start there. `src/cli/commands/explain.ts` lines
232–252 call `resolveToCatalogName`, then `suggestQuantities`, and only then
appends `searchNameWords`. The "did you mean" line is the edit-distance
ranking.

That ranking is `rankByName` in `src/composition/user-equation.ts` lines
292–328. `suggestQuantities` (lines 323–328) is `@public`. The gate keeps a
candidate when one name contains the other, the contained name at least
three characters, or the edit distance is at most half the query length.
`debye-length` contains `length` and `planck-length` contains `length`, and
the shared suffix keeps the distance inside the gate. `suggestByDimension`
(lines 340–347) is a second public function. It filters by dimension, then
optionally calls the same ranking.

`upt search` never calls `suggestQuantities`. `upt explain` never asks the
word index first.

### Fix at the root

One resolver answers "what record does this name mean?":

1. An exact catalog name, after the underscore/hyphen normalization
   `resolveToCatalogName` already applies.
2. Otherwise the word index: every word of the query must match, the same
   rule `upt search` uses.
3. Otherwise a short edit of a single record. A shared token such as
   `length`, `radius`, `mass`, or `energy` is not that edit.

`upt explain` and `upt search` both call it. `suggestByDimension` stays the
answer to "which catalog name has this dimension?", and it stops being what
explain uses for a name that never resolved.

`suggestQuantities` is a public function whose contract is the edit-distance
ranking, pinned by `tests/composition/suggest-ranking.test.ts` and named on
the public surface. The CLI stops calling it for explain. The function
remains for a caller who asked for string nearness. A second ranking inside
the CLI is the path this fix deletes.

### What it replaces

The explain branch that ranks with `suggestQuantities` and then appends a
search hit as a postscript. After the fix, the search hit and the
suggestion are the same list.

### Risk

`upt explain debye-length` will name `CE-debye-frequency` and will stop
naming `planck-length`. A one-edit typo such as `temperatur` still resolves,
because that is step 3. A query whose only overlap is a generic token will
say the name is not covered, which is the result the word index already
gives `upt search`. Callers of the public `suggestQuantities` keep today's
ranking. Changing that ranking would be a library break on top of the CLI
break, and this fix does not do it.

## 3. A check that did not establish a result exits 0

### Symptoms

- Item 9. The Debye `upt derive` prints `NOT a unique monomial` and exits 0.
  `upt map --equation "pressure = intensity/c"` exits 0, labels the mismatch
  `UNKNOWN`, and prints an RHS dimension `[L^-1 T]` because `intensity` was
  filled in as dimensionless.

### Evidence

`dimensionallyDetermines` (`src/dimensional/buckingham.ts` line 261) is the
predicate: the target is determined when the governing set is independent
and the target lies in its span. The Debye set
`{length, eps0, kT, n, e}` fails it. `upt derive` prints that failure at
`src/cli/commands/derive.ts` lines 117–124 and does not set `failed`. The
return at lines 181–185 and line 214 is `failed ? EXIT_CHECK_FAILED : 0`.
`failed` is set for a formula dimension mismatch, a canonical-factor miss,
and a prefactor that is not constant. It is not set for `!det.determined`.

`upt map` prints the placeholder dimension at `src/cli/commands/map.ts`
lines 293–300 and exits 0 unless `consistent === false` and every name
resolved (lines 610–622). The comment on `EXIT_CHECK_FAILED` in
`src/cli/errors.ts` lines 27–33 says an UNKNOWN result, where nothing could
be checked, exits 0. The map command then classifies a printed placeholder
dimension as that UNKNOWN.

Those are two local booleans over one predicate: was a dimension
established?

A canonical agreement is a check that did run. `pressure = N*k_B*temperature/V`
agrees with `CE-ideal-gas` while `N` and `V` have no catalog dimension
(`tests/cli/canonical-compare-cli.test.ts`, the ideal-gas case). Treating
every placeholder as exit 3 would fail that agreement.

### Fix at the root

One classification, used by derive and by map:

- Established, and the check passed: exit 0. A canonical comparison whose
  kind is `agrees` is this case, including when some other name in the
  equation has no catalog dimension.
- The check ran and failed: a unique monomial that disagrees with the
  target, a formula dimension that disagrees, a canonical comparison that
  is a mismatch. Exit 3.
- The user asked for a determination and the result was not established:
  the monomial is not unique, or a catalog target's dimension was computed
  through an unresolved name. Exit 3. The line names the gap. It does not
  print the placeholder as if it were the dimension of the formula.
- Nothing was asked to be determined: the target is not a catalog name, and
  no comparison ran. Exit 0. The line says nothing was checked, and it does
  not quote a placeholder dimension.

### What it replaces

`failed` inside `derive.ts` and the `exitCode` expression inside `map.ts`,
and the sentence in `errors.ts` that folds every UNKNOWN into exit 0. The
predicate `dimensionallyDetermines` and the placeholder list stay. The
commands stop deciding the exit on their own.

### Risk

Scripts that treat the Debye derive, or `pressure = intensity/c`, as
success will see exit 3. `upt derive x:time --json` exits 3 when `x` is not
a unique monomial of the empty governing set. The ideal-gas agreement stays
exit 0. An unbound target with no comparison stays exit 0. This is a
command contract change.

## 4. A regime is a slot in a closed family array

### Symptoms

- Item 12. `upt regime plasma` exits 1. The error lists `oscillators`,
  `diffusion`, `waves`. Piezoelectricity and a Tolman gradient have the
  same error. The command has nowhere to put an inequality that is not one
  of those three analogy families.

### Evidence

`ATLAS_FAMILIES` is the array `OSCILLATOR_FAMILY`, `DIFFUSION_FAMILY`,
`WAVES_FAMILY` (`src/atlas/families.ts` lines 18–22). An `AtlasFamily`
(`src/atlas/oscillators/index.ts` lines 31–38) is models, bridges, and
rejections. `upt regime` looks that array up by name
(`src/cli/commands/regime.ts` lines 186–190) and throws `CliError` when
the name is absent. The comment above the lookup says the command used to
hard-code the oscillator family; the generalization stopped at the array.

An inequality lives on a model's or a bridge's `regime`. Adding the word
`plasma` to the error string does not create one. Inventing a plasma-β
bound, a piezoelectric bound, or a Tolman bound would assert a machine
condition the catalog does not state. Input guards on
`evaluateTolmanEhrenfest` (`T_K > 0`, `g_00 < 0`) are preconditions of that
function. They are not an atlas regime.

### Fix at the root

A regime registration is a name plus the records that carry inequalities.
The three atlas families project into that registry, so `upt regime
oscillators` keeps reading the inequalities it reads now. A domain module
registers the same way without constructing models, bridges, and
rejections. `upt regime` reads the registry. `regime.ts` contains no
family-name literal.

Plasma, piezoelectricity, and Tolman register as domains whose inequality
list is empty. The command reports them with the sentence it already uses
for a regime that states no inequality: no machine condition was evaluated.
It does not print a bound that was not written down. `upt regime plasma`
exits 0 on that vacuous record, which is the exit the command already
defines for a survey with no violated record. A name that is not registered
still exits 1, and the known names come from the registry.

### What it replaces

The direct `ATLAS_FAMILIES.find` in `regime.ts`, and the requirement that
every name `upt regime` accepts be an `AtlasFamily`. The family array stays
the atlas. It stops being the only way to name a regime.

### Risk

`upt regime plasma` changes from exit 1 to exit 0 with an explicit vacuous
record. A reader who treats exit 0 as "the plasma regime holds" is who the
vacuous sentence exists for. The test for this cause asserts that sentence
and asserts that no inequality was evaluated. No plasma-β, piezoelectric,
or Tolman inequality is added.

## 5. Usage prose is copied beside the command

### Symptoms

- Item 13. Help says pass `E=<number>`. `upt eval E=1eV` exits 2:
  `Security: assignment expressions are disabled`. The working invocation
  is `upt eval E E=1eV`. The binding is its own argument. MathTS is right
  to refuse an assignment inside the formula.
- The same sentence is written twice, in the top-level help and in
  `upt help eval`.
- `tests/cli/help-covers-registry.test.ts` compares command names. It does
  not compare the sentences.
- The same class of copy, outside the CLI: `WORKFLOWS.md` line 76 says a
  catalog reference is not passed, and
  `docs/planning/Catalog-FormalRef-Design-Note.md` says the catalog path
  does not pass the reference. `catalogEvidenceInput` passes a
  manifest-checked kind-`bridge` reference. Those sentences describe the
  path from before that function.

### Evidence

Flag text is generated. `commandHelp` (`src/cli/flag-help.ts` line 118)
appends `renderFlagCatalog` to a prose string the command author wrote.

The prose is not generated. `HELP_TEXT` in `src/cli/main.ts` line 52 is a
static block. The comment on `listCommandNames` (`src/cli/command.ts` lines
62–67) says `upt --help` is that static text, and that a registered command
with no entry in it would be runnable and invisible. The eval paragraph
inside `HELP_TEXT` is lines 175–181, including `pass E=<number>`. The
command's own `HELP` in `src/cli/commands/eval.ts` lines 80–87 repeats it.
`parseScope` in the same file (lines 55–60) requires a separate `name=value`
positional. An assignment inside the formula never reaches `parseScope`.

### Fix at the root

Top-level help is rendered from the command registry: each command's
`summary`, `example`, and `help`. `HELP_TEXT` is deleted. The eval sentence,
in the one place it then lives, says the binding is a separate argument
(`upt eval E E=1eV`). The formula slot does not contain `E=<number>`.

The false catalog-path sentences in `WORKFLOWS.md` and in the formalRef
design note are deleted in the same change. They are the same defect: a
sentence copied beside the function that replaced it.

The registry test compares the rendered top-level help with the commands'
own help. A sentence that exists only in one of them fails.

### What it replaces

`HELP_TEXT`, and the hand-maintained eval paragraph inside it. The flag
catalog generator stays.

### Risk

`upt --help` and `docs/CLI.md` change wording. Golden `tests/cli/golden/help.txt`
is the old bin's help; a comparison that pins the new text replaces a
comparison that pins the old text. The public exports do not change. The
sentence a user types does.

## 6. A connector is called motivated because two names share a hyphen token

### Symptoms

- Item 10, the other half. `upt connectors` prints
  `foerster-radius ≟ schwarzschild-radius` under the heading
  `SAME-KIND connectors (the motivated set)`. The analysis note marks that
  pair a decoy. The command also names `coarsening-length ≟
  quantum-correlation-length` and `tunneling-mass ≟ effective-mass` as the
  genuinely-motivated examples.

### Evidence

`sharedNameToken` (`src/composition/bridge-analysis.ts` lines 471–475)
returns the first hyphen-separated token two names share. `radius` is
enough. `proposeLinkCandidates` sets `sameKind` from that token (line 524).
`proposeOrphanConnectors` (lines 591–624) copies `sameKind` onto the
connector and does not read `ADJUDICATIONS`. The command prints every
`sameKind` connector under the motivated heading
(`src/cli/commands/connectors.ts` lines 56–64) and then cites the analysis
note for the "genuinely-motivated few" (lines 66–68).

The ledger is a different record. `ADJUDICATIONS`
(`src/composition/adjudication.ts` lines 86–151) marks
`coarsening-length~quantum-correlation-length` and
`effective-mass~tunneling-mass` as `decoy`. It has no row for
`foerster-radius~schwarzschild-radius`. `upt discover` already folds a
ledger `decoy` out of its promising list (`src/cli/commands/discover.ts`
lines 77–80). `upt connectors` does not.

`tests/composition/orphan-connectors.test.ts` lines 55–65 require all three
pairs to surface as `sameKind`, and the Förster pair's own comment says it
is surfaced for honest review. The test, the heading, and the ledger are
three answers to one question.

The analysis note and the ledger disagree on the coarsening pair and the
tunneling pair: the note calls them motivated, the ledger calls them
decoys. `discover` already trusts the ledger. The connector command trusts
the token.

### Fix at the root

The connector report reads the ledger, the same record `discover` reads.

- A pair the ledger marks `decoy` or `entailed` is printed under the
  recorded verdict, with the ledger's grounds. It is not headed motivated.
- A pair with no ledger row stays on the review surface, headed
  unadjudicated. A shared token is reported as a token. It is not a
  motivation.
- `foerster-radius~schwarzschild-radius` becomes a ledger `decoy`, because
  the analysis note already rejected it and the ledger omitted the row.
  The association seed gains that row the way every other `decoy` row
  already does. The grounds are the note's rejection: a Förster radius is
  not a Schwarzschild radius.

The coarsening pair and the tunneling pair follow the ledger they are
already in. They leave the motivated heading. That is the record
`discover` uses. It is not a new ranking of those pairs. The CLI sentence
that calls them the genuinely-motivated few is deleted with the path string
in cause 1.

`sameKind` as "these names share a token" can remain a field on the
unadjudicated review surface. It stops being the definition of motivated.

### What it replaces

The motivated heading, the test that requires the Förster pair to appear
under it, and the test that requires the two ledger decoys to appear under
it. `proposeOrphanConnectors` grows a partition by verdict. It does not
grow a new score.

### Risk

`upt connectors` stops presenting three pairs as motivated. Two of them
were already ledger decoys. The third becomes one. A reader of the analysis
note who still calls the coarsening pair motivated is reading the note the
ledger disagreed with; the command follows the ledger. Adding the Förster
row touches `ASSOCIATIONS`, which the association test re-derives from the
ledger. No pair is given a `genuine` verdict. None is seeded as one today.

## Order

The causes are independent. They land in this order, one change each:

1. Published citations.
2. The name resolver.
3. The exit rule.
4. The regime registry.
5. Help rendered from the registry.
6. Connectors read the ledger.

A breaking command contract is recorded in `CHANGELOG.md` under the next
major section when it lands. Causes 2, 3, 4, and 6 change what a command prints or the status it
returns. Cause 5 changes help text. Cause 1 changes the strings a command
prints for a path. Cause 2 leaves the public `suggestQuantities` ranking
in place.

## What stays

Bare `e` is the elementary charge. `E` is energy. Euler's number is
`exp(x)`. A bridge is `formally-proved` only through a reviewed PhysJS Lean
reference of kind `bridge`. A chain stays provisional. A units-only result
stays partial. Abraham–Minkowski stays unencoded. This note adds no
inequality and no monomial.
