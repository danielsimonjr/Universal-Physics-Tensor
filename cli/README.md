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

29 commands, grouped by what they do. Several accept aliases (shown in
parentheses). Every data-bearing command (all but `help` and `version`)
also accepts `--json` for a machine-readable envelope instead of text — see
[JSON output](#json-output).

`upt chain` is registered and is not one of those commands. `upt help` does
not list it. Running it prints that the chain orchestrator stays internal,
that a chain is provisional and is not written to the catalog, and that the
command does not run the orchestrator, then exits 2. The design is
`https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/docs/planning/Bridge-Discovery-Pipeline-Design.md`.
`upt help chain` prints that same status.

### Graph analysis & discovery

8 of these 9 commands (all but `coverage`) operate over a **composition
graph**. Most default to the bridge-catalog graph; `map` and `connectors`
default to the combined catalog + canonical graph instead, since they ask
pure connectivity questions (see [The `--source` flag](#the---source-flag)).

| Command (aliases) | What it does |
|---|---|
| `explain <quantity> [inputs…]` | How the graph determines a quantity: identifiability verdict, recovered value, derivation chains, dimensional sufficiency. A value is a number, a unit (`mass=1Msun`) or a constant expression (`mass=1*M_sun`). Given a bridge id (`be-NN`) — a graph *edge*, not a quantity *node* — it redirects to the right tool (`upt confront`/`upt map`), tailored by grounding tier. |
| `priority` (`prioritize`, `triage`) | Triage the speculative bridges by structural **decidability** against established physics (Tiers 1–3). *Not* a credibility ranking. |
| `audit` | Try to derive every bridge by dimensions: which re-derive as a recognized monomial (prefactor recovered), which are decoys, which are dimensionally open. |
| `map` (`linkage`) | Connected components (clusters) of the graph by shared quantities — the anchored core, the link hubs, the isolated tail. With `--format=mermaid\|dot\|svg` it emits the **visual** map (quantities = nodes, equations = junctions colored by status, one subgraph per component); `svg` renders the dot layout via the optional `@viz-js/viz` peer (`npm i @viz-js/viz`). `--proposed` overlays the unadjudicated identity-consequence relations (gray dashed); `--out=PATH` writes to a file. `--equation "TARGET = EXPR"` injects **your own** equation as a violet `user` node, **dimensionally validates it** (✓ consistent / ⚠ mismatch vs the target's catalog dimension), reports where it lands (cluster / shared quantities), and gives a **dimension-based** "did you mean?" (inferring an unknown symbol's dimension) — falling back to name-similarity. A dimensionally non-homogeneous RHS exits non-zero. `--relation=TYPE` and `--evidence=TAG` filter the map by the Atlas overlay — see the note below, because filtering changes what a MISSING overlay means. |
| `candidates` (`propose`) | Propose cross-cluster links (same-dimension quantities in different clusters) for **physicist review**. A coincidence-heavy surface, not discovered bridges. |
| `frontier` | Print null results and the frontier as two lists. A null result quotes a reason the program already states (a membership rejection, a candidate the link proposer already labels as not a bridge, or a confrontation the registry already marks unconfrontable or data-pending). A frontier row names two sides, a reason the graph already computes, and a registered observation or `observation absent`. An empty list is printed as empty. Neither list is a verdict and neither list changes a score. |
| `predict` (`predictions`) | Project the catalog onto the (scale × force) regime plane and rank empty cells as undiscovered-connection hypotheses (triadic closure). |
| `discover` (`discovery`) | **Vet** the link candidates through the inference suite: hypothesise each identification `a≡b` and test whether it merges disconnected physics, unlocks quantities, and stays numerically consistent. Ranks promising / inert / magnitude-clash / contradictory / axis-clash (a stated `scale`/`force` regime-label mismatch: a prior against a literal identity, not a physical test, and not "no connection possible"). Each PROMISING candidate also carries a `[consequence: entailed\|novel-consequence\|inconclusive]` trailer (`src/composition/consequence.ts`) — a machine pre-classifier, not adjudication: `entailed` re-derives a known canonical equation, `novel-consequence` is a valid algebraic consequence with no canonical match, `inconclusive` means none was derivable. Candidates a physicist has already adjudicated (`src/composition/adjudication.ts`) fold out of the printed PROMISING list by default; `--show-adjudicated` lists them again with their recorded verdict. Each PROMISING row also states its **readiness** dimension by dimension (structure, kind, which independent falsifiers — magnitude, axis, consequence — ran and survived or abstained; an abstention is a missing test, never a pass) and **what would make it testable**: the identity premise, the missing magnitudes and regime labels, and the observation that would test it. `--require-falsifier` hides promising rows that no independent falsifier ran on and survived, counts them, and lists the encoded bridges that already carry a falsifier (a confrontation, a counterexample, or a regime inequality). |
| `connectors` (`orphans`) | Of the isolated bridges, which could connect to the anchored core via a same-dimension identification? The structural frontier. |
| `coverage` (`grounding`) | Audit the catalog's empirical grounding — data-confronted vs graph-computable vs encoded-only vs thin. |

### Standard-physics (canonical) layer

| Command (aliases) | What it does |
|---|---|
| `canonical` (`laws`) | List the canonical-equation registry — the textbook "answer key" L-layer, each entry's fidelity (L0/L1/L2), domain, bridge partners, and the coverage gap. `--vars` also prints each entry's target and governing variable names (the vocabulary for `map --equation` / `derive`). |
| `recover` (`recovery`, `validate`) | Validate bridges against standard physics: classify each bridge↔canonical link as `restates-canonical` (F4 circularity — *not* a discovery), `recovers` (undeclared structural match), or `dimensional-only`. Also reports a chain of two symbolic edges. That comparison does not cancel dimensionful constants, and a chain is never `restates-canonical`. Prints one advisory line under a row whose canonical equation and bridge edge DECLARE conflicting sign/unit conventions; an undeclared convention is unknown, never a conflict, so no row triggers it today. |

### Symbolic composition

| Command (aliases) | What it does |
|---|---|
| `symbolic [--simplify]` (`compose-symbolic`) | Compose bridges' **symbolic** (AST) forms, not just their numeric evaluators. Shows the CT-1 / CT-1b chains, dimensionally validated and evaluable. With `--simplify`, folds the composed AST via MathTS (e.g. `k_B` cancels), re-validated. |
| `metric <minkowski\|schwarzschild\|flrw\|kerr>` (`curvature`) | Christoffel symbols, the Ricci tensor, the Ricci scalar and the Kretschmann scalar of one exact metric. The line element is (−,+,+,+), the same signature as the canonical Einstein-equation metric node. Schwarzschild Kretschmann is checked against `48 G² M² / (c⁴ r⁶)`. FLRW prints the Friedmann equation including `−k c²/a²`, which is the canonical entry `CE-friedmann-curvature`. `--geodesic` integrates a short Schwarzschild circular orbit, or a Kerr geodesic. θ = π/2 is equatorial and circular. Any other θ is an inclined spherical orbit with that polar turning point (Carter constant Q, conserved E, L and the 4-velocity norm). A parameter is a number, a unit (`M=1Msun`, `r=1km`) or a constant expression (`theta=pi/2`); a bare number is already in the parameter's SI unit. |
| `testplan <be-NN \| case-id>` | The measurement plan already stored on a confrontation or an applied case: confirm criteria, falsify criteria, what is left out, and the links. Markdown by default; `--json` for the same plan. |

### Your own equations

| Command (aliases) | What it does |
|---|---|
| `eval "<formula>" name=value …` (`calc`) | Evaluate **your own** scalar formula (safe — arithmetic only). Knows `pi`/`tau` and `sqrt`/`exp`/`ln`/`sin`/…, plus every registered constant (`G`, `c`, `hbar`, `h`, `k_B`, `e`, `ln2`, `epsilon_0`, `sigma_sb`, `b`, `GM_sun`, `Msun_iau`) and the aliases `e_charge`, `m_e`, `eps0`, `mu0`, `mu_0`, `kB`, `M_sun`. A bare `e` is the elementary charge. `E` is energy and is not filled in. The binding is its own argument: `upt eval E E=1eV`. Euler's number is `exp(x)`, for example `exp(1)`. The name `euler` is refused. A bare `sigma` is not filled in. A value may be a number, a unit (`M=1Msun`, `x=1AU`, `B=1T`) or an expression of constants and units (`v=0.6*c`, `theta=pi/2`), read by the MathTS parser. An explicit `e=<number>` replaces the CODATA charge. `--natural` sets ħ = c = 1; `--geometrized` also sets G = 1. `--show-parser` prints `mathts`; with `--json` and no formula that answer is a JSON envelope. `upt version` stays a bare semver. |
| `derive <target:dim> <var:dim> … [--formula "<expr>"]` (`dim`) | Derive **your own** equation's dimensional form, and (with `--formula`) verify it and recover the dimensionless prefactor. `<dim>` may be a named dimension (`pressure`, `density`, `volume`, `viscosity`, `resistance`, `magnetic_field`), a constant, a grouped product (`power/(area*temperature^4)`, `mass/volume`, `M/L^3`), or explicit bases (`L^3.M^-1.T^-2`). With `--formula` it also compares the formula with the canonical equation of the same target and variables, at fixed points: agrees, differs by a constant factor, differs in form, or the prefactor is NOT checked because the registry holds the law only up to a constant. `upt map --equation` reports the same comparison. |

### Data confrontation

| Command (aliases) | What it does |
|---|---|
| `confront [--bridge=be-XX] [--rigor=<tier>] [--frontier] [--sensitivity]` | Run the catalog's committed real-data confrontations — predicted vs observed, each tagged with its **rigor tier** (`[stringent\|moderate\|loose]`) and headed by the distribution ("NOT N equal confirmations"). `--bridge=be-XX` runs one, and so does a positional `upt confront be-XX` (a positional that is not a bridge id is an error, not the full list); `--rigor=stringent\|moderate\|loose` filters to a tier; `--frontier` ranks the σ-tests by margin to the configured 1σ acceptance threshold (a software criterion, not a scientific exclusion level; tightest = most at-risk under new data); `--sensitivity` adds the input-elasticity ranking (value-kind only). Each record also states its **statistical object** (point estimate ± 1σ, one-sided limit, or a consistency ratio with no σ), the **criterion** applied, whether the observed number is **derived** from another measurement, and its **notes** (preprocessing, independence, caveats); a `by statistic:` line counts σ-tests, limits and consistency ratios apart. Not `--source`-parameterized. `upt confront be-53` is a refusal, not a row of that list: the caller must supply a measured-coupling table and a running procedure (`requestYangMillsConfrontation`). The refusal names each missing input, prints no residual, exits 1, and does not change the catalog status. It is not a pass and not a fail. |
| `axes` (`axis-audit`) | Axis-discrimination audit — which tensor classification axes GATE the discovery funnel (an axis gates only when it MEASURABLY fires). Reproduces the rank-7 measurement: scale+force gate; topology/statistics/symmetry classify but do not gate. |
| `evaluate <be-NN> key=value[unit] … [--sigma key=u …] [--corr a,b=rho …]` | Numerically evaluate a closed-form / spacetime bridge (the registered evaluators) via its registered evaluator. With no bridge id, lists the evaluable bridges + their input keys. e.g. `upt evaluate be-63 mu_e=2` → M_Ch ≈ 1.456 M_⊙ (ideal degenerate gas, with m_u and M_⊙ = 1.989e30 kg). **Uncertainty:** `--sigma key=u` gives an input's standard uncertainty and `--corr a,b=rho` a correlation (the matrix must be positive semidefinite). Each numeric output gets a first-order σ by GUM's law of propagation, with central-difference sensitivities. The text keeps the sensitivity `c` apart from the contribution `c·u`: a sensitivity is not an uncertainty. Each input is also stepped by ±u, and a second-order term above 10% of the first prints `LINEARIZATION UNRELIABLE` (e.g. Casimir, d⁻⁴, at u = d/2). An input without `--sigma` is listed as treated-exact, a choice rather than a measurement. The evaluator's numerical error and model discrepancy are stated as not included. **Declared inputs and units:** every evaluator declares each input's unit, quantity, symbol and meaning. A length also declares what it measures (`impact-parameter`, `semi-major-axis`, `separation`, or `radius` vs `diameter`), and a temperature is declared absolute. `upt evaluate` with no id lists them all. A value may carry a unit (`d_m=1um`, `R_ohm=1kohm`, `T_yr=88d`, `M_kg=1Msun`, `rho_kg_per_m3=3.8e-19 g/cm^3`) or an expression of constants and units (`M_kg=1*M_sun`, `v=0.6*c`); `--sigma` uses the same reader. It converts into the declared unit only when the dimensions agree, and each conversion is printed; a bare number is in the declared unit. An absolute temperature in `degC` adds 273.15 K, a `--sigma` in `degC` is a difference and does not, and `degF` is refused. A declared alternate is converted exactly and the conversion is printed (`major_axis_m` → `a_m = 0.5 × 2a`). An undeclared key (`radius_m=` where the input is the plate separation `d_m`) exits 1 instead of being ignored. |
| `ground <a> <b>` | The epistemic-grounding ledger for one discovery candidate a≡b: which falsifiers passed, which abstained (gaps), and the honest permanent ceiling (no mechanism test, no data test). Takes the same `--source`, `--anchor` and `--max-orders` as the `discover` run that listed the pair; a pair found only in another source is named with the command that grounds it. |

### Atlas — regimes and routes between MODELS

The atlas layer relates whole MODELS (`model-pendulum`, `model-lc`, …), as opposed to the bridge
catalog, which relates QUANTITIES. Its families are those registered in `ATLAS_FAMILIES` (`src/atlas/families.ts`); `upt atlas` lists every bridge with its family.

| Command (aliases) | What it does |
|---|---|
| `regime <family> [--at group=value …] [--assume premise] [--deny premise]` | Where in parameter space each model and bridge of a family (`oscillators`, `diffusion` or `waves`) is claimed to apply. `--at` states a point in REGIME COORDINATES — a π-group formula, or a dimensionless input's own name (`--at theta0=0.2`). A value may be a constant expression (`theta0=pi/2`) or a unit. Each record reads **valid**, **VIOLATED** (naming the failed inequality) or **unknown**. `unknown` means a coordinate was never supplied, and it is NOT a pass. A regime that states no inequality reads **no machine condition evaluated (VACUOUS …)**, never valid, for the same reason; `--json` gives each record a `verdict` of `valid`, `violated`, `unknown` or `vacuous`. Exit 3 when any record is VIOLATED. VACUOUS, UNKNOWN and a survey with no violated record exit 0. Each inequality is listed as satisfied, violated or unchecked. Prose side conditions are never evaluated: `--assume` records one as **your declaration** (not evidence), `--deny` marks it **contradicted** (the record does not apply as stated), and the rest stay unspecified. Neither changes the inequality verdict. Also prints the pairwise regime overlap and, over the box `--at` states, the points no constraining regime covers. No box is synthesized: with no `--at`, no coverage is reported. |
| `path <from> <to> [--at group=value …] [--tolerance=EPS] [--sweep name=lo:hi:n[:log]] [--csv]` | The chain of bridges between two models (across families when a bridge ends in another family's model, e.g. `model-klein-gordon` → `model-schrodinger-free`), the relation it composes to via the composition table, the composed `(K, delta)` with the norm it holds in (a regime or horizon that was checked and failed prints no bound number), and whether every horizon still holds at `--at` (pass `t=<time>` plus the horizon's parameters). An exact-equivalence step carries a bound only through a **norm transport** the bridge declares for that direction and norm (`ab-spring-lc` declares relative period error, so `model-pendulum → model-lc` composes); the output names each transport it applied, its witness, and the horizons restated through its time map. When the table declines to compose, or an exact step declares no transport for the running norm, the path carries **no bound**: the command prints `no composite claim`, lists what composing would need (the silent table cell, the missing transport declaration, an exact map that states no norm), and **exits 0** — the refusal is the answer, and no number is invented in its place. A path EXISTING is not a warrant; the bound is the warrant. `--sweep name=lo:hi:n[:log]` evaluates the same verdict at 2–200 samples of one parameter (endpoints included; the parameter must not also be fixed by `--at`): per row the regime, the horizon and the closed-form point error, in the bound's norm. Nothing is integrated and no trajectory is produced. A row outside a regime or past a horizon carries **no error**, because no bound is claimed there, and a no-claim path sweeps its status only. A sweep exits 0, since each row is its own verdict; `--csv` writes the rows as CSV. `--tolerance=EPS` asks whether the path is accurate enough. It is **ADEQUATE** only when every regime holds, every horizon holds at the given `t`, and the closed-form point error is ≤ EPS. It is **INADEQUATE** (exit 3) when any of those fails, so a point just past the horizon fails even when its error is small, and **UNDETERMINED** when the point does not settle it (no `t`, an unchecked coordinate, a numerically supported bound). EPS is in the bound's own norm, and no translation to another observable (phase, trajectory, amplitude) is encoded. With `--sweep`, each row is judged. |
| `atlas [<bridge-id>] [--run]` | One atlas bridge with **every qualification visible**: relation, premises and conclusion (with their families), transformation and inverse, side conditions, regime (a regime with no inequality prints **VACUOUS**), bound with its horizon and limit character, what it preserves and loses, witnesses, counterexamples, formal reference with its fidelity and what it covers, citations and review status. `review status` is the record's review mark (`proposed` or `reviewed`), not an evidence tag, and `formally-proved` does not depend on it. An empty section prints `none stated` rather than disappearing. `formally-proved` is derived from `formalRef`. When derived evidence is both `formally-proved` and `contradicted`, the report prints `proved, with unresolved counterexample: yes`. The proof stays and the counterexample stays unresolved. `symbolically-checked` is decided by the GitHub URL of `data/atlas/witness-results.json`, which is not shipped in the package, so the command names the witnesses it is decided over and does not print a verdict it cannot see. **Evidence by claim** lists correspondence, regime, bound, horizon and preserves, each citing only what the record's structure links to it: the formal reference covers its statement, a bound its `deltaAtBasis`, and no witness is attributed to a claim, because the record attributes none. **Witness execution** gives each witness its status: `not observed by this command` (with the GitHub URL of its test file), `registered in-process, not run`, or, with `--run`, the checked / refuted / unresolved result of running it now. The three are counted separately, and the command exits 3 if any witness is refuted. With no id, lists every bridge of every family. A catalog id `be-<n>` (either letter case) whose entry has a `formalRef` prints that stored reference and says it is a catalog equation, not an atlas bridge. That print does not derive `formally-proved`. A catalog equation with no `formalRef` says so. `--run` applies only to an atlas bridge. |
| `search <word> …` | Find a catalog bridge, canonical equation, atlas model, atlas bridge, quantity or applied case by the words of its name, id, symbol, genuine alias (`resolveToCatalogName`) or catalog-bridge description, and print the command that inspects each match (`upt evaluate be-58 T_K=… R_ohm=…`, `upt evaluate case-skin-depth`, `upt atlas <id>`, `upt explain <quantity> --source=…`). Every word must match, and each match names the fields its words matched in, so a description-only match reads as one. **An equal dimension is never a match**: a radius is not a wavelength. A word of one or two letters matches a symbol, alias or id segment exactly, never a stray letter in a description. No match exits 1 and names the registries and counts searched, because an empty result is an absence from this registry, not from physics. |
| `retrieve <claim> [--embed]` | Atlas search for a claim (`rankByStructure` over the canonical registry). The default does not call out of process and says so. `--embed` asks a local Ollama model, `qwen3-embedding:4b`, for a proposal. That order is not evidence and is not what is accepted. Cosine similarity does not enter the atlas score. If Ollama cannot be used, the same atlas search is printed and the reason is named (the process is not there, the model is not there, the reply is not a vector or the wrong length, or the call does not finish). A fallback exits 0. A claim is text and has no expression, so the structural score is zero and the atlas order is by id. |

```bash
# A bounded route, with its horizon evaluated:
node bin/upt.mjs path model-pendulum model-spring --at theta0=0.2 T0=1 t=10
# Past the horizon (machine form t < 4 T0/θ0² = 100), the same route reports VIOLATED:
node bin/upt.mjs path model-pendulum model-spring --at theta0=0.2 T0=1 t=1000
# Across an exact map through its declared norm transport (relative period error, K = 1):
node bin/upt.mjs path model-pendulum model-lc --at theta0=0.2 T0=1 t=10
# A pair the composition table refuses — prints 'no composite claim', exits 0:
node bin/upt.mjs path model-rlc model-first-order
# No linear chain, and the two-premise bridge is named:
node bin/upt.mjs path model-stokes-drag model-fick
```

### Experimental expression / residual search (Product B)

Orthogonal to `upt discover` (Product A quantity identification `a≡b`, which is **frozen**).
Do not use `probe` to vet identifications; do not use `discover` to search expressions.

| Command (aliases) | What it does |
|---|---|
| `probe <scan\|show\|run\|candidates\|falsify\|rank\|design\|reproduce>` | Bounded expression/residual search. `scan` defaults to **searchable** gaps: one prediction-residual gap per applied case (`fg-expr-case-…`), plus any other searchable gap. Those expression gaps are handles. Observations are empty, and the record has no named baseline and no dataset, which a detected prediction residual requires. Searchable here means the scan lists the handle. The id is not a problem file. Relation-link and regime-transition wrappers stay not-searchable; `--all` lists them. `--searchable-only` together with `--all` is rejected. A scan that has gaps and none searchable still says so and points at `upt discover` and a problem file. `show` lists one gap (`fg-*`). `run --problem=FILE` enumerates dimensional monomials under a search budget, fits a prefactor on exploratory data only, scores locked holdout, compares `normalForm` to the in-repo corpus, and never prints a status stronger than the stored lifecycle. `no-credible-candidate` is an honest abstention. Optional `--worker=PATH` spawns an NDJSON worker as `node PATH` (no shell, no vendored Python). Experimental subpath: `universal-physics-tensor/probe`. The `--problem` file format, with a minimal example, is in `upt help probe`. |

### Help

| Command | What it does |
|---|---|
| `help` (`--help`, `-h`) | Print the built-in usage text. |
| `help <command>` | Print that one command's own usage block (e.g. `upt help map`). |
| `help statuses` | Define every status word the commands print (VACUOUS, UNKNOWN, VIOLATED, valid, ADEQUATE, NEITHER, DECOY, NOT COVERED, no composite claim, promising, reproduced, checked, refuted, unresolved, …), and which commands emit each. |
| `version` (`--version`, `-v`) | Print the installed CLI/package version — a bare semver line, e.g. `0.29.0`. |
| *(no arguments)* | Run a short demo. Takes no flags — `upt --json` is treated as an unrecognized top-level command, not a demo flag. |

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

| Flag | Commands | Effect |
|---|---|---|
| `--source=catalog\|canonical\|both` | `discover`, `candidates`, `map`, `explain`, `priority`, `audit`, `predict`, `connectors` | Choose the graph (default `catalog`; `map` and `connectors` default to `both` instead — see [The `--source` flag](#the---source-flag)). |
| `--json` | All 27 data-bearing commands | Emit a machine-readable JSON envelope instead of text; see [JSON output](#json-output). Not combinable with `map --format=mermaid\|dot\|svg` (exit 2). |
| `--format=text\|mermaid\|dot\|svg` | `map` | Output format. `text` (default) is the linkage printout; `mermaid`/`dot` emit the visual map source; `svg` renders it (needs the optional `@viz-js/viz` peer). |
| `--proposed` | `map` (with `--format`) | Overlay the unadjudicated identity-consequence relations as gray-dashed junctions. |
| `--out=PATH` | `map` (with `--format`) | Write the diagram source to a file instead of stdout. |
| `--equation "TARGET = EXPR"` | `map` | Inject your own equation as a violet `user` node; reports where it lands (nearest equations by shared-quantity overlap, not a full edge dump) + a "did you mean?" hint. Multi-word quantities may use underscores or the catalog's own hyphens (`planck-length` / `planck_length`). |
| `--equation-only` | `map` (with `--equation`) | Print the equation verdict and skip the linkage map; in `--json` the `linkage` field is omitted. Without `--equation` it exits 2. |
| `--relation=TYPE` | `map` | Keep only edges whose recorded Atlas relation is `derivation`, `exact-equivalence`, `restriction`, `approximation`, `coarse-graining`, `analytic-continuation`, `structural-analogy` or `deformation-quantization`. An unknown value exits 1. |
| `--evidence=TAG` | `map` | Keep only edges whose evidence set contains the tag. Evidence is **derived at read time** from the catalog row the edge names — it is never stored on a row or an edge, so no filter can be satisfied by an unchecked assertion. Tags: `proposed`, `reviewed`, `dimension-checked`, `convention-checked`, `symbolically-checked`, `numerically-supported`, `formally-proved`, `empirically-supported`, `contradicted`, `unresolved`. An unknown value exits 1. |
| `--around=QUANTITY`, `--depth=N` | `map` | Focus on one quantity's neighbourhood: hop 1 keeps every edge that uses QUANTITY as a source or target, and each further hop (up to `--depth`, 1–10, default 1) adds the edges sharing a quantity with one already kept. It applies to every output form and composes with `--relation`/`--evidence`, and it prints `focused: K of N edges within D hop(s) of 'QUANTITY' [source]` (on stderr for the visual forms). The omitted edges are out of the view, not absent from the graph. An unknown quantity exits 1 with near names. |
| `--max-orders=N` | `discover`, `map` (with `--proposed`) | Tune the magnitude-clash threshold (default `3`); `map --proposed` shares `discover`'s parsing, so it reshapes the proposed overlay too. |
| `--anchor=k=v[,k2=v2]` | `discover`, `map` (with `--proposed`) | Override the numeric anchor (default `mass=M_sun`) for the consistency/closure check. |
| `--show-adjudicated` | `discover` | Re-list PROMISING candidates that carry a recorded `decoy`/`entailed` verdict and would otherwise fold out of the printed list, each with its verdict + grounds. |
| `--simplify` | `symbolic` | Fold the composed AST via MathTS. |
| `--formula "<expr>"` | `derive` | Verify the derived form and recover its dimensionless prefactor. |
| `--debug` | `eval`, `derive` | Print the active formula-parser kind to stderr. |
| `--bridge=be-XX` | `confront` | Run only that confrontation (`be-37`, `BE-37`, or bare `37` all accepted). A positional `upt confront be-37` is the same selection (the command `upt explain be-37` prints). A positional that is not a bridge id is an error. Omitted, and with no positional, runs every registered confrontation. `be-53` is not registered: the command refuses and names the missing table and running procedure. |
| `--sensitivity` | `confront` | Add the deciding-measurement elasticity ranking for value-kind confrontations (n/a for `upper-bound`/`consistency`/`table`-kind). |
| `--rigor=<tier>` | `confront` | Filter to one rigor tier (`stringent`/`moderate`/`loose`); a bad tier → exit 1. |
| `--frontier` | `confront` | Rank the σ-tests by margin to the configured 1σ acceptance threshold (smallest first — most at-risk under new data). The threshold is a software criterion, not a scientific exclusion level. |
| `--record=FILE`, `--show-record=FILE`, `--replay=FILE` | global, before the command | Append the invocation to a JSONL session record; print a record as a transcript; re-run a record and report each entry reproduced / differs / not replayable. See [Session record](#session-record). |
| `--at group=value` | `regime`, `path` | State a point in regime coordinates. Repeatable, and bare `group=value` arguments are accepted too, so `--at theta0=0.2 T0=1 t=10` works as written. A malformed or non-finite value → exit 1. |


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
