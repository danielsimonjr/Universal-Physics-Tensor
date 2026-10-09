# Root-cause analysis

Dogfood items 9–14 in `docs/persona-sessions/2026-10-03-applied-physicist-bridges.md`,
the re-run in `docs/persona-sessions/2026-10-03-applied-physicist-bridges-session-2.md`, and
the same mechanisms where an earlier session left a second copy, are eight
causes. A later report joins this note by adding its symptoms under the
cause that produces them. A new symptom does not get its own cause when one
of these mechanisms already explains it.

The re-run adds the rows this note places under a cause: the dimension
spelling `mu_0`, an evaluate key that explain does not accept, a text
rounding of a recovered value, a closed-form range copied into help, a
derive report that does not name the catalog bridge map joins, and one
OpenStax section number. A Lean comment that says "not a formalRef" lives
in PhysJS. This repository pins that commit and does not edit it.

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
- The re-run's citation row. `be-66`'s edge string says OpenStax University
  Physics Volume 2 §16.5. The OpenStax site numbers that radiation-pressure
  section 16.4. LibreTexts numbers the same chapter 16.5. A section number
  is not a stable handle when two mirrors disagree.

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

The OpenStax sentence is `be66Edge.citation` in
`src/composition/edges/applied-physicist.ts` line 97. It names a section
and no URL.

### Fix at the root

One helper turns a repository path into the GitHub blob URL of that path on
`master`, in the form `upt chain` already prints. Every command that tells
the reader where a record lives calls that helper. A witness rerun line is
that URL for the test file, not a `bunx vitest` invocation of a file the
package does not contain. `--stored` keeps reading the repository artifact
when the process is inside the repository; the sentence the user sees is the
URL, and the command says the artifact is absent when the file is absent.

An external source is a URL of the page, not a section number two mirrors
number differently. The be-66 citation names that page and keeps the
sentence that `(1+R) cos²θ` is this catalog's assembly.

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

## 2. A name is resolved by a private list in each command

### Symptoms

- Item 11. `upt explain debye-length` exits 1 and suggests `planck-length`.
  `upt search debye` finds `CE-debye-frequency`. The suggestion is the shared
  token `length`. The search hit is the word `debye`.
- `upt map` answers a different question with a third function: once a
  symbol's dimension has been inferred, `suggestByDimension` ranks catalog
  names of that dimension. `lenght` → `length` is that question. It is not
  the question `upt explain debye-length` asked.
- Item 5, the remainder. `upt derive` with `mu0:permeability` exits 0.
  `mu_0:mu_0` exits 2, `unrecognized dimension term 'mu_0'`. `upt eval`
  accepts `mu0` and `mu_0`. The dimension parser's constant table does not.
- The re-run's high row. `upt evaluate` prints keys `I_W_per_m2`, `R`,
  `theta_rad` for be-66, `B_T` and `rho_kg_per_m3` for be-67, and `T_K` and
  `g_00` for be-68. `upt explain` of those keys exits 0 and says the target
  cannot be determined, then names the graph quantities
  `poynting-flux` / `reflectance` / `incidence-angle`,
  `magnetic-flux-density` / `plasma-mass-density`, and
  `proper-temperature` / `metric-g00`. The same calls with the graph names
  recover the value. Copying the evaluate keys is a failed lookup that
  looks like a result.

### Evidence

The word index is `queryWords` and `matchWord` in `src/cli/search-index.ts`
lines 70–88. A query breaks on everything that is not a letter or a digit.
A word longer than two characters matches a field word that starts with it.
Dimension equality is not a match.

`upt explain` does not start there. `src/cli/commands/explain.ts` lines
232–252 call `resolveToCatalogName`, then `suggestQuantities`, and only then
appends `searchNameWords`. The "did you mean" line is the edit-distance
ranking. `parseKnown` (lines 89–117) stores whatever key was typed.
`shareMagneticFieldName` (lines 65–87) is a one-pair alias for
`magnetic-field` and `magnetic-flux-density`. No other pair has one.

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

The evaluate keys are declared in `src/bridges/evaluators.ts` lines 193–215.
The graph names are the edge sources in
`src/composition/edges/applied-physicist.ts` lines 91–160, which pass
`i['poynting-flux']` into `I_W_per_m2` and the same shape for the other two
bridges. The two spellings meet only inside that `evaluate` closure.

`CONST_DIMS` in `src/dimensional/dimension-spec.ts` lines 88–96 is
`hbar`, `c`, `G`, `k_B`, `kB`, and `e`. `permeability` is a named dimension
(line 83). `mu_0` is neither. `rewriteFormulaSpellings` in
`src/composition/user-equation.ts` lines 137–141 rewrites `mu0` to `mu_0`
on the equation path, and `upt eval` binds both. The dimension parser does
not read that list.

