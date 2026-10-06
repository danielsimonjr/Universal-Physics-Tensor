# Bridge Equation Index

Machine-readable catalog of the bridge equations (IDs from 11) defined in the UPT specification (`docs/specification/Part-{I..VI}.md`), exported as `BRIDGE_EQUATIONS: BridgeEquationEntry[]` from `index.ts`.

## AST-encoded bridges (Tier 5)

Most catalog bridges have full ExprNode AST encodings under [`equations/`](./equations/), with dimensional self-validation and numerical evaluators. **The authoritative list is the [`equations/`](./equations/) directory itself** — as of v0.23.0 it holds 43 `be-NN-*.ts` modules (44 bridges; BE-25 has two files — `be-25-iit-phi.ts` + the archived `be-25-orch-or.ts`; BE-51/52 are closed-form evaluators that live at the `src/bridges/` level, not in `equations/`; glob `equations/be-*.ts` for the current set). Each module's JSDoc carries `@see` cross-references to the spec section and to the index entry; each spec section carries a callout block linking back to the module.

Representative encodings (for orientation — not an exhaustive list):

| ID | Bridge | Status | Dim signature | Module |
|----|--------|--------|---------------|--------|
| 11 | Decoherence Master Equation (Lindblad / GKSL) | established | `[frequency]` | [`be-11-decoherence-master.ts`](./equations/be-11-decoherence-master.ts) |
| 14 | Ryu-Takayanagi (holographic entanglement entropy) | established | `[entropy]` | [`be-14-ryu-takayanagi.ts`](./equations/be-14-ryu-takayanagi.ts) |
| 20 | Observed cosmological-constant mass density (FRW) | speculative | `[L^-3 M]` | [`be-20-vacuum-energy.ts`](./equations/be-20-vacuum-energy.ts) |
| 25 | Consciousness — Information Integration (IIT Φ) | speculative | `[1]` | [`be-25-iit-phi.ts`](./equations/be-25-iit-phi.ts) |
| 36 | MOND / TeVeS — GW170817 graviton-speed bound | speculative | `[1]` | [`be-36-gw-speed-bound.ts`](./equations/be-36-gw-speed-bound.ts) |
| 37 | Shapiro gravitational time delay | speculative | `[time]` | [`be-37-shapiro-delay.ts`](./equations/be-37-shapiro-delay.ts) |
| 47 | BBN dark-sector-coupling Boltzmann ODE | speculative | `[L^-3 T^-1]` | [`be-47-bbn-dark-sector.ts`](./equations/be-47-bbn-dark-sector.ts) |

> **v0.6.0 note — BE-20 re-encoding.** BE-20 (vacuum-fluctuation dark-energy coupling) was re-encoded in v0.6.0 to use the `CosmologicalConstantNode` AST kind (the cosmological-constant node in `be-20-vacuum-energy.ts`, typed against the v0.6.0 `cosmological-constant` node from `dimensional/stress-energy-validators.ts`).

The handful of bridges not AST-encoded (and known structural gaps) are tracked in the [Tier-5 encoding triage memo](../../docs/planning/Tier-5-Encoding-Triage.md).

## Schema

See `index.ts` — `BridgeEquationEntry`, `KnownIssue`, `BridgeEquationStatus`. Notable honest-claude conventions:

- `formula_latex` is the LaTeX source decoded from the spec's `<img src="https://i.upmath.me/svg/...">` URLs (URL-decoded with `urllib.parse.unquote`). It is the *first* equation block under each `**Mathematical Formulation**` header.
- `dimensional_signature` is populated for AST-encoded entries (now the large majority of the catalog — see the [`equations/`](./equations/) directory for the full set) and `null` for the few that are not yet encoded. The populated strings (e.g. `'[frequency]'`, `'[entropy]'`, `'[L^-3 M]'`) are the canonical outputs of the dimensional analyzer's `format()` helper, not free-form prose.
- `known_issues[]` only includes issues with explicit spec markers (`**Known issue:**`, `**Additional known issue:**`, `**Bound violation:**`, `**Caveat:**`, `**Sign-convention concern:**`, etc.). Equations whose `Status` paragraph discusses problems narratively without such a marker have `known_issues: []`; the full Status text is preserved in `notes`.
- `references[]` only contains arXiv IDs the regex actually matched in each entry's body. Verbatim journal citations (e.g., "Lindblad 1976, Commun. Math. Phys. 48:119") are *not* in `references` but are visible in `notes`.
- `dependencies[]` is the set of *other* bridge equation IDs explicitly named ("Bridge Equation N") in the body — not transitive.
- `bridges[]` is a heuristic mapping from category → endpoint pair; treat as advisory.

