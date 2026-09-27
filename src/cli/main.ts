/**
 * Verb-first dispatcher for the UPT CLI — `upt <command> [args...]`.
 *
 * Owns: top-level `help`/`version` handling, the no-args demo, unknown-verb
 * exit-2 contract, and per-command dispatch (parse -> run -> map thrown
 * UsageError/CliError to the documented exit codes). Individual commands are
 * plain data (see `command.ts`) registered via `registerCommand`; this file
 * never special-cases a command by name, so later tasks add commands without
 * touching `runCli`'s body.
 *
 * `main.ts` is the one place that imports the real `cli-api.js` barrel and
 * wires `out`/`err`/`write` to real stdio — every `Command.run` receives
 * those as an injected `CommandCtx`, never reaching for `process.*` itself,
 * which is what makes commands testable in-process against `dist/cli/*.js`.
 */

import * as api from '../cli-api.js';
import { UsageError, CliError } from './errors.js';
import { parseArgs } from './args.js';
import { packageVersion } from './version.js';
import { resolveCommand, type CommandCtx } from './command.js';
import { recordInvocation, replayRecord, showRecord, type Io } from './record.js';
// Side-effect import: registers every ported command (see commands/index.ts).
import './commands/index.js';

// `Io` is the writer surface `runCli` needs. In production these wrap
// `process.stdout`/`process.stderr` with exact `console.log`/`console.error`
// semantics; tests pass a capturing stand-in as the optional second argument.

function stdoutLine(line?: string): void {
  process.stdout.write((line ?? '') + '\n');
}

function stderrLine(line?: string): void {
  process.stderr.write((line ?? '') + '\n');
}

function stdoutRaw(s: string): void {
  process.stdout.write(s);
}

const defaultIo: Io = { out: stdoutLine, err: stderrLine, write: stdoutRaw };

const unknownCommandMessage = (name: string): string => `Unknown command '${name}'. See \`upt help\`.`;

