/**
 * MathTS leverage plan task U9, the spike: compare `bridgeGradientAST` with
 * MathTS `compileScalarGradient` over `createScalarBuilder` on every
 * (bridge, variable) pair of the catalog, and time both.
 *
 * Run: `bun scripts/u9-gradient-spike.ts [--repeat N]`. It prints one JSON line
 * per repeat and the pairs that do not agree. It changes no file.
 *
 * A variable is a leaf that is not a registered constant, a named formula
 * constant, a π multiple or a decimal literal. Variable i is bound to
 * 1.1 + 0.37·i. BE-82 (Shockley) is also run at a physical point, because the
 * synthetic point overflows its exponential.
 */
import { createScalarBuilder } from '@danielsimonjr/mathts-expression';
import { compileScalarGradient } from '@danielsimonjr/mathts-functions';
import { astDifferentiableBridgeIds, bridgeGradientAST } from '../src/diff/bridge-ast-gradient.js';
import { BRIDGE_RHS_BY_ID } from '../src/bridges/rhs-registry.js';
import { forEachScalarLeaf, isDecimalLiteral } from '../src/dimensional/ast-leaves.js';
import { CONSTANTS, piMultipleValue } from '../src/dimensional/symbolic-constants.js';
import { FORMULA_NAMED } from '../src/dimensional/formula-names.js';
import type { ExprNode } from '../src/dimensional/validator.js';

const builder = createScalarBuilder();
const repeatArg = process.argv.indexOf('--repeat');
const repeats = repeatArg > 0 ? Number(process.argv[repeatArg + 1]) : 3;

function constantValue(name: string): number | undefined {
  return CONSTANTS[name]?.value ?? FORMULA_NAMED.find((r) => r.name === name)?.value ?? piMultipleValue(name);
}

function leafNames(rhs: ExprNode): Set<string> {
  const names = new Set<string>();
  forEachScalarLeaf(rhs, (leaf) => names.add(leaf.name), { transcendental: true, abs: true });
  return names;
}

/** ∂rhs/∂v through MathTS, every other non-literal leaf a column or a constant. */
function mathtsGradient(rhs: ExprNode, v: string, bind: Record<string, number>, names: Set<string>): number {
  const others = Object.keys(bind).filter((x) => x !== v);
  const constants: Record<string, number> = {};
  for (const n of names) {
    if (n in bind || isDecimalLiteral(n)) continue;
    const c = constantValue(n);
    if (c !== undefined) constants[n] = c;
  }
  const g = compileScalarGradient(builder.from(rhs), { variables: others, parameters: [v], constants });
  return g.evaluate(others.map((o) => new Float64Array([bind[o]!])), [bind[v]!]).grad[0]!;
}

async function sweep(): Promise<{ summary: Record<string, unknown>; notes: string[] }> {
  const notes: string[] = [];
  let pairs = 0;
  let both = 0;
  let agree = 0;
  let uptRefused = 0;
  let worst = 0;
  let msUpt = 0;
  let msMathts = 0;
  const ids = astDifferentiableBridgeIds();
  const integralIds: number[] = [];
  for (const id of ids) {
    const rhs = BRIDGE_RHS_BY_ID.get(id)!;
    if (JSON.stringify(rhs).includes('"integral"')) integralIds.push(id);
    const names = leafNames(rhs);
    const vars = [...names].filter((n) => constantValue(n) === undefined && !isDecimalLiteral(n));
    const bind: Record<string, number> = {};
    vars.forEach((v, i) => (bind[v] = 1.1 + 0.37 * i));
    for (const v of vars) {
      pairs++;
      let u: number | undefined;
      let t0 = performance.now();
      try {
        u = (await bridgeGradientAST(rhs, v, bind)).gradient;
      } catch (e) {
        uptRefused++;
        notes.push(`BE-${id} ${v}: UPT refused (${(e as Error).constructor.name})`);
      }
      msUpt += performance.now() - t0;
      t0 = performance.now();
      const m = mathtsGradient(rhs, v, bind, names);
      msMathts += performance.now() - t0;
      if (u === undefined) continue;
      both++;
      const rel = Math.abs(u - m) / Math.max(Math.abs(u), Number.MIN_VALUE);
      if (rel <= 1e-12) agree++;
      else notes.push(`BE-${id} ${v}: UPT ${u}, MathTS ${m}`);
      if (Number.isFinite(rel)) worst = Math.max(worst, rel);
    }
  }
  const summary = {
    differentiableIds: ids.length,
    idsWithIntegral: integralIds.length,
    pairs,
    bothComputed: both,
    agreeWithin1e12: agree,
    uptRefused,
    worstRelativeAmongAgreeing: worst,
    msUpt: Number(msUpt.toFixed(1)),
    msMathts: Number(msMathts.toFixed(1)),
  };
  return { summary, notes };
}

let lastNotes: string[] = [];
for (let r = 0; r < repeats; r++) {
  const { summary, notes } = await sweep();
  console.log(JSON.stringify({ run: r + 1, ...summary }));
  lastNotes = notes;
}
console.log(lastNotes.join('\n'));

const be82 = BRIDGE_RHS_BY_ID.get(82)!;
const physical = { 'shockley-saturation': 1e-12, 'shockley-voltage': 0.6, 'shockley-temperature': 300 };
for (const v of Object.keys(physical)) {
  const u = (await bridgeGradientAST(be82, v, physical)).gradient;
  const m = mathtsGradient(be82, v, physical, leafNames(be82));
  console.log(`BE-82 physical ${v}: UPT ${u}, MathTS ${m}, relative ${Math.abs(u - m) / Math.abs(u)}`);
}