### Fix at the root

One alias registry is the record a name means. `upt evaluate`, `upt explain`,
`upt map`, `upt derive`, and `upt search` read it.

1. An exact catalog name, or an alias of one, after the underscore/hyphen
   normalization `resolveToCatalogName` already applies. An evaluate key
   (`I_W_per_m2`, `B_T`, `T_K`, `g_00`, and the rest of those parameter
   keys) is an alias of the graph quantity the edge already reads.
2. Otherwise the word index: every word of the query must match, the same
   rule `upt search` uses.
3. Otherwise a short edit of a single record. A shared token such as
   `length`, `radius`, `mass`, or `energy` is not that edit.

A constant spelling is the same record. `mu_0`, `mu0`, `eps0`, and
`epsilon_0` resolve to the dimension that constant has, so a dimension
term and an eval binding are not two lists. `CONST_DIMS` and
`rewriteFormulaSpellings` stop being private copies.

`suggestByDimension` stays the answer to "which catalog name has this
dimension?", and it stops being what explain uses for a name that never
resolved. The explain branch that ranks with `suggestQuantities` and then
appends a search hit is deleted. `shareMagneticFieldName` is deleted; that
pair is one row of the registry.

A supplied key that the registry does not resolve is a failed lookup. It
is not stored as a known input. Cause 3 is the exit of that failure.

### What it replaces

The explain branch, the one-pair magnetic alias, the dimension-spec
constant table, and the formula-spelling rewrite, as separate lists. After
the fix, the search hit and the suggestion are the same list, and an
evaluate key and the graph name are one row.

### Risk

`upt explain debye-length` will name `CE-debye-frequency` and will stop
naming `planck-length`. A one-edit typo such as `temperatur` still resolves,
because that is step 3. A query whose only overlap is a generic token will
say the name is not covered. `upt explain` of the evaluate keys recovers
the same value as the graph names. `mu_0:mu_0` is the permeability
dimension and exits 0 on the Alfvén monomial that `mu0:permeability`
already accepts. A caller of `suggestQuantities` who wanted the shared-token
ranking no longer gets it from the CLI. If that function has no caller
outside the CLI, it is deleted rather than kept as a second resolver.

## 3. A check that did not establish a result exits 0

### Symptoms

- Item 9. The Debye `upt derive` prints `NOT a unique monomial` and exits 0.
  `upt map --equation "pressure = intensity/c"` exits 0, labels the mismatch
  `UNKNOWN`, and prints an RHS dimension `[L^-1 T]` because `intensity` was
  filled in as dimensionless.
- A failed lookup exits 0. `upt explain radiation-pressure I=1e6 R=0 theta=0`
  prints `cannot be determined` and returns 0. The target resolved. The keys
  did not. `run` returns 0 after `printExplanation` (`explain.ts` line 301)
  for every resolved target, including `under-determined`. A name that is
  not a quantity already throws `CliError` (exit 1) at lines 246–252. A key
  that is not a quantity does not.

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
- A name the user supplied did not resolve. Exit 1. The line names the
  missing record. It does not say the graph has no derivation path, and it
  does not exit 0. A target and inputs that did resolve, and that still
  leave the quantity under-determined, stay a reported result.

### What it replaces

`failed` inside `derive.ts` and the `exitCode` expression inside `map.ts`,
and the sentence in `errors.ts` that folds every UNKNOWN into exit 0. The
predicate `dimensionallyDetermines` and the placeholder list stay. The
commands stop deciding the exit on their own.

### Risk

Scripts that treat the Debye derive, or `pressure = intensity/c`, as
success will see exit 3. `upt derive x:time --json` exits 3 when `x` is not
a unique monomial of the empty governing set. The ideal-gas agreement stays
exit 0. An unbound target with no comparison stays exit 0. An explain whose
keys do not resolve exits 1. This is a command contract change.

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
- The re-run's low row. `upt evaluate --help` says the closed-form range is
  BE-51/52/55..65. The no-argument listing includes be-66, be-67, and be-68,
  and those commands exit 0. The range is a copied sentence, not the
  registry.
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

The closed-form range is the same copy. `src/cli/commands/evaluate.ts` line
36 and `src/cli/main.ts` line 217 both say `BE-51/52/55..65`. The evaluator
table in `src/bridges/evaluators.ts` lines 189–216 registers 66, 67, and 68.
The no-argument listing walks that table. The help sentence does not.

### Fix at the root