// Verbatim from bin/upt.mjs's `help()` (lines 71-179), plus two lines at the
// end documenting `upt version` and the global `--json` flag. Do NOT hand-edit
// tests/cli/golden/help.txt against this — that golden pins the OLD bin/upt.mjs
// and is only regenerated in Task 8, once main.ts becomes the live CLI.
const HELP_TEXT = `upt — Universal Physics Tensor bridge-inference CLI

Usage:
  upt explain <quantity> [name=value | name] ...
        Explain how the graph determines a quantity: the identifiability
        verdict, recovered value, derivation chains, and whether the inputs
        are dimensionally sufficient. A name that is not a quantity of the
        graph is reported NOT COVERED, with near names, and exits 1.
        e.g.  upt explain hawking-temperature mass=1.989e30

  upt priority
        Triage the speculative bridges by structural DECIDABILITY against
        established physics (Tiers 1-3). NOT a credibility ranking.

  upt audit
        Try to derive every built-in bridge equation by dimensions: which
        re-derive as a recognized monomial (with the prefactor recovered),
        which are decoys (a failed dimensional reconstruction, not a physical
        refutation), which are dimensionally open.

  upt map [--source=catalog|canonical|both] [--format=text|mermaid|dot|svg]
          [--proposed] [--out=PATH] [--equation "TARGET = EXPR"]
          [--around=QUANTITY [--depth=N]]
        Map how the equations LINK: connected components (clusters) of the
        graph by shared quantities, the anchored core, the link hubs, and
        the isolated tail.
        --format=mermaid|dot|svg emits the VISUAL map (quantities = nodes,
        equations = junctions colored by status, one subgraph per component).
        text (default) is the unchanged linkage printout. svg renders the dot
        layout via the optional @viz-js/viz peer (npm i @viz-js/viz; or pipe
        dot through "dot -Tsvg"). --proposed overlays the unadjudicated
        identity-consequence relations (gray dashed). --out writes to a file
        (default stdout).
        --equation "TARGET = EXPR" injects YOUR OWN equation as a violet 'user'
        node and reports where it lands (which cluster / shared quantities), with
        a "did you mean?" hint for names that miss the catalog vocabulary. Use
        underscores for multi-word quantities (photon_energy -> photon-energy).
        --around=QUANTITY [--depth=N] focuses on the edges within N hops of one
        quantity and states how many of the source's edges it kept.
        e.g.  upt map --equation "period = 2*pi*sqrt(length/gravity)"

  upt candidates [--source=catalog|canonical|both]
        Propose candidate cross-cluster links (quantities of the same
        dimension in different clusters) for PHYSICIST REVIEW — a
        coincidence-heavy surface, not discovered bridges.

  upt predict
        Project the catalog onto the (scale × force) regime plane and rank
        the EMPTY regime cells as undiscovered-connection hypotheses
        (triadic closure). Makes the namesake tensor operational. Review
        surface, not discovered bridges.

  upt discover [--source=catalog|canonical|both]
        VET the link candidates through the inference suite: hypothesise
        each identification a≡b and test whether it merges disconnected
        physics, unlocks quantities, and stays numerically consistent.
        Ranks promising / inert / contradictory.
        --source=canonical runs the funnel on the standard-physics L-layer
        ALONE (bridges excluded) — new candidates from established physics,
        and a self-consistency check (expect 0 contradictory).
        --derive emits, for each 'promising' identification, the ONE algebraic
        relation it implies (monomial elimination) as an UNADJUDICATED, math-only
        proposal — NOT a bridge (Part-VI §XXVII-B). Pairs with --source=canonical.
        --max-orders=N tunes the magnitude-clash threshold (default 3); looser N
        keeps more candidates 'promising', tighter N falsifies more as clashes.
        --anchor=k=v[,k2=v2] overrides the numeric anchor (default mass=M_sun)
        for the consistency/closure check. Both reshape the candidate pool that
        --derive consumes.
        Each promising row states which independent falsifiers ran and which
        abstained, and what would make it testable; --require-falsifier lists
        only rows one of them ran on and survived.

  upt connectors [--source=catalog|canonical|both]
        Of the graph's ISOLATED bridges (how many depends on --source, default
        both; the command prints the count), which could connect to the
        anchored core via a same-dimension identification? The structural
        frontier — same-kind connectors are the motivated set for physicist
        review.

  upt coverage
        Audit the catalog's empirical grounding — which bridges are
        data-confronted vs graph-computable vs encoded-only vs thin — to
        target the physicist review. Fabricates nothing.

  upt canonical
        List the canonical-equation registry — the standard-physics L-layer
        (textbook "answer key") with each entry's fidelity (L0/L1/L2),
        domain, and bridge partners, plus the coverage gap.

  upt recover
        Validate bridges against standard physics: classify each bridge↔
        canonical link as restates-canonical (F4 circularity — NOT a
        discovery), recovers (undeclared structural match), or
        dimensional-only.

  upt symbolic [--simplify]
        Compose bridges' SYMBOLIC (AST) forms, not just their numeric
        evaluators (the Observable contract). Shows the CT-1 / CT-1b chains
        composed by substitution, dimensionally validated and evaluable.
        With --simplify, folds the composed AST via MathTS (k_B cancels),
        re-validated dimensionally + numerically.

  upt eval "<formula>" name=value ...
        Evaluate YOUR OWN scalar formula (safe — arithmetic only). Knows
        pi/tau and sqrt/exp/ln/sin/...; any other name must be supplied.
        e.g.  upt eval "hbar*c^3/(8*pi*G*M*k_B)" hbar=1.054571817e-34 \\
                       c=299792458 G=6.6743e-11 M=1.989e30 k_B=1.380649e-23

  upt derive <target:dim> <var:dim> ... [--formula "<expr>"]
        Derive YOUR OWN equation's dimensional form. <dim> is a named
        dimension (length, time, mass, velocity, ...), a constant (hbar, c,
        G, k_B, e), or explicit (L^3.M^-1.T^-2). With --formula, also verify
        it and recover the dimensionless prefactor.
        e.g.  upt derive period:time length:length gravity:acceleration \\
                       --formula "2*pi*sqrt(length/gravity)"

  upt confront [--bridge=be-XX] [--rigor=stringent|moderate|loose] [--frontier]
               [--sensitivity]
        Run the catalog's committed real-data confrontations (predicted vs
        observed), each tagged with its RIGOR tier. --rigor filters to one tier
        (the precision core, or the loose tail that needs better data); --frontier
        ranks the σ-tests by margin to the 1σ acceptance threshold (a software
        criterion, not a scientific exclusion level; tightest = most at-risk under
        new data); --sensitivity ranks the prediction's input elasticities.
        Each record names its statistical object, criterion and data origin;
        consistency ratios (no σ) are counted apart from the σ-tests.

  upt axes
        Axis-discrimination audit — which tensor classification axes GATE the
        discovery funnel (an axis gates only when it MEASURABLY fires). Reproduces
        the rank-7 result (topology/statistics/symmetry classify but do not gate).

  upt evaluate <be-NN> key=value[unit] ... [--sigma key=u ...] [--corr a,b=rho ...]
        Numerically evaluate a closed-form / spacetime bridge (BE-51/52/55..65).
        Every input declares its unit and meaning; a value may carry a unit
        (d_m=1um, T_K=25degC) and converts only when the dimensions agree.
        With no bridge id, lists the evaluable bridges and their declared inputs.
        --sigma/--corr propagate input uncertainties to first order, with a
        curvature check that flags an unreliable linearization.
        e.g.  upt evaluate be-63 mu_e=2   → Chandrasekhar mass ≈ 1.456 M_sun
              (ideal degenerate gas, with m_u and M_sun = 1.989e30 kg)

  upt ground <quantityA> <quantityB> [--source=catalog|canonical|both]
        The epistemic-grounding ledger for one discovery candidate a=b: which
        falsifiers passed, which abstained (gaps), and the honest ceiling.
        Pass the --source (and --anchor/--max-orders) of the discover run that
        listed the pair.

  upt regime <family> [--at group=value ...] [--assume premise] [--deny premise]
        Where in parameter space a family's models are claimed to apply. Each
        model reads valid, VIOLATED (naming the failed inequality), or UNKNOWN
        — a coordinate --at never supplied is NOT a pass. Prose premises are
        never evaluated: --assume records your declaration (not evidence),
        --deny marks one contradicted, the rest stay unspecified. Also prints the
        pairwise regime overlap and, over the box --at states, the uncovered
        points. A group can be given by name (spaces ignored, * for ·) or
        through its parameters (--at tau=1 D=1 q=1 gives tau · D · q^2 = 1);
        a key no record uses is named and ignored.
        e.g.  upt regime oscillators --at theta0=0.2

  upt path <from> <to> [--at group=value ...] [--tolerance=EPS]
           [--sweep name=lo:hi:n[:log]] [--csv]
        The chain of bridges between two models (across families when a
        bridge ends in another family's model), the relation it composes to,
        the composed (K, delta) with its norm, and whether every bridge's regime
        and every horizon still holds at --at (a bound outside its regime is
        not claimed). When the composition table declines to compose, the path
        carries no bound: it prints 'no composite claim', names what composing
        would need, and exits 0. --sweep evaluates the same verdict at 2–200
        samples of one parameter (a row outside a regime or past a horizon
        carries no error); --csv writes the rows as CSV. --tolerance=EPS judges
        adequacy in the bound's own norm (exit 3 if inadequate); no translation
        to another observable, such as phase, is encoded.
        e.g.  upt path model-pendulum model-spring --at theta0=0.2 T0=1 t=10
              upt path model-pendulum model-spring --at T0=1 t=10 --sweep theta0=0.1:0.8:8

  upt atlas [<bridge-id>] [--run]
        One atlas bridge with EVERY qualification visible: relation, side
        conditions, regime, bound and horizon, witnesses, counterexamples and
        formal reference. Empty sections print as "none stated". Evidence is
        shown by claim, and each witness with its execution status; --run
        executes the in-process registered witnesses (exit 3 if refuted).
        With no id, lists every bridge of every family.
        e.g.  upt atlas ab-pendulum-linear

  upt search <word> ...
        Find a catalog bridge, canonical equation, atlas model or bridge, or
        quantity by name, id, symbol, alias or description, with the command
        that inspects each. An equal dimension is never a match.
        e.g.  upt search thermal noise

  upt probe <scan|show|run|candidates|falsify|rank|design|reproduce|study>
        Experimental expression/residual search (Product B). Orthogonal to
        \`upt discover\`, which vets quantity identifications a≡b and is frozen.
        Relation-link gaps are not searchable here — use \`upt discover\`.
        \`study --data=FILE\` fits calibrated observations (units, σ) on
        exploratory rows only and tests on withheld holdout/replication rows.

  upt help        Show this message.

Run with no arguments for a short demo.

  upt version     Show the installed CLI/package version.
  --json          Global flag: emit a machine-readable JSON envelope instead of
                  text (where the command supports it).

  --record=FILE <command> ...
                  Run the command unchanged and append one JSONL entry to FILE:
                  arguments, stdout, stderr, exit code, versions, parser, the
                  constant table. Failed invocations are recorded too.
  --replay=FILE [--json]
                  Re-run every entry of FILE; report each as reproduced, differs
                  (naming the stream and first differing line) or not replayable,
                  and name every changed version, parser or constant. Exit 0 all
                  reproduced unchanged, 3 any differs, 1 otherwise.
  --show-record=FILE [--json]
                  Print FILE as a readable transcript, running nothing.`;

