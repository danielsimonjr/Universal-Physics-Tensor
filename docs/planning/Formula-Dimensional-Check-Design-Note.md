# Formula Dimensional Check — Design Note (MathTS Phase 2)

> **Provenance:** 2026-06-14 (branch
> `claude/bridge-equations-specs-review-4mfy38`). Phase 2 of
> `MathTS-Formula-Integration-Design-Note.md`: now that Path A gives the
> CLI a real **AST** for a user's formula, transpile it into UPT's own
> dimensional `ExprNode` and run `validate()` — so `upt derive --formula`
> can tell a user whether their formula is **dimensionally homogeneous**
> and what dimension it has, not just recover a prefactor.
>
> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. The implementation is `src/numerical/formula-dimension.ts`.

## The payoff

This unifies the two halves UPT already owns separately: **string → AST**
(MathTS) and **AST → dimension** (UPT's validator). A user can now write

```
upt derive period:time length:length gravity:acceleration \
    --formula "2*pi*sqrt(length/gravity)"
```

and get, beyond the prefactor: *formula dimension = [time], ✓ matches the
target*. A wrong formula (`length + gravity`) is reported as **not
dimensionally homogeneous**. This is a genuine correctness check on the
user's equation, and it works even when the dimensional derivation is not
a unique monomial (where the prefactor path declines).

**Available under both parsers (update 2026-06-14).** The check needs an
AST. Path A exposes the MathTS AST; Path B's parser also builds a
structured AST internally (`num | sym | unary | bin | call`) — originally
unexposed. We surfaced it (`parseFormulaToAst` / `evalFormulaAst`, both
`@internal`) and added a second transpiler (`transpilePathB`) over the
same dimensional core, so **the check is default-on, MathTS-optional**.
`getFormulaDimensionChecker()` uses the MathTS AST when the peer is
installed, else the built-in AST; both transpile to the same `ExprNode`,
so the verdict is identical (pinned by a builtin↔mathts parity test). We
do NOT collapse to one AST: `ExprNode` has no function-node kind (so it
cannot *evaluate* `sin`/`exp`), so a richer AST is inherently needed for
values and `ExprNode` for dimensions — the transpile is the right shape,
now with two sources instead of one.

## Transpile: MathTS node → UPT `ExprNode`

UPT's scalar `ExprNode` is `{kind:'symbol',name,dim}` and
`{kind:'op',op:('+'|'-'|'*'|'/'|'^'),args}` (the `^` exponent is a numeric
symbol read via `Number(name)`). The mapping (dispatch on `node.type`):

| MathTS node | → `ExprNode` |
|---|---|
| `ConstantNode` (number) | `symbol(String(value), DIMENSIONLESS)` |
| `SymbolNode` (variable) | `symbol(name, declaredDim[name])` |
| `SymbolNode` (`pi`/`tau`/`e`) | `symbol(name, DIMENSIONLESS)` |
| `ParenthesisNode` | transpile `content` |
| `OperatorNode` `+ - * /` | `op(op, args.map(transpile))` |
| `OperatorNode` unary `-` | transpile the operand (sign is dimension-neutral) |
| `OperatorNode` `^` | `op('^', [transpile(base), symbol(String(constExp), DIMENSIONLESS)])` — exponent must be constant (evaluated via MathTS with an empty scope) |
| `FunctionNode` `sqrt` | `op('^', [arg, symbol('0.5', …)])` |
| `FunctionNode` `cbrt`/`pow` | `^` with the (constant) exponent |
| `FunctionNode` `abs` | transpile the arg (dimension-preserving) |
| `FunctionNode` transcendental (`exp`/`log`/`sin`/…) | **typed stub**: assert the arg is dimensionless, emit `symbol('<fn>(…)', DIMENSIONLESS)` |

Transcendentals use the project's established **typed-stub** pattern
(CLAUDE.md: "Absorb log, exp … into a single dimensioned symbol"): the
transpiler computes the argument's dimension (transpile + `validate`) and,
if it is not dimensionless, raises a `FormulaDimensionError`
(`sin() requires a dimensionless argument, got [length]`); otherwise the
function collapses to a dimensionless stub. This keeps the `ExprNode`
grammar unchanged — no new node kind.

Symbol resolution: declared governing dims first, then `pi`/`tau`/`e` as
dimensionless; an undeclared symbol is a `FormulaDimensionError`
("declare its dimension"), consistent with the prefactor path which also
needs every symbol declared.

## The check

`checkFormulaDimension(node, dims)`:
1. `transpile(node, dims)` → `ExprNode` (or a `FormulaDimensionError` for
   undeclared symbols, non-constant exponents, or a transcendental with a
   dimensional argument).
2. `validate(exprNode)` → `{ok, inferredDimension, violations}`. The
   validator reports `+`/`-` non-homogeneity as violations (it does not
   throw), so `length + time` comes back `ok:false`.
3. Return `{ ok, dim, violations?, error? }`.

The CLI compares `dim` against the declared target dimension with a small
per-exponent tolerance (sqrt etc. can introduce float drift) and reports
homogeneous-and-matches / homogeneous-but-different / not-homogeneous.

## Scope & limits (honest)

- **Form, not magnitude** — like all of the dimensional layer, it checks
  dimensions, never the numeric prefactor (that is the separate Path-A
  recovery).
- **Constant exponents only** — `x^y` (variable exponent) cannot be
  dimensionally analyzed; reported as an error.
- **`cbrt` introduces float exponents** (1/3); the target match uses
  tolerance. Integer/half powers (the common case) stay exact.
- **Default-on** — the built-in (Path B) transpiler makes the check
  available without the MathTS peer; MathTS is a parity-equivalent
  alternative AST source, not a prerequisite.

## Acceptance

- Pendulum `2*pi*sqrt(length/gravity)` → dimension `[time]`, matches a
  `period:time` target.
- `r_s` form `2*G*mass/c^2` with `G:G mass:mass c:c` → `[length]`.
- `length + gravity` → not homogeneous (reported, not thrown).
- `sin(length)` → error (dimensionless-argument violation); `sin(length/length)` → ok.
- An undeclared symbol → error naming it.
- Builds/tests green with the MathTS peer absent (the checker is simply
  unavailable; the CLI says so).
