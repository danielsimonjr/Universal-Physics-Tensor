# MathTS Formula Integration — Design Note (Path A)

> **Provenance:** 2026-06-14 (branch
> `claude/bridge-equations-specs-review-4mfy38`). Path B shipped a
> self-contained scalar-formula parser (`src/numerical/formula.ts`) behind
> a `FormulaParser` interface, wired into the `upt` CLI (`eval`,
> `derive --formula`). This note is the plan for **Path A**: swapping in a
> MathTS-backed parser once the MathTS packages are published with a
> working assembly. Written against a live investigation of the installed
> MathTS packages (versions and the exact blocker are recorded below).
>
> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. The implementation is `src/numerical/formula-mathts.ts` and
> `src/numerical/formula-registry.ts`; dimensional checking of user formulas (§5) is
> `Formula-Dimensional-Check-Design-Note.md`.

## 0. Why Path A at all

Path B is safe, dependency-free, and sufficient for scalar arithmetic, so
Path A is *not* about fixing a deficiency — it is about two upgrades:

1. **One source of truth for math.** UPT already depends on MathTS for the
   numerical `TensorEngine`; using its parser/AST removes a hand-written
   parser UPT must maintain, and inherits MathTS's grammar (functions,
   units, complex, implicit multiplication) for free.
2. **The strategic payoff (Phase 2): dimensional checking of user
   formulas.** UPT has its *own* dimensional AST (`ExprNode`) and
   `validate()` homogeneity checker. If a MathTS-parsed user formula is
   transpiled to `ExprNode`, the CLI can tell a user *"your formula is not
   dimensionally homogeneous"* — something the Path B evaluator cannot do.
   This is the real prize and the reason to keep the seam clean.

## 1. The upstream blocker (the gate)

As installed today the MathTS expression engine **does not assemble**:

- `@danielsimonjr/mathts-expression@0.2.0` is a mathjs-style engine in
  *factory* form — it exports `createParse`, `compile`, `compileExpression`,
  `createEvaluate`, and the `createXxxNode` family, plus `keywords` /
  `properties`. There is no ready `parse()`.
- A usable instance is assembled with `@danielsimonjr/mathts-core`'s
  `create(factories)` (the mathjs pattern). **This currently throws**
  `does not provide an export named 'Unit'` — `mathts-functions` /
  `mathts-matrix` import `Unit` from `mathts-core@0.1.2`, which does not
  export it.
- The inter-package dependencies are all unpinned (`*`), so npm installs
  independently-latest versions that do not actually link.

**Acceptance gate for starting Path A (the only hard prerequisite):**

```js
import { create } from '@danielsimonjr/mathts-core';
import * as expr from '@danielsimonjr/mathts-expression';
// + functions/matrix factories
const math = create(allFactories);
math.parse('hbar*c^3/(8*pi*G*M*k_B)')
    .evaluate({ hbar: 1.054571817e-34, c: 299792458, G: 6.6743e-11,
                M: 1.989e30, k_B: 1.380649e-23 }); // ≈ 6.168e-8
```

must run without error from a fresh `npm install`. Upstream fix = release
a **synced** MathTS package set (matched cross-exports — at minimum
`mathts-core` exporting `Unit`) and, ideally, **pin** the inter-package
versions instead of `*`.

## 2. The seam (already in place)

`src/numerical/formula.ts` defines the contract Path A implements:

```ts
interface CompiledFormula {
  readonly source: string;
  readonly variables: readonly string[];      // free vars, minus constants/functions
  evaluate(scope: Record<string, number>): number;
}
interface FormulaParser { parse(expr: string): CompiledFormula; }
export const defaultFormulaParser: FormulaParser;   // Path B (always present)
```

Path A adds a second `FormulaParser` implementation; **nothing downstream
changes** — the CLI and any inference code depend only on the interface.

## 3. Design

### 3.1 `src/numerical/formula-mathts.ts` (new, mirrors `mathts-engine.ts`)

A `FormulaParser` backed by MathTS, loaded the same way `mathts-engine.ts`
loads its optional peers (dynamic import + the established `@ts-ignore`
for the absent-at-tsc dependency):

- **Assemble once, cache.** Build the `math` instance via `create(...)`
  with the minimal factory set needed for scalar parsing/eval (expression
  + the arithmetic functions; avoid matrix/units if they can be left out
  to shrink the blast radius). Memoize it.