const GLOBAL_FILE_OPTION = /^--(record|replay|show-record)(?:=(.*))?$/;

/**
 * Verb-first CLI entry point. `argv` is the command + its arguments (NOT
 * `process.argv` — callers slice off the node/script prefix themselves, as
 * `bin/upt.mjs` did with `process.argv.slice(2)`).
 *
 * Leading `--record=FILE` / `--replay=FILE` / `--show-record=FILE` are global
 * options (see `record.ts`); anything else goes to `dispatch` unchanged.
 */
export async function runCli(argv: string[], io: Io = defaultIo): Promise<number> {
  const files: Partial<Record<'record' | 'replay' | 'show-record', string>> = {};
  let json = false;
  let i = 0;
  try {
    for (; i < argv.length; i++) {
      const m = GLOBAL_FILE_OPTION.exec(argv[i]);
      if (m) {
        const name = m[1] as keyof typeof files;
        if (!m[2]) throw new UsageError(`upt: '--${name}' requires '--${name}=FILE'`);
        if (files[name] !== undefined) throw new UsageError(`upt: '--${name}' given more than once`);
        files[name] = m[2];
      } else if (argv[i] === '--json' && (files.replay !== undefined || files['show-record'] !== undefined)) {
        json = true;
      } else {
        break;
      }
    }
    if (i === 0) return await dispatch(argv, io);
    const rest = argv.slice(i);
    if (Object.keys(files).length > 1) {
      throw new UsageError('upt: use one of --record, --replay and --show-record at a time');
    }
    if (files.record !== undefined) return await recordInvocation(files.record, rest, dispatch, io, api);
    if (rest.length > 0) {
      throw new UsageError(`upt: '--${files.replay !== undefined ? 'replay' : 'show-record'}' takes no command (got '${rest[0]}')`);
    }
    if (files.replay !== undefined) return await replayRecord(files.replay, json, dispatch, io, api);
    return showRecord(files['show-record']!, json, io);
  } catch (e) {
    if (e instanceof UsageError) {
      io.err(e.message);
      return 2;
    }
    if (e instanceof CliError) {
      io.err(e.message);
      return 1;
    }
    throw e;
  }
}