Top-level help is rendered from the command registry: each command's
`summary`, `example`, and `help`. `HELP_TEXT` is deleted. The eval sentence,
in the one place it then lives, says the binding is a separate argument
(`upt eval E E=1eV`). The formula slot does not contain `E=<number>`.

The closed-form range is rendered from the registered evaluators. Adding
be-66 changes the sentence. A handwritten `55..65` cannot.

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

## 7. A displayed number is formatted in the command that prints it

### Symptoms

- The re-run's medium row. `upt explain tolman-invariant proper-temperature=5800 metric-g00=-0.9999957549948597`
  prints `5.8000e+3`. The JSON `recoveredValue` is `5799.987689472028`.
  `upt evaluate be-68` prints the full invariant. The fractional shift on
  these inputs is about `2e-6`. Five significant figures make the metric
  look idle.

### Evidence

`printExplanation` formats a derivation value with `toExponential(4)` at
`src/cli/commands/explain.ts` line 187. `buildSummary` does the same for
the recovered value at `src/composition/explain.ts` lines 208 and 241.
JSON emits the number `explainQuantity` computed, unrounded
(`src/composition/explain.ts` lines 286–302, and the CLI JSON branch at
`explain.ts` lines 261–282). `evaluator-inputs.ts` line 29 already names
15 significant digits as the precision a value is passed at. The text
path does not call that.

### Fix at the root

One function formats a quantity for text. `printExplanation` and
`buildSummary` call it. `toExponential(4)` is deleted from both. The
function prints 15 significant digits, the precision the input resolver
already uses, so a correction of order `10^-6` relative to the input
stays visible. JSON keeps the number. It does not gain a second rounding.

### What it replaces

The two `toExponential(4)` call sites on an explain value. Other commands
that format their own tables are not given a new copy of this function
until they print the same value. The Tolman line is not special-cased.

### Risk

Explain text that today shows five figures will show fifteen. A reader
who scraped `5.8000e+3` will see the longer form. The JSON number does
not change.

## 8. Derive and map do not share one known-relation report

### Symptoms

- The re-run's derive row. A radiation-pressure monomial recovers prefactor
  1 and says no canonical equation has that target. The catalog equation is
  be-66, on `radiation-pressure`. `upt map` of
  `radiation_pressure = poynting-flux/c` names be-66, because the equation
  joins that edge's quantities.

### Evidence

`upt derive` calls `compareWithCanonical` (`src/cli/commands/derive.ts`
lines 162–174) and prints `describeComparisons`. An empty comparison is
the line "no canonical equation has this target and these variables"
(`src/composition/canonical-compare.ts` lines 677–679). There is no
canonical equation whose target is `radiation-pressure`.

`upt map` calls `compareUserEquation` (map.ts lines 265–272), which
resolves names and then calls the same comparison, and then
`equationLanding` plus `formatConnectedSummary` (lines 321–330). That
landing is how the catalog edge appears. Derive never builds that landing.

### Fix at the root

One report answers "which known relation is this formula?". Both commands
call it. The report names a canonical equation when one matches, and names
a catalog edge when the formula's target and sources are that edge. A
catalog edge with no canonical twin is still named. Silence is not the
report. The sentence that says the prefactor was not checked stays when
neither record matches.

### What it replaces

Derive's direct `compareWithCanonical` call as a private report, and map's
landing summary as a second place a catalog id can appear only for an
equation overlay. The comparison function stays the canonical half. It
stops being the only half.

### Risk

`upt derive` of the radiation-pressure monomial names be-66. A formula
that shares a quantity with many edges does not dump those edges; the
report names an edge only when the target and the sources are that edge.
A canonical mismatch stays exit 3 under cause 3.

## Order

The causes are independent. They land in this order, one change each:

1. Published citations, including the external page URL.
2. The alias registry.
3. The exit rule, including a failed lookup.
4. The regime registry.
5. Help rendered from the registry, including the evaluator range.
6. Connectors read the ledger.
7. One text formatter for a recovered value.
8. One known-relation report for derive and map.

A breaking command contract is recorded in `CHANGELOG.md` under 3.0.0 when
it lands, with a migration note. Causes 2, 3, 4, 6, 7, and 8 change what a
command prints or the status it returns. Cause 5 changes help text. Cause 1
changes the strings a command prints for a path and for the be-66 page.

## What stays

Bare `e` is the elementary charge. `E` is energy. Euler's number is
`exp(x)`. A bridge is `formally-proved` only through a reviewed PhysJS Lean
reference of kind `bridge`. A chain stays provisional. A units-only result
stays partial. Abraham–Minkowski stays unencoded. This note adds no
inequality and no monomial.