- **`parse(expr)` → `CompiledFormula`:**
  - `const node = math.parse(expr)` — the MathTS AST.
  - `variables`: walk the AST (`node.filter(isSymbolNode)`), collect symbol
    names, subtract MathTS's known constants (`pi`, `e`, …) and function
    names so the set matches Path B's semantics.
  - `evaluate(scope)`: `node.evaluate(scope)` (or `node.compile().evaluate`),
    coerced to `number`; throw a `FormulaError` (reuse Path B's class) on a
    non-finite or non-scalar result, so the CLI's error contract is
    unchanged.
- **Scalar-only guard.** The CLI contract returns a `number`. If a formula
  evaluates to a matrix/complex/unit, throw `FormulaError` — do not leak
  MathTS types through the seam.

### 3.2 `src/numerical/formula-registry.ts` (new, mirrors `engine-registry.ts`)

`getFormulaParser(): Promise<FormulaParser>` (or sync with cached
detection) that returns the MathTS-backed parser when MathTS is present
**and assembles**, else `defaultFormulaParser`, with a one-time
stderr notice — exactly the `detectDefault()` pattern in
`engine-registry.ts`. Detection must catch the assembly throw (the §1
error) and fall back silently to Path B, so a broken/absent MathTS never
breaks the CLI.

### 3.3 CLI wiring (`bin/upt.mjs`)

Replace the direct `parseFormula` import with the registry selector:
`const parse = await getFormulaParser()` then `parse.parse(expr)`. Add an
unobtrusive way to see which parser is active (e.g. `upt eval … --debug`
prints `parser: mathts` / `parser: builtin`). No change to `eval` /
`derive` UX.

### 3.4 Optional dependency hygiene

`@danielsimonjr/mathts-expression` (and `-core`/`-functions`) are already
in `optionalDependencies`; pin them to the known-good synced versions from
§1. The package must still build, test, and run with them **absent** (the
registry falls back to Path B) — the existing `tsconfig`/CI must stay
green without the optional peers installed, as it does today for
`mathts-tensor`.

## 4. Acceptance criteria

1. **Gate met** (§1): `create(all)` assembles and parses/evaluates from a
   clean install with the pinned versions.
2. **Conformance parity.** A shared `tests/numerical/formula-conformance.ts`
   suite (mirroring `engine-conformance.ts`) is run against *both*
   `defaultFormulaParser` and `mathtsFormulaParser`
   (`formula-conformance.builtin.test.ts` / `.mathts.test.ts`). Both must
   produce identical results (to tolerance) on: precedence incl.
   right-assoc `^` and `-2^2 = -4`, scientific notation, the function
   whitelist, `pi`/`tau`, free-variable extraction, the unknown-symbol
   error, and the Hawking-temperature value ≈ 6.168e-8. This is the
   behavioral contract and the gate against grammar divergence (e.g.
   MathTS implicit multiplication, which must be documented or disabled).
3. **Fallback.** With MathTS absent or assembly broken, the CLI and suite
   behave exactly as today (Path B), no crash, no UX change.
4. **No public-surface change.** Both parsers stay internal (as now);
   snapshot unchanged.
5. Both tsc gates clean **with and without** the optional peers installed.

## 5. Phase 2 (separate, after Phase 1 lands): dimensional checking

Transpile the MathTS AST → UPT `ExprNode` and run `validate()`/
`validateEquation()` so `upt derive --formula` (and a future `upt check`)
can report **dimensional homogeneity** of a user formula, not just
recover a prefactor. Mapping: MathTS `OperatorNode`(+,-,*,/,^) →
UPT `op` nodes; `SymbolNode` → `symbol` carrying the user-declared
`Dimension` (from `dimension-spec.ts`); `FunctionNode`(sqrt/exp/log) →
the appropriate `ExprNode` shape or a typed stub (per the Wave-Z
typed-stub pattern in CLAUDE.md). This unifies the *string→AST* (MathTS)
and *AST→dimension* (UPT) halves the project already owns separately, and
is the strategic reason Path A is worth doing. Scope it as its own design
note + plan; do not bundle it into Phase 1.

## 6. Risks & mitigations

| risk | mitigation |
|---|---|
| MathTS assembly fragile / version-skewed | the §1 gate + **pinned** versions; registry fallback; CI green without the peers |
| grammar divergence (implicit mult, units, complex) | the conformance suite is the contract; scalar-only guard throws on non-number results |
| heavier runtime (factory assembly cost) | assemble once + memoize; only the CLI path triggers it; Path B stays the default for embedders who don't install the peers |
| optional-peer absence breaks tsc | reuse the `mathts-engine.ts` `@ts-ignore` dynamic-import pattern; structural interface only |

## 7. Rollout steps (becomes the implementation plan)

0. **Prereq:** confirm the §1 gate with the published, pinned MathTS set.
1. Phase-0 baseline: capture Path B's conformance results as the parity oracle.
2. Add `formula-conformance.ts` + the two runner tests (builtin passes first).
3. Implement `formula-mathts.ts`; make the mathts conformance runner pass.
4. Add `formula-registry.ts`; wire `bin/upt.mjs` through it; `--debug` parser tag.
5. Pin optional-dep versions; verify CI green **with and without** peers.
6. Stale-docs refresh (arch docs, CHANGELOG, README CLI note) → wrap.
7. Phase 2 (dimensional checking) under its own note + plan.

Precedents to copy verbatim in style: `engine-registry.ts` (selection +
fallback), `engine-conformance.*` (shared suite across two
implementations), `mathts-engine.ts` (optional-peer dynamic import).