async function dispatch(argv: string[], io: Io): Promise<number> {
  const { out, err, write } = io;

  try {
    const [cmd, ...rest] = argv;

    if (cmd === undefined) {
      // Byte-identical to bin/upt.mjs's `case undefined` (lines 861-865): a
      // banner line, then dispatch to the registered `explain` + `priority`
      // commands with their historical demo arguments.
      out('upt — bridge-inference CLI. Demo (run `upt help` for usage):');

      const explainCmd = resolveCommand('explain');
      if (!explainCmd) {
        throw new CliError("upt: the demo needs the 'explain' command, which is not registered yet");
      }
      const explainArgs = parseArgs('explain', ['hawking-temperature', 'mass=1.989e30'], explainCmd.flags);
      const explainCtx: CommandCtx = { args: explainArgs, api, out, err, write };
      const explainStatus = await explainCmd.run(explainCtx);
      if (explainStatus !== 0) return explainStatus;

      const priorityCmd = resolveCommand('priority');
      if (!priorityCmd) {
        throw new CliError("upt: the demo needs the 'priority' command, which is not registered yet");
      }
      const priorityArgs = parseArgs('priority', [], priorityCmd.flags);
      const priorityCtx: CommandCtx = { args: priorityArgs, api, out, err, write };
      return await priorityCmd.run(priorityCtx);
    }

    if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
      const target = rest[0];
      if (target !== undefined) {
        const command = resolveCommand(target);
        if (!command) throw new UsageError(unknownCommandMessage(target));
        out(command.help);
        return 0;
      }
      out(HELP_TEXT);
      return 0;
    }

    if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
      out(packageVersion());
      return 0;
    }

    const command = resolveCommand(cmd);
    if (!command) {
      err(unknownCommandMessage(cmd));
      return 2;
    }

    const parsed = parseArgs(command.name, rest, command.flags);
    const ctx: CommandCtx = { args: parsed, api, out, err, write };
    return await command.run(ctx);
  } catch (e) {
    if (e instanceof UsageError) {
      err(e.message);
      return 2;
    }
    if (e instanceof CliError) {
      err(e.message);
      return 1;
    }
    throw e;
  }
}