## Regenerate

The TS file is generated, not hand-written. Sources:

- `~/.claude/playground/upt_bridge_extraction/extract.py` — phase-1 regex over the 6 spec markdown files; writes `_bridge_extract_enriched.json` (gitignored).
- `~/.claude/playground/upt_bridge_extraction/gen_ts.py` — turns the JSON into `src/bridges/index.ts`.

Run on Windows: `python -X utf8 ~/.claude/playground/upt_bridge_extraction/extract.py && python -X utf8 ~/.claude/playground/upt_bridge_extraction/gen_ts.py`. The `-X utf8` flag prevents cp1252 decode errors on the Greek/math characters in the spec.

After regen, `npm run typecheck && npx vitest run` must pass; the `tests/bridges-index.test.ts` invariants pin the count and structure.

## Worked example: Bridge Equation 14 (Ryu-Takayanagi)

BE-14 is the first bridge to be encoded end-to-end. It serves as the working
template the rest of the catalog follows. The pipeline is:

### 1. Spec entry → typed registration

The bridge is catalogued in [`index.ts`](./index.ts) as
`BRIDGE_EQUATIONS[id === 14]` (category B, Information-Physical Bridges,
status `established`, ref `arXiv:hep-th/0603001`). After encoding, its
`dimensional_signature` is set to `"[entropy]"` (was `null`).

### 2. Symbolic encoding → ExprNode AST

The SI form `S = k_B c^3 A / (4 G_N ℏ)` is hand-encoded as an `ExprNode`
tree in [`equations/be-14-ryu-takayanagi.ts`](./equations/be-14-ryu-takayanagi.ts):

```ts
import { RYU_TAKAYANAGI_RHS } from './equations/be-14-ryu-takayanagi.js';
// op: '/' with numerator (k_B * c^3 * A) and denominator (4 * G_N * ℏ).
```

Symbol dimensions come from `dimensional/constants.ts` (k_B, c, G, ℏ) and
`dimensional/types.ts` (AREA, ENTROPY, DIMENSIONLESS).

### 3. Dimensional validation

The AST flows through the dimensional analyzer:

```ts
import { validateRyuTakayanagiDimensions } from './equations/be-14-ryu-takayanagi.js';

const v = validateRyuTakayanagiDimensions();
// v.ok        === true
// v.lhsDim    === ENTROPY    // {L:2, M:1, T:-2, I:0, Theta:-1, N:0, J:0}
// v.rhsDim    === ENTROPY
```

A test pins the registered `dimensional_signature` string to
`format(validate(RYU_TAKAYANAGI_RHS).inferredDimension)`, so any drift
between the AST and the catalog entry will fail CI.

### 4. Numerical evaluation

```ts
import { evaluateRyuTakayanagi } from './equations/be-14-ryu-takayanagi.js';

// Schwarzschild horizon for a solar-mass black hole:
//   r_s ≈ 2.95 km, A = 4π r_s^2 ≈ 1.095e8 m^2
const S = evaluateRyuTakayanagi({ area_m2: 1.095e8 });
// S ≈ 1.45e54 J/K — within an order of magnitude of the textbook
// Bekenstein-Hawking estimate (Carroll, "Spacetime and Geometry", §6.6).
```

The natural-unit form `S = A / 4` (with A in Planck areas) is exposed
separately as `evaluateRyuTakayanagiNatural`, and the SI/natural cross-check
is asserted to within ~1e-4 (CODATA roundoff in ℓ_P vs (ℏG/c^3)^(1/2)).

### Out of scope

- Computing the bulk minimal surface γ from a metric. Area is an input.
- Tensor-rank / index-structure tracking (the original holographic-QECC
  state-vector form `|ψ_bulk⟩ = U Σ α_i |code_i⟩` is not a numeric scalar
  equation — only the Ryu-Takayanagi entropy reduction is encoded here).

