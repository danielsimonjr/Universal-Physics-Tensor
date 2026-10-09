/**
 * Build the atlas benchmark item set with MODEL authors and MODEL raters.
 *
 * The owner removed the human bottleneck on 2026-09-22 ("use a fable model").
 * Every author, encoder and rater here is a model, and every artifact says so.
 * The resulting kappa is MODEL-rater agreement, not human inter-rater agreement.
 *
 * ## Independence is enforced by how each instance is launched
 *
 * Each role is a separate `claude -p` process. The launch gives it:
 * - no tools (`--tools ""`) and no MCP servers (`--strict-mcp-config`);
 * - no settings sources, no auto-memory and no session persistence;
 * - a working directory outside the repository (`F:/bench-iso`), so no
 *   CLAUDE.md is found;
 * - a replaced system prompt.
 *
 * Its only input is the prompt text below. The prompts contain no atlas source,
 * no atlas record and no description of how the atlas decides. The session that
 * wrote this script has read `src/atlas/`, so it authors, encodes and rates
 * NOTHING. It only runs the pipeline and assembles the files.
 *
 * Roles, each in its own instances:
 * 1. AUTHOR: writes items in prose and records the answer. It sees the domain
 *    names, the relation-type definitions and the failure-kind definitions.
 * 2. ENCODER: turns each item's public prose into the machine fields. It never
 *    sees the answer, the author's explanation or the source.
 * 3. RATER A and RATER B: separate instances with no shared context. Each sees
 *    only the public prose and returns valid/invalid plus a failure kind.
 *
 * Usage: node scripts/atlas-benchmark-models.mjs <author|encode|rate|all>
 * Raw outputs go to tests/fixtures/atlas/benchmark/provenance/.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const PROV = resolve(repoRoot, 'tests', 'fixtures', 'atlas', 'benchmark', 'provenance');
// The isolated working directory the model instances run in: outside this repository, so an
// atlas-blind instance cannot read src/atlas/ (AGENTS.md, Boundaries). It is a machine fact;
// UPT_BENCH_ISO_CWD names it, and the recorded Windows path is only the default.
const ISO_CWD = process.env.UPT_BENCH_ISO_CWD ?? 'F:/bench-iso';
export const MODEL = 'claude-fable-5-1';
const CONCURRENCY = 8;

const FAMILIES = {
  oscillators: 'oscillators: mass-spring, pendulum, LC and RLC circuits, damped and driven oscillation, normal modes',
  diffusion: 'diffusion and transport: heat conduction, Fick diffusion, random walks, Brownian motion, Langevin dynamics, the telegraph equation',
  waves: 'waves: strings, sound, the wave equation, dispersion, the Klein-Gordon equation, standing waves',
  'fluid-statics': 'fluid statics: hydrostatic pressure, buoyancy, Pascal\'s principle, the barometric formula',
};

const RELATIONS = `- derivation: the conclusion follows from the premises by valid mathematical steps; one-way.
- exact-equivalence: the two descriptions are the same physics under a change of variables; each implies the other.
- restriction: the conclusion is the premise theory with an extra condition imposed (a special case).
- approximation: the conclusion approximates the premise theory, within a stated error, in a stated regime.
- coarse-graining: the conclusion describes the averaged or large-scale behaviour of the premise theory.
- analytic-continuation: the conclusion is obtained by continuing a parameter to complex or imaginary values.
- structural-analogy: the two share a mathematical form but describe different physics.
- deformation-quantization: the conclusion is a quantum deformation of a classical theory, or its classical limit.`;

const FAILURES = `- omitted-premise: the conclusion needs an assumption that the premises do not state.
- domain-violation: a relation is used outside the parameter range where it holds.
- convention-mismatch: statements with different sign, unit or normalization conventions are combined without conversion.
- notation-collision: one symbol stands for two different quantities, and the argument conflates them.
- dimensional-coincidence: two quantities with the same units are treated as the same physical quantity.
- non-uniform-limit: a limit is used as if it held uniformly, or two limits are interchanged, when that is not valid.
- false-inverse: a one-way relation (a derivation, an average, a limit) is claimed to run backwards.
- analogy-promoted: a mathematical analogy is claimed as a physical equivalence or a derivation.`;

const FAILURE_KINDS = [
  'omitted-premise', 'domain-violation', 'convention-mismatch', 'notation-collision',
  'dimensional-coincidence', 'non-uniform-limit', 'false-inverse', 'analogy-promoted',
];

const SYSTEM = 'You are an expert physicist. You answer only from the text you are given. You reply with one JSON value and nothing else.';

function authorPrompt(family, batch) {
  return `Write 16 short physics claims for a test of reasoning about relations between physical models.

Domain: ${FAMILIES[family]}.
This is batch ${batch}; make the claims different from what an obvious first batch would contain.

Each claim has premises (one or more statements), a conclusion, and a claimed relation between them.
The claimed relation is ONE of:
${RELATIONS}

Write exactly 8 VALID claims and exactly 8 INVALID claims.
Each invalid claim contains exactly ONE of these defects, and each defect is used exactly once:
${FAILURES}

Rules:
- Write each claim as a careful textbook would. State the assumptions, conditions, conventions or regime that the text itself relies on. In an invalid claim, the defect must be real but not announced.
- The wording must not reveal whether a claim is valid. Valid and invalid claims must look alike.
- The conclusion must contain exactly one equation, in plain text, for example "omega^2 = k/m".
- Base invalid claims on real textbook errata, known student misconceptions, or known subtle mistakes.
- Use SI units.

Reply with a JSON array of 16 objects, each with these keys:
"kind": "valid" or "invalid";
"failureKind": one of ${JSON.stringify(FAILURE_KINDS)} for an invalid claim, or null for a valid one;
"premises": array of strings;
"conclusion": string;
"claimedRelation": one of the relation names above;
"source": a short note on where the claim or the mistake comes from;
"explanation": one or two sentences on why the claim is valid, or what exactly the defect is.`;
}

function encoderPrompt(items) {
  return `Formalize physics claims into a machine format. Formalize EXACTLY what each text states. Do not correct, complete or judge a claim.

For each claim, return an object with these keys:

"id": copied from the input.

"expr": the equation in the conclusion, written LHS = RHS, encoded as the expression tree for LHS - RHS.
Expression tree grammar (JSON):
- a quantity: {"kind":"symbol","name":"<name>","dim":{"L":a,"M":b,"T":c,"I":d,"Theta":e,"N":f,"J":g}}
  where the exponents are the quantity's SI dimension (length, mass, time, current, temperature, amount, luminous intensity).
- a number: {"kind":"symbol","name":"2","dim":{"L":0,"M":0,"T":0,"I":0,"Theta":0,"N":0,"J":0}}
- an operation: {"kind":"op","op":"*","args":[...]} with op one of "*", "/", "+", "-", "^". "^" takes [base, exponent].
- a function: {"kind":"transcendental","fn":"<fn>","arg":<tree>} with fn one of exp, ln, sin, cos, tan, sinh, cosh, tanh.
- a derivative d f / d x may be written as the quotient f / x for dimensional purposes.
Give each quantity the dimension the text gives it.

"sideConditions": array of the conditions the text states on quantities, for example "m > 0", "x ≠ 0", "|x| << 1". Write a non-vanishing condition as "<name> ≠ 0". Use [] when the text states none.

"conventions": include only if the text states a convention. An object with "premise" and/or "conclusion", each an object using only these keys and values:
"heatWorkSign": "Q-W" or "Q+W"; "metricSignature": "-+++" or "+---"; "fourierNormalization": "unitary", "physics" or "none"; "unitSystem": "SI", "gaussian" or "natural"; "capacitorChargeSign": "+" or "-".
Omit the key when the text states no convention.

"composedFrom": include only if the text says the conclusion is reached by chaining two relations. Then give the two relation names, in order, from: derivation, exact-equivalence, restriction, approximation, coarse-graining, analytic-continuation, structural-analogy, deformation-quantization. Otherwise omit the key.

"regime": include only if the text states a dimensionless condition AND the value it takes where the claim is used. Then give {"inequalities":[{"group":"<name>","op":"<" or "<=" or ">" or ">=","bound":<number>}],"values":{"<name>":<number>}}. Otherwise omit the key.

Reply with a JSON array, one object per claim, in input order.

Claims:
${JSON.stringify(items, null, 1)}`;
}

function raterPrompt(items) {
  return `Judge physics claims. Each claim has premises, a conclusion and a claimed relation.

A claim is VALID when the conclusion stands in the claimed relation to the premises, under the conditions the text states.
The relation names mean:
${RELATIONS}

A claim is INVALID when it contains a defect. Name the ONE defect that best describes it:
${FAILURES}

Judge each claim on its own. Reply with a JSON array, one object per claim, in input order:
{"id": copied from the input, "verdict": "valid" or "invalid", "failureKind": one of ${JSON.stringify(FAILURE_KINDS)} or null}

Claims:
${JSON.stringify(items, null, 1)}`;
}

/** Run one isolated instance. Resolves to { text, meta }. */
function runInstance(prompt) {
  return new Promise((res, rej) => {
    mkdirSync(ISO_CWD, { recursive: true });
    const args = [
      '-p', '--model', MODEL, '--tools', '', '--strict-mcp-config', '--setting-sources', '',
      '--no-session-persistence', '--output-format', 'json', '--system-prompt', SYSTEM,
    ];
    const child = spawn('claude', args, {
      cwd: ISO_CWD,
      env: { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', rej);
    child.on('close', (code) => {
      if (code !== 0) return rej(new Error(`claude exited ${code}: ${err.slice(0, 500)}`));
      let events;
      try {
        events = JSON.parse(out);
      } catch {
        return rej(new Error(`unparseable CLI output: ${out.slice(0, 300)}`));
      }
      const list = Array.isArray(events) ? events : [events];
      const meta = list.find((e) => e.type === 'result');
      const init = list.find((e) => e.type === 'system' && e.subtype === 'init');
      if (meta === undefined || init === undefined) return rej(new Error('CLI output lacks an init or a result event'));
      // The launch's own record of what the instance could reach. Refuse the
      // reply if the isolation did not take, rather than store it.
      if (init.tools.length !== 0 || init.mcp_servers.length !== 0 || init.model !== MODEL) {
        return rej(new Error(`isolation failed: tools=${init.tools.length} mcp=${init.mcp_servers.length} model=${init.model}`));
      }
      if (meta.is_error) return rej(new Error(`model error: ${String(meta.result).slice(0, 300)}`));
      res({ text: meta.result, meta, isolation: { tools: init.tools, mcp_servers: init.mcp_servers, model: init.model, cwd: init.cwd } });
    });
    child.stdin.end(prompt);
  });
}

/** Extract the one JSON value from a model reply; throws when there is not exactly one. */
export function parseReply(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  return JSON.parse(body);
}

async function pool(tasks, n) {
  const results = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

/** Run a task, retrying ONCE on a transport or parse failure; the failure is recorded, never hidden. */
async function call(label, prompt, validate) {
  const attempts = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, meta, isolation } = await runInstance(prompt);
      const value = parseReply(text);
      const problem = validate(value);
      if (problem !== null) throw new Error(`shape: ${problem}`);
      const record = { label, model: MODEL, isolation, prompt, reply: text, cost_usd: meta.total_cost_usd, duration_ms: meta.duration_ms, attempts };
      writeFileSync(resolve(PROV, `${label}.json`), JSON.stringify(record, null, 1));
      return value;
    } catch (e) {
      attempts.push(String(e.message ?? e));
    }
  }
  throw new Error(`${label}: failed twice: ${attempts.join(' | ')}`);
}

const PUBLIC_KEYS = ['id', 'premises', 'conclusion', 'claimedRelation', 'family'];
const publicView = (it) => Object.fromEntries(PUBLIC_KEYS.map((k) => [k, it[k]]));

async function stageAuthor() {
  const jobs = [];
  for (const family of Object.keys(FAMILIES)) {
    for (const batch of [1, 2]) {
      jobs.push(async () => {
        const items = await call(`author-${family}-${batch}`, authorPrompt(family, batch), (v) => {
          if (!Array.isArray(v) || v.length !== 16) return 'expected 16 items';
          const inv = v.filter((x) => x.kind === 'invalid');
          if (inv.length !== 8) return `expected 8 invalid, got ${inv.length}`;
          const kinds = new Set(inv.map((x) => x.failureKind));
          if (kinds.size !== 8 || ![...kinds].every((k) => FAILURE_KINDS.includes(k))) return 'each failure kind exactly once';
          return null;
        });
        return items.map((x, i) => ({ ...x, family, id: `mb-${family}-${batch}-${String(i + 1).padStart(2, '0')}` }));
      });
    }
  }
  const all = (await pool(jobs, CONCURRENCY)).flat();
  writeFileSync(resolve(PROV, 'authored.json'), JSON.stringify(all, null, 1));
  console.log(`author: ${all.length} items`);
}

function chunks(xs, n) {
  const out = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

const sameIds = (v, batch) =>
  Array.isArray(v) && v.length === batch.length && v.every((x, i) => x.id === batch[i].id)
    ? null
    : 'reply must list the input ids, in order';

async function stageEncode() {
  const authored = JSON.parse(readFileSync(resolve(PROV, 'authored.json'), 'utf-8'));
  const batches = chunks(authored.map(publicView), 16);
  const jobs = batches.map((b, i) => () => call(`encode-${String(i + 1).padStart(2, '0')}`, encoderPrompt(b), (v) => sameIds(v, b)));
  const all = (await pool(jobs, CONCURRENCY)).flat();
  writeFileSync(resolve(PROV, 'encoded.json'), JSON.stringify(all, null, 1));
  console.log(`encode: ${all.length} items`);
}

async function stageRate() {
  const authored = JSON.parse(readFileSync(resolve(PROV, 'authored.json'), 'utf-8'));
  const batches = chunks(authored.map(publicView), 16);
  for (const rater of ['A', 'B']) {
    const jobs = batches.map((b, i) => () =>
      call(`rater${rater}-${String(i + 1).padStart(2, '0')}`, raterPrompt(b), (v) => sameIds(v, b)),
    );
    const all = (await pool(jobs, CONCURRENCY)).flat();
    writeFileSync(resolve(PROV, `rater-${rater}.json`), JSON.stringify(all, null, 1));
    console.log(`rater ${rater}: ${all.length} verdicts`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(PROV, { recursive: true });
  const stage = process.argv[2];
  if (stage === 'author' || stage === 'all') await stageAuthor();
  if (stage === 'encode' || stage === 'all') {
    if (!existsSync(resolve(PROV, 'authored.json'))) throw new Error('run the author stage first');
    await stageEncode();
  }
  if (stage === 'rate' || stage === 'all') await stageRate();
  if (!['author', 'encode', 'rate', 'all'].includes(stage)) {
    console.error('usage: node scripts/atlas-benchmark-models.mjs <author|encode|rate|all>');
    process.exit(2);
  }
}
