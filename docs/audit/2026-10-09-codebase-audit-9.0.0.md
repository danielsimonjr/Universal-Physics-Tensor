# Universal Physics Tensor 9.0.0 — codebase audit

Tree: `master` at 7f36d16 ("release: 9.0.0 (#501)"), package 9.0.0, PhysJS pin a239a708. Read-only: nothing in the repository was changed. Date: 2026-10-09.

## How to read this

Every finding names a file and line, states the evidence that was observed, and proposes a fix. Items marked ✔ were verified by the audit lead with a second, independent method (a `bun` probe against `dist/`, a CLI run, `ls`, or `grep`) after a reviewer reported them; unmarked items rest on the reviewer's own probe or reading, which is cited. Severity is about consequence, not effort:

- **Critical**: a published surface says something false about what the code does, or a first-run example fails.
- **High**: a wrong number, a control or test that cannot fail, a public-path defect, or a record every agent loads that describes code that no longer exists.
- **Medium**: a real defect on a reachable path with a narrow trigger, a duplicated fact that has already drifted, or a maintenance trap.
- **Low**: dead code, stale comments, nits with a user-visible edge.
- **Nit**: cosmetic.

Negative results are listed per section so a reader knows what was checked and found sound, not only what was found wrong (AGENTS law 5).

## Executive summary

| Severity | Findings |
|---|---|
| Critical | 2 |
| High | 23 |
| Medium | 61 |
| Low | 92 |
| Nit | 18 |

Counts are bullets under each severity heading across the eight sections; a bullet that lists several sites counts once. 61 findings carry the ✔ second-method mark.

The 9.0.0 tree is in good shape where the gates look: the full suite, layer order, catalog schema, formal gate, README and CLI reference checks, dependency audit, package smoke and code-docs ratchet are all green, and every count in NOTES 2026-10-08 re-derives from the data. The defects are in what the gates do not measure.

Six findings matter most:

1. **Two first-contact documents are wrong about the tree.** README's "first five minutes" prints an output the CLI no longer produces (§8 D1), and MEMORY.md, the file every agent loads first, maps `src/` to directories that were deleted at 8.0.0 (§8 D2).
2. **Three evidence-grade claims are hand-set or cannot fail.** Every PhysJS reference carries `fidelity: 'sanity-lemmas'` though the sanity file covers 10 atlas bridges, not the 230 keys (§5 A1); `AtlasBridge.evidence` is hand-written and published in `data/atlas/*.json` while the derived tag differs on 20 of 20 bridges (§5 A2); `numericalRecovery` in `linkage.ts` scales every variable by one factor and so reports `tested: true` on any pair that already shares a normal form (§4 C3). These break AGENTS laws 1 and 3 directly.
3. **A gate the repo relies on is inert for half its inputs.** `effectiveAttributes` propagates only three of the six axes, so the anti-inert-metadata gate measures `symmetry`, `topology`, `statistics` as never checked whatever the data say (§4 C2).
4. **One canonical equation is wrong.** `CE-normal-distribution` encodes `exp(−x²/σ²)`; the ½ is missing inside the exponent and the entry is in the frozen criterion-3 corpus (§4 C1).
5. **Two library paths misbehave on reachable input.** A caller-supplied key named `G` (or any constant) overrides the constant on the graph evaluation path (§3 B2); `gl4-integrator.ts` swallows every error including programming errors (§2 N1), and a negative `tauMax` is accepted (§2 N2). `bridgeGradient`, a root export, throws for every spec (§2 N3).
6. **The test suite enforces two user-visible bugs** (`(undefined)` in a golden, `cplx=Infinity`), carries 48 catalog-count literals retyped on every ingest, and titles that state the wrong count in 12 files (§7 T1, T2, data-pin inventory); the pre-push hook swallows the failure of the generator it gates on (§7 T4).

The documentation layer has the most items by count (§8), nearly all one shape: a fact that was written in two places and moved in one. The 8.0.0 "catalog as data" move and the 9.0.0 labelled-output change are the two events most of the stale text dates from.

## Cross-cutting root causes

The 196 individual items reduce to seven mechanisms. Fixing a mechanism closes its whole row; fixing items one by one does not.

1. **Hand-set evidence where the law says derived.** `fidelity` on every generated PhysJS reference, `evidence` on every atlas bridge, `tested: true` from a recovery that cannot fail, `relation.confidence` beside `entry.status`. One owner per fact, derived at load, with a test that goes red when the hand copy reappears. (§5 A1, A2; §4 C3; §3 B1.)
2. **Controls and tests that cannot fail.** Manifest "swapped theorem" control that changes row shape; golden references at all-ones inputs; `expect(true).toBe(true)`; peer-gated controls that return instead of skip; axis gate blind to three axes; two falsification batteries that always return inconclusive. Each needs the red-first proof WORKFLOWS already prescribes. (§7 T8, T13, Low; §3 B4; §4 C2, Low; §5 A15.)
3. **The same fact typed in two places.** `todo.md`'s role in four files; the package `files` list in three; the Tom-review rule in two; axis lists in five modules; `getBridge` exported twice; 48 catalog-count literals across 30 test files; the composed-pair golden regenerated with every ingest. The routing table names this as the drift defect; the tree has it in the law file itself. (§8 D6, D8, D12; §4 Low; §7 T2, T6, inventory.)
4. **Data and schema weaker than the types.** Free-string unions in the catalog schema, `as unknown as` casts over JSON, `AtlasBridge.evidence` declared as a string while an array is emitted, `row.attributes as RegimeAttributes`, 91 catalog notes citing missing files. The JSON became the record at 8.0.0; its schema did not take over the TypeScript's strictness. (§3 B6, B8; §5 A5; §4 Low.)
5. **Error handling that erases the kind of failure.** Bare `catch {}` in `gl4-integrator.ts`, `retrodiction.ts`, `canonical-compare.ts`, `runNumericWitness` (NaN → checked); the pre-push hook's `|| true`. AGENTS law 4 (different facts stay separate) applies to failures too. (§2 N1, N10; §4 C6, C7; §5 A6; §7 T4.)
6. **Documentation that was not re-measured after the two big moves.** `src/bridges/equations/`, `src/composition/edges/`, `Float64ReferenceEngine`, "optional peer", "55-entry", "41-edge", "49-edge", `docs/dogfood/`, `BridgeEquations.*`: every one of these names something the 8.0.0 or 9.0.0 change removed. README claims a checker (`repo_map.py`) guards these documents; it is private and not run. (§8 D2, D5, D7, D9, D15–D17; §4 stale comments; §2 N19.)
7. **Retraction prose accumulating past readability.** CHANGELOG has two `[Unreleased]` headings and a 780-line stale block; NOTES.md holds 101 "record from before" tails with the live state in 7 bullets; four paragraphs carry more retractions than sentences. Law 8 says retract in history; it does not say keep every retraction in the live file. (§8 D3, D4, drift table.)

## Method

Lead: ran every repo gate, whole-tree scans (TODO, casts, skips, console patches, links, unused exports, drift prose, duplicate names, file sizes, CI pins, dependency freshness). Seven parallel read-only reviewers, one per subsystem: core/dimensional/numerical/diff; bridges and catalog data; composition/canonical/relations; CLI; atlas/formal/cases; tests, hooks and CI; documentation and governance. Each reviewer verified its own claims with a probe before reporting. The lead then re-ran a sample of every reviewer's top findings by a second method (✔) and assigned severities. Probe scripts are in the session scratchpad, not in the repository.

Counts quoted in this report were re-derived from the tree at 7f36d16, not copied from NOTES.md; where a NOTES figure was checked, the negative-results list of the relevant section says so.
## 1. Repository gates and whole-tree scans (lead)

Run on `master` 7f36d16 ("release: 9.0.0 (#501)") in a clean tree, after `bun install` and `bun run build`.

### Gates: all green

| Gate | Result |
|---|---|
| `bun run test` (pre-push suite, earlier in this session on the same commit) | 545 files, 6527 passed, 4 skipped (GL4_LONG) |
| `bun run layer:check` | `layer-order ok (3 upward edges, 0 cycles)` |
| `bun run catalog:json` | `catalog ok: schema 3, 160 records, package v9.0.0` |
| `bun run atlas:formal-gate` | `formalRef axiom gate: PASS (lean4-physjs manifest; no lean4-physlib formalRef)` |
| `bun scripts/readme-status.ts --check`, `bun scripts/cli-reference.ts --check`, `bun run physjs:table -- --check` | ok |
| `bun run audit:plans` | 12 unchecked items, 0 flip-eligible |
| code-docs ratchet (`tools/code-docs-ratchet/check.ts`) | PASS |
| `bun audit` | no vulnerabilities |
| `bun run smoke` | ok |
| `bun run package:check` / `npm pack --dry-run` | 1464 files, 1.85 MB packed, 7.8 MB unpacked, `data/` 1.3 MB shipped |

A green gate set is the baseline, not the finding. Everything below is what the gates do not see.

### Scan results

- **TODO markers:** 3 in the tree (1 under `src/`).
- **Type escapes:** `as any` 0 in code (4 in comments); `as unknown as` 31 in `src/` (list in §3 B8 and §2); `@ts-expect-error` 20 occurrences in 6 test files; `eslint-disable` 0.
- **Global side effects in library code:** `console.warn`/`console.error` are monkeypatched and restored in `src/composition/mathts-scalar-symbols.ts:134-141` and twice in `src/composition/expr-simplify.ts:82-89,129-136`. A throw between the assignment and the `finally` is handled, but concurrent callers (worker pool, vitest threads sharing a process) see each other's silenced console. Medium.
- **Skip markers:** 9, all `GL4_LONG`-gated or peer-gated (details in §7).
- **Broken relative links:** 2 (`docs/planning/v0.3.0-Implementation-Plan.md` → Part VIII; `docs/planning/Applied-Physicist-Candidate-Bridges-Design.md` → `../dogfood/`).
- **Unused exports (from `docs:deps`):** 77; unused files 0. The composition and bridges sections list the ones worth deleting.
- **Dependencies:** `bun outdated` shows minor devDependency updates (`@types/node`, `@viz-js/viz`, `fast-check`, `js-yaml`) and two majors held back by the range: `@vitest/coverage-v8` 4.1.11 → 5.0.3 and `tree-sitter` 0.22.4 → 0.25.1. No runtime dependency is outdated.
- **Drift prose:** "record from before" occurs 81 times in NOTES.md, 21 in CHANGELOG.md, 41 in `docs/architecture/INTEGRATION_MAP.md`, 2 in ACTIVE.md, and in 41 test files (top: `bridge-derivation-audit` 24, `catalog-adapter` 19, `compose-relation` 13, `confrontation-coverage` 13, `link-candidates` 12). The docs section (§8) counts the other retraction forms.
- **Duplicate exported names:** `getBridge` is exported from both `src/composition/descriptor.ts:80` and `src/atlas/bridge-record.ts:23` with different signatures; `classifyStructure` and `captureEnvironment` are overload sets. Low.
- **Largest files:** `physjs-entries.generated.ts` 3079 lines (generated), `probe/study.ts` 1763, `cli/commands/path.ts` 1411, `cli/commands/_atlas-map.ts` 1386, `numerical/spacetime-metrics.ts` 1257 (see §2 N7).
- **CI:** `ci.yml` and `publish.yml` pin Bun 1.4.2 and Node 22; vitest `include` is `tests/**/*.test.ts` and no test file sits outside it.
- **Runtime floor:** `.at(-1)` in `src/composition/ground.ts` needs Node ≥ 16.6, inside `engines`; the test suite's real floor is Node 22.6 (§7 T9).
## 2. Core, dimensional, numerical, diff (`src/core`, `src/dimensional`, `src/numerical`, `src/diff`)

Reviewer probes ran against `src/` with `bun`; items marked ✔ were re-run by the audit lead as a second method.

### High

- **N1 · `src/numerical/gl4-integrator.ts:373-385` — the step-halving loop swallows every error, not only a Picard failure.** `catch { subH /= 2; halvings++; }` catches whatever `gInverseFn`/`dgInverseFn`/MathTS throws. The module's own doc (lines 280-282) tells callers to enforce a mid-trajectory domain crossing by "supplying a `gInverseFn` that throws"; that throw is swallowed, the step is halved to `hMin`, and the caller gets `GL4ConvergenceError: … did not converge even at h_min=1e-9 (step 0)`. Probe: a `gInverseFn` throwing `RangeError('out of domain')` produced that message after 39 calls; a `TypeError('bug')` produced the same. ✔ (the bare `catch {` is at line 381). Fix: `catch (err) { if (!(err instanceof GL4ConvergenceError)) throw err; … }`.
- **N2 · `gl4-integrator.ts:342-368` — a negative `tauMax` integrates nothing and reports snapshots as if it had; `steps` is unvalidated.** `h = tauMax/steps` is negative, so `while (remaining > remainEps)` is false at once. Probe: free particle, `tauMax=-1, steps=2` → 3 snapshots, last `{tau:-1, x:[0], p:[1]}` (x should be −1); `steps=0` → `h=Infinity`, one snapshot; `steps=2.5` → 4 snapshots with `tau` 0.4, 0.8, 1.2 past `tauMax=1`. `geodesic-integrator.ts:207-211` validates `steps`; this entry point does not, and no test covers it. Fix: require a positive integer `steps` and a finite `tauMax`; reject or handle `tauMax < 0` explicitly.
- **N3 · `src/diff/bridge-gradient.ts:99-138` — `bridgeGradient`, public and root-exported (`src/index.ts:144`), throws for every shipped spec with an unrelated error.** The doc says the function "does NOT actually differentiate the catalog evaluators"; the behaviour is a crash: `engine.toNested(x)` receives autograd's `TapedTensor` and `mathts-engine.ts:24-29 unwrap` throws `NumericalBackendError: MathTSEngine.toNested: operand is not a MathTSEngineTensor`. Probe: Hawking-temperature and Shapiro specs both throw. All four `DIFFERENTIABLE_RELATIONS` (`bridge-specs.ts:354-359`) evaluate through plain JS, so no spec works. ✔ (export confirmed). Fix: throw `EngineCapabilityError(engine.name, 'reverseGrad')` with a message naming the limitation before building the tape, or drop it from the root barrel and keep `bridgeGradientNumerical` (verified correct: dT/dM = −3.1013e-38 vs analytic −T/M) and `bridgeGradientAST`.

### Medium

- **N4 · `src/core/tensor.ts:391-430, 440-475` — `addCell` is not fail-atomic on a replacement.** `addLaw`/`addBridge` replace an existing id first; when a flux rule then fails, `rollbackCell` deletes the id instead of restoring the previous entry. Probe: add valid law `L1`, then add a `LawCell` `L1` with `forces: []` → `FluxViolationError` and `getLaws().length === 0`. Same for a bridge replaced by a reverse-causality bridge. Fix: snapshot the previous entry before dispatch and restore it in `rollbackCell`.
- **N5 · `src/dimensional/dimension-spec.ts:358-359` — the glued-exponent rewrite corrupts constant spellings that end in a digit inside a product.** `.replace(/(?<=[A-Za-zΘ])([+-]?\d)/g, '^$1')` turns `mu0*length` into `mu^0*length`. ✔ Probe: `mu0*length` → `unknown base dimension 'mu'`; `eps0*length` → `'eps'`; `mu_0*length` works; bare `mu0` works only because `resolveAtom` catches the whole string first. `tests/dimensional/dimension-spec.test.ts:41-43` cover only the whole-atom path. Fix: protect registered constant spellings before the rewrite (tokenise identifiers; add `^` only after a base letter or a named dimension).
- **N6 · `src/dimensional/units.ts:364-396` — `1/s` is not a unit text, while `1` and `/s` are.** `unitReadings` special-cases `t === '1'` only for the whole string. ✔ Probe: `parseUnit('1/s')` and `parseUnit('1/m^3')` → `UnknownUnitError: unknown unit '1'`; `parseUnit('/s')` → T⁻¹; `convertValue('1Hz','1/s')` throws. Fix: treat a numerator token `1` as the dimensionless unit in `tokenWays`.
- **N7 · `src/numerical/spacetime-metrics.ts` — a second hand-rolled curvature and geodesic stack beside the existing one (74 `Math.*` calls).** `invert4` (76-101) is a hand Gauss–Jordan while MathTS exports `inv`; `christoffelOf` (145) and `christoffelFrom` (1007) duplicate `connection-lowering-helpers.ts:186` and `curvature-lowering-helpers.ts:224`; `tensorsOf` (178-258) rebuilds Riemann and Kretschmann beside `curvature-lowering-helpers.ts:314` and `kretschmann.ts:93`; the private `integrateGeodesic` (1117-1133) and the `accel` loop (710-722) are two more copies of the Γ·u·u RK4 step `geodesic-integrator.ts:112-178` provides, and the private function shadows that public name. The Kretschmann loop (237-256) is O(N⁸) (65 536 products per point) where raising one index at a time is O(N⁵). Fix: route `upt metric` through the existing helpers and MathTS `inv`.
- **N8 · `src/numerical/tensor-engine.ts:253-263` — a public type references a non-exported type.** `EinsumSpec` (`@public`, root-exported at `src/index.ts:456`) has `free: ReadonlyArray<EinsumFreeAxis>`, and `EinsumFreeAxis` is deliberately not exported. That breaks the MEMORY.md invariant "the public surface is closed under type references"; the only closure test (`tests/api/atlas-public-closure.test.ts`) covers the atlas facade, so the root surface is unguarded. Fix: export `EinsumFreeAxis` (or inline it) and extend the closure test to the root barrel.
- **N9 · Three scalar-function tables and a live hand interpreter.** `formula-contract.ts:56-82 FUNCTIONS` (20 `Math.*` entries), `lowering.ts:516-527 TRANSCENDENTAL_FNS` (re-created on every call) plus `Math.pow`/`Math.abs` at 500/538, `formula-dimension.ts:85-88 TRANSCENDENTAL_FN`, and `binding-value.ts:260-365 evalAst/evalOp/evalCall`, a full hand interpreter over the MathTS parse tree that re-implements the arity checks `FUNCTIONS` already has. NOTES.md says the retired hand interpreter lives in `tests/fixtures/oracles/`; this one is live and is the binding path. The dimension-carrying arithmetic has a reason to exist; the function table should be one. Fix: one table owned by `formula-contract.ts`, consumed by lowering and the binding evaluator.

### Low

- **N10 · `gl4-integrator.ts:235-253` — `solveGL4Stage` fabricates its "stage" result.** `stageX`/`stageP` are the advanced state and `stageDx`/`stageDp` are zeros ("In flat space p is constant"); in a curved metric the probe shows `stageDx = [[0],[0]]`. The `@internal` return type promises "the two converged stage values". Fix: document it as a stub or drop the shape.
- **N11 · `formula-dimension.ts:283-286` — no arity check on calls.** `parsePhysics('sin()')` → a wrapped `TypeError` (`undefined is not an object (evaluating 'node.kind')`); `sin(1,2)` silently drops the second argument. Fix: check `node.args.length` and throw a `FormulaDimensionError` naming the function.
- **N12 · `validator.ts:383-388` — literal-exponent detection ignores the exponent symbol's own dimension and accepts odd spellings.** `Number.isFinite(Number(expNode.name))` is true for `''`, `' '` (exponent 0) and `'0x2'`; a literal exponent carrying `dim: MASS` is accepted. Fix: require a dimensionless `dim` and a decimal-literal regex.
- **N13 · `validator.ts:707-718`** useless `try { … } catch (err) { throw err; }`; `423` and `830-831` dead `!== undefined` / `?? null` on a `Dimension | null` function; `388` a cast the preceding check already established; `313-317` `node: unknown` then `node as ExprNode`.
- **N14 · `units.ts:265-286` — a homogeneous power still competes when the token is not a single factor.** The doc (24-25, 232-236) says `m·m` never competes; `homogeneousPower` is applied only when `tryOneFactor` succeeds. ✔ Probe: `convertValue('1mmin','s')` → `'mmin' is ambiguous: m·min or mm·in or m·m·in`. Fix: drop homogeneous runs inside `segmentations` too.
- **N15 · Catch-alls that mask programming errors:** `binding-value.ts:456-458` (`catch {}` on a sibling's `readBinding`), `evaluator-uncertainty.ts:87-89` (`catch { probed = undefined }` → "the evaluator is undefined next to this input"), `binding-value.ts:410-413` (returns `undefined` on any non-ambiguous error). Fix: narrow to `UnitError`/`RangeError` and rethrow the rest.
- **N16 · `constant-rows.ts:337` — `grw_m0 = 1.67e-27` kg is a proton-mass literal in a second module.** The registry has `m_p = M_PROTON_SI`; the owner test's sentinel set does not list `1.67e-27`, `1.989e30`, `2.01824` or `0.5772156649015329`, so a drift of these would not be caught. Documented as the catalog expression's number, so a note. Fix: list the literal in the owner test or source it from `M_PROTON_SI` with a rounding note.
- **N17 · `labeled-tensor.ts:440-444` — wrong error text for the same-operand branch.** The same id twice in one operand throws `IdentityConflictError`, whose message says it "appears as a free axis on both operands".
- **N18 · `diff/bridge-specs.ts:319, 328, 337, 346` — `catalogId ?? 0`** silently labels a relation without a catalog id as `be-0`. Fix: throw.
- **N19 · Stale claims:** `null-ray-integrator.ts:250-252` "Used by `src/bridges/equations/be-37-shapiro-delay.ts`" (the directory does not exist; `integrateRK4` has no importer under `src/`); `input-validation.ts:267-270` names the same removed directory ("42 bridge-equation evaluators").
- **N20 · `formula-registry.ts:351-361` — dead variant.** `FormulaParserKind = 'mathts' | 'builtin'` while `getFormulaParserKind()` always returns `'mathts'`; three `async` functions return constants.
- **N21 · `gl4-integrator.ts:306-307`** doc says `gInverseFn(x)[μ][ν]` (nested) while the type (82-91) is a flat `Float64Array`.
- **N22 · `dimension-spec.ts:275-298`** hand-types `density`, `pressure`, `viscosity`, `resistance`, `magnetic_field`, `permeability` while `types.ts:53` exports `MASS_DENSITY` and the constant registry derives dimensions from unit text; no named dimension exists for N or J (`mol`, `amount` → unknown).
- **N23 · Exports nothing imports (scan over `src/`, excluding the defining file):** `core/constants.ts:151 GM_SUN_SOURCE`, `unit-convention.ts:21 QUANTITY_CONVENTION_UNIT`, `formula-dimension.ts:142 ELEMENTARY_CHARGE_MIX_MESSAGE`, `spacetime-metrics.ts` `metricParams`, `METRIC_SIGNATURE`, `METRIC_SIGNATURE_NOTE`, `Pt`, `CurvatureReport`, `KerrGeodesicSample`, `dimensional/constants.ts` `G`, `e`; types with no importer: `UnitReading`, `QuantityLiteral`, `NaturalPowers`, `ConstantRecord`, `NamedConstantValue`, `ConstantProvenance`, `FormulaName`, `QuantityKind`, `SignRole`, `DimensionValidationReport`, `UnitRow`, `UnitTableData`, `BindingValue`, `CorrelationTable`, `FieldSpec`. Test-only exports (fine, noted): `checkLBECoordinate`, `checkCausality`, `unitDimension`, `unitRows`, `DimensionSpecError`, `quantitySpellingIndex`, `readUnitFile`, `FUNCTION_EQUIVALENTS`, `BUILTIN_FUNCTION_LIST`, `integrateRK4`, `GL4_A/B/C`, the Kerr/Schwarzschild helpers, `DEFERRED_EVALUATOR_REGISTRY`, `metricDerivSupplied`, `resetEngineForTesting`, `isEinsumSpec`.
- **N24 · Unsafe casts in scope:** `unit-data.ts:112 as unknown as Dimension`; `gl4-integrator.ts:153` Float64Array → `readonly number[]` and `345-348 .slice() as number[]`; `mathts-engine.ts:86-114` seven duck-typed `as unknown as { add/sub/mul/scale }` AD dispatches; `mathts-engine.ts:163,201` and `bridge-ast-gradient.ts:204-206` dynamic-import casts; `formula-mathts.ts:186` and `formula-dimension.ts:366` MathTS node casts; `bridge-gradient.ts:127,236 as unknown as Input`; `input-validation.ts:357 raw as number` (then `typeof`-checked, so pointless).

### Nit

- `core/constants.ts:2,7-8` header still says "(v0.5.1)" and cites `docs/architecture/archive/v0.5.1-audit.md`.
- `formula-dimension.ts:99` "Shared by both transpilers" and 168-173 "The two front-ends" contradict the module header (one front-end).
- `flux-rules.ts:732` header "Rule 3 — Causality (WARNING tier in v0.7)" above ERROR-tier code (772-779).
- `validator.ts:203-204` cites pre-extraction line numbers.
- `tensor.ts:726-727` `totalElements` is a deprecated duplicate of `occupiedCells`.
- `binding-value.ts:168` `GLUED_NUMBER` carries a `g` flag never used (a fresh `RegExp` is built at 231).
- `labeled-tensor.ts:546` re-checks for duplicates that line 534 already rejected.
- `ast-builders.ts:296` `dim()` takes only L, M, T, I, Θ; a molar or luminous dimension cannot be built with "the single source of the builders".

### Checked and clean

- Every literal in `core/constants.ts` matches CODATA 2018 / the 2019 SI (c, h, k_B, e, N_A exact; G, α, ε₀, σ, Planck units, m_e, m_p, σ_T, b, m_u, GM☉ IAU 2015, ω₃); μ₀ = 1/(ε₀c²) is 4.4e-14 relative from CODATA; `H0_SI === convertValue('67.4km/s/Mpc','Hz')`; no CODATA literal outside the owner in scope except the documented `grw_m0`.
- Unit table: psi, torr, mmHg, BTU, hp, knot, mph, pc, ly, au, Da, eV, cal, gauss/G/kG/uG, nT, mT, Ts, Gs, Pm, PV, P, cP, hPa, dam, das, mK (refused against `m*K`), `mAh`/`mAs` by target dimension, `W/mK` by target, `mol/mL`, `%`, ppm, Jy, `K2`/`K²`, `m2K`, `cm^2/Vs`, `V/K2`, `N.m`/`N·m`/`N m`, `kΩ`, `µm`/`μm`/`um` all correct. Affine temperatures and differences correct; `degC/m` and `1degC+1` refused; `degR` proportional 5/9; `1e999` and `kbit` refused as documented. The three refusal classes are discriminated by class.
- Buckingham-π through MathTS `rationalNullspace`: pendulum → one group `T²·L⁻¹·g`; half-integer exponents handled. Natural-unit power algebra re-derived by hand and correct.
- RK4 via MathTS is 4th order (error ratio ≈ 15.3–15.7 per halving) and integrates backward; GL4 is 4th order (ratios 16.0–16.1) with Hamiltonian drift 2.3e-8 over τ = 200; the MathTS convergence message matches the regex pinned in `errors.ts:45`. Gauss–Legendre 16 weights sum to 2, exact to degree 31. `propagateEvaluatorUncertainty` correct at x = 0 with u > 0 and u = 0.
- No file in scope sets an evidence tag or references `formally-proved`. `addCell` on a fresh id is fail-atomic.
## 3. Bridges and catalog data (`src/bridges/`, `data/bridge-catalog.json`, `data/quantities.json`)

Reviewer: bridges agent. Lead re-verified the items marked ✔ with a `bun` probe against `dist/`.

### High

- **B1 ✔ `be-37` carries two different confidences and the two surfaces disagree.** The catalog entry's `status` is `speculative`; its `relation.confidence` is `established`. `src/composition/catalog-graph.ts:48` builds the graph edge from `relation.confidence`, so the edge is `established`, while `upt atlas be-37` reads `entry.status` and prints `speculative`. Probe: `status/confidence mismatches: 1` (be-37 only). One fact in two fields (AGENTS routing rule) and the only row where they drift. Fix: derive one from the other at load (`catalog-load.ts`) or make the schema refuse a mismatch; add the red-first test "every relation.confidence equals its entry status".
- **B2 ✔ A constant-named input key overrides the constant on the graph evaluation path.** `expr-parse.ts:56-62` (`formulaScope`) and `relation-eval.ts:89-109` spread the caller's inputs over the constant scope, and `holds.ts:157-160` does the same for conditions. Probe: `evaluateCatalogRelation('be-42', {mass: 1})` = 1.2269e23 K; with `{mass: 1, G: 1}` = 8.19e12 K. The public `evaluateRelation` is safe because `checkInputs` rejects unknown keys first, but the graph path (`CATALOG_GRAPH` edge `evaluate`, `retrodict`, `discover`) reaches the raw scope. Fix: build the scope as `{...inputs, ...CONSTANTS}` (constants win) or refuse an input key that names a constant.

### Medium

- **B3 Two definitions of "bridge" in `membership.ts`.** Lines 104-105 count every `law`-type relation as a bridge, so `bridgeCount` includes the 100-odd textbook laws; the atlas and the README use "bridge" for the 40 cross-domain rows. The two counts share one word and are reported side by side in `upt coverage`. Fix: name them (`relations`, `crossDomainBridges`) and keep them in separate fields (AGENTS law 4).
- **B4 Golden references that cannot fail.** `tests/bridges/catalog-reference-golden.test.ts:42-55` compares each relation's stored reference value against a recomputation at the reference inputs. 10 references have value 0 (the test rescales a zero to 1, so any tiny result passes), 61 use all-ones inputs (a formula with a wrong exponent on any input gives the same answer), and 19 are exponent-blind for the same reason. Fix: require at least one non-unit input per relation, and prove the test red by mutating one exponent.
- **B5 ✔ `src/bridges/registry.ts` is dead code while NOTES says it is the authoring site.** `registerBridge` has one caller in `src/`, itself. NOTES 2026-10-05 "registerBridge is the catalog authoring site" is stale since 8.0.0 moved the record to `data/bridge-catalog.json`. Fix: delete the module and retract the NOTES sentence, or route `catalog-load.ts` through it.
- **B6 ✔ Catalog notes cite files that no longer exist.** 37 `notes`/`known_issues` strings in `data/bridge-catalog.json` cite `src/bridges/equations/…`; the directory is absent (91 citations overall name a missing path, counting `src/composition/edges/…` and per-bridge evaluator files). Fix: rewrite to the JSON record and `catalog-load.ts`; add a schema-level test that every `src/` path in a note exists.
- **B7 Declared fields that nothing reads.** `relation.method`, `scopeLimits`, the schema's `formalRef` branch on entries, `derivedFrom`/`basis`, `encoded_form`, `tractability_class` have no reader in `src/`. Unused exports: `solveCatalogRelation`, `catalogRegime`, `SPINE_CONFRONTATION_POINTS`, `isActiveStatus`, the carrier-sign test hooks. Fix: delete or give each a reader and a test.
- **B8 Schema weaker than the TypeScript types.** `confrontations.ts:49` casts `as unknown as ConfrontationOutcome`; `known_issues` has no item schema; several unions (`status`, `type`, `kind`) are free strings in `data/bridge-catalog.schema.json`. A misspelt status enters the catalog unseen. Fix: enumerate the unions in the schema and drop the cast.
- **B9 `relation` and `regime` are stored twice** on 9 and 3 ids respectively (entry-level and relation-level copies that are compared nowhere). Fix: one field; test for equality until then.
- **B10 Source fields nothing reads:** be-88 `fermi-sea-mass`, be-33 `static-exponent-nu`, be-170 `onsagerb0` declare inputs that the formula never references. Fix: an input-contract test that every declared input appears in the formula.
- **B11 Output-only input contract is inconsistent.** be-52 marks its only output optional; be-139/144/146 mark theirs required (`input-contract.ts:129`). Fix: one rule.
- **B12 `catalog-adapter.ts` is stale.** Header says "44-entry"; `ingestCatalog` drops 109 of 160 rows silently; the test titled "counts unsubmitted entries as 21" asserts 109. Fix: either make the adapter cover the catalog or state what it skips and why.
- **B13 `deriveDomains` (`catalog-load.ts:45-71`) extends 73 `holds` conditions; 64 are silently stricter than the catalog text and 15 redundant; `catalog-domains.test.ts:106-124` compares the derived domain with itself. Fix: a test that samples the boundary of each derived domain against the catalog `holds` text.
- **B14 `src/bridges/index.ts:17-26` comment is false for four constants**, and be-62's evaluator holds the Euler–Mascheroni literal while `EULER_GAMMA` exists in `core/constants.ts`. Fix: import the constant; fix the comment.

### Low

- be-33's label disagrees with its proof's `covers` line (the Lean statement is the scaling shape, the label names the exponent).
- Square-labelled outputs on be-103/104/105/107 are computed by root expressions (the label says `x²`, the number is `x`).
- `evaluateFormula` accepts `max`, `parseCatalogExpression` rejects it, and arity is dropped on the way through.
- `rejected.ts` is a hand ledger with no data counterpart (the adjudications moved to data at 9.0.0; this list did not).
- Confrontation 52's recorded inputs do not reproduce its predicted value (5.02e-7 rad vs the 42.98″/century in the record; the unit is per orbit vs per century).
- `parameters[].quantity` is free prose for 200 of 302 parameters rather than a quantity id.
- The message "evaluateBridge: …" names an internal function in user-facing text.
- Catalog file order is 52, 54, 53.
- be-170's `holds` uses `==` on a float.
- A duplicate confrontation id is silently overwritten in the Map (`confrontations.ts`).
- `catalog-domains.test.ts` `CASES` covers 29 of 120 evaluators.
- The `formalKey` schema pattern accepts `ab-` prefixes that no catalog row may carry.
- `scripts/emit-catalog-json.mjs` is misnamed (it builds; it does not emit) and is a third copy of the schema rules.
- Carrier-sign check passes a NaN input.
- `src/index.ts:166,744-748` comments describe removed exports.

### Nits

Duplicate imports in two files; `statusToCellConfidence(string)` widens a union; `KnownIssue` JSDoc out of date; `^0.3333…` literal for a cube root; a redundant `count` field; evaluator 170 mixes quantity ids and symbol ids.

### Negative results

29 relations recomputed from textbook values agree to ≤ 4e-16. All 158 relation references reproduce from their stored inputs. Catalog counts (160 entries, ids 11–170, 124/33/3, 120 standard, 40 cross-domain, 158 relations, 120 evaluators, 19 confrontations, 9 adjudications) match NOTES 2026-10-08. `data/quantities.json` has no duplicate id, no missing dimension, no dangling alias.
## 4. Composition, canonical, relations (`src/composition/`, `src/canonical/`, `src/relations/`)

Reviewer: composition agent. Lead re-verified the items marked ✔ with a `bun` probe against `dist/`.

### High

- **C1 ✔ `CE-normal-distribution` encodes `exp(−x²/σ²)`, not `exp(−x²/2σ²)`.** `src/canonical/entries/nonmonomial.ts:410-426`. The entry's LaTeX says `e^{-(x-\mu)^2 / 2\sigma^2}`; its scalar AST is `exp(-1 · (dev² / σ²)) / σ`. The missing ½ is inside the exponent, so it is not a dimensionless prefactor and the `scalar-up-to-constant` fidelity claim is false. The ratio AST/true at x = 0.5, 1, 2 (σ = 1) is 0.88, 0.61, 0.14. The entry is in the frozen criterion-3 corpus and `tests/canonical/nonmonomial.test.ts:38` only checks id and dimension. Fix: wrap the denominator as `2·σ²`, add a one-point numeric pin, and record the corpus re-pin as an amendment (AGENTS law 8).
- **C2 ✔ The axis-discrimination gate cannot see three of its six axes.** `compose.ts:187-197` (`effectiveAttributes`) propagates only `scale`, `force`, `information`, so `auditAxisDiscrimination` (`axis-audit.ts:296-311`) measures `symmetry`, `topology`, `statistics` as `checked: 0` whatever the data say. Probe: injecting a `symmetry` clash on a real pair gives `checked 0, fires 0`; the `scale` control fires. The anti-inert-metadata gate is itself inert for the axes it exists to earn (AGENTS laws 2 and 3). Fix: fold over `AXES` generically, delete the three hand-written sets, and add the failing-first test with the injected clash.
- **C3 ✔ `numericalRecovery` in `linkage.ts:96-134` cannot fail.** Every variable is `(1.3 + 0.7·i)·s` with one common `s`, so any two ASTs that already share a normal form (same degree, homogeneous) give a constant ratio. `scanLinkages()` reports 618 results, 4 structural matches, 4 "tested", 0 with `maxRelErr > 0`; `x + 2y` vs `x + y` passes at 1.4e-16. `canonical-compare.ts:44-50` already documents and fixes this failure mode with per-variable bases; `linkage.ts` did not get the fix. Fix: per-variable sampling, or delete the field. `tested: true` is currently a free pass.

### Medium

- **C4 `discovery.ts:547-556` attributes a base-graph inconsistency to every candidate.** When neither endpoint is in the anchor closure the candidate inherits `baseNumericallyConsistent`, and `report.allConsistent` mixes base and hypothesis inconsistencies. Latent today (`contradictory: 0` on the catalog) but misclassifies the moment one base node disagrees. Fix: `contradictory` = `inconsistent(hyp) \ inconsistent(base) ≠ ∅`.
- **C5 ✔ A composed edge drops `regime`, `relation`, `coefficientUnset`, `evenInputs`, `formulaFactors`, `aliases`, `symbolic`** (`compose.ts:501-535`). Probe: `composeEdges(be-63, be-51)` has no `regime` though be-51 does; `composeEdges(CE-sound-speed, CE-debye-frequency)` loses `coefficientUnset` and `evaluateEdge` returns `NaN` instead of `CoefficientUnsetError`. Consequence: `joinRegimeMismatch` abstains on every chain longer than two, so the regime gate is bypassed by composing first. Fix: carry `regime` (intersect when families match, refuse otherwise), OR `coefficientUnset`, carry the even/factor maps.
- **C6 ✔ `retrodiction.ts:164-168` swallows every error in `forwardEvaluate`** (`catch { continue; }`), including `CarrierSignError`, `AliasConflictError`, `CoefficientUnsetError` and `TypeError`, while `retrodictNode` (207-213) rethrows `CarrierSignError`. One sign-policy answer, two outcomes; programming errors hide as "edge did not fire". Fix: catch only `DomainViolationError`/`CoefficientUnsetError`.
- **C7 `canonical-compare.ts:634` `catch { return []; }`** turns a dimensional parse failure into "no canonical equation has this target and these variables". `compareUserEquation('kinetic-energy = mass + speed', …)` prints the no-match sentence. Fix: a `not-compared` row carrying the parse message.
- **C8 ✔ The only `SOURCE_ALIAS_DISPOSITIONS` entry (`compose.ts:231`, `law-schwarzschild-radius>>be-51`, "ST-2") is unreachable.** `composeEdges(law, be51)` throws `CompositionJunctionError`; enumeration over `CATALOG_GRAPH` yields 22 composed ids and 1 `requiresDisposition` (`be-42>>be-12`), none equal to the key. Fix: add the identification the ST-2 physics assumes, or retract in CHANGELOG and remove.
- **C9 `upt discover` on the catalog takes 9.1 s** (`rankDiscoveries` 3.9 s for 4196 candidates: 192 full `retrodict` calls at ~28 ms plus 4196 `forwardClosure` calls, 0 of 4004 non-touching candidates change the closure). Fix: skip `forwardClosure` when neither endpoint is in the base closure; retrodict only targets whose backward cone meets `{a, b}`.
- **C10 ✔ Seven canonical entries spell constants under names not in `CANONICAL_CONSTANTS`** (`speed-of-light`, `planck-constant`, `boltzmann-constant`, `electron-mass`, `rydberg-constant`, `vacuum-permittivity`, `reduced-planck-constant`), so they become free source nodes. Probe: `evaluateRelation('CE-lorentz-factor', {velocity: 1e8})` → `missing input 'speed-of-light'`. Same for CE-compton-shift, CE-boltzmann-factor, CE-boltzmann-entropy, CE-rydberg-formula, CE-larmor-power, CE-plasma-frequency. The `{mass}` anchor can never reach them in discovery. Fix: register those spellings on the constant rows, one decision for all seven.
- **C11 ✔ `explain.ts:338` prints `via undefined (undefined)`** for a target determined only through a `QUANTITY_IDENTIFICATION`. Probe: `explainQuantity(CATALOG_GRAPH, 'temperature', ['hawking-temperature'])` → "'temperature' is determined from {hawking-temperature} via undefined (undefined)". Fix: branch on `derivations.length === 0` and name the identification.

### Low

- Hand-typed axis lists duplicate `AXES` (`quantity.ts:72`, `compose.ts:187-191`, `bridge-prediction.ts:31-43`, `seed-l-layer.ts:17-23`, `graph-viz.ts:421-430`).
- `frontier-account.ts:35` `CONTESTED_BRIDGE_IDS` and `enumerate.ts:132` `REGISTERED_COMPOSITION_IDS` are hand literals with no reader deriving them from the catalog.
- `compose.ts:351` removes the junction by object identity; after a `shared` disposition the same `Quantity` object sits twice and both would be removed. Unreachable today (C8), wrong by construction.
- `quantities.ts:18` `row.attributes as RegimeAttributes` is an unchecked cast from JSON; a misspelt axis value enters the gate.
- `probe/falsify.ts:127-134`: `retrodictionBattery` and `observationalBoundsBattery` always return `inconclusive`, so two of five batteries can never fail a candidate; `scoring.ts:22-27` then gives `expert-review-required` the same robustness as `falsification-survivor`.
- `relations/domain-regimes.ts:516-521` registers three regimes with empty inequality lists; `regimeHolds` returns `true` for them.
- `bridge-analysis.ts:100-110` `makeInputs` samples positives only, so any sign-dependent domain reports `no-samples`; `anchoringDistance` rebuilds adjacency per edge (O(E²), 0 external callers, exported).
- Dead exports: `temperatureQ`, `massQ`, `anchoringDistance`, `exprToInfix`; 24 exports with test-only callers (list in reviewer output); `regimesDiffer` is public with zero `src` callers.
- `structural.ts:383-396` re-validates every `BRIDGE_RHS_BY_ID` entry per chain classification (2.6 ms/call).

### Stale comments

`compose.ts:442-444` "nine edges carry a relation" (ten do); `canonical-graph.ts:8` "8 established, 36 speculative" (124/33/3); `descriptor.ts:31` "ids 11–54" (11–170); `composition/index.ts:7` cites `./edges/calibration.js` (absent); `relations/types.ts:45` says the file is under `src/atlas/`; `relations/composition-table.ts:18,27` cite `./path-bound.ts`, `./error-algebra.ts` which live in `src/atlas/`; `normal-form.ts:44` "only ln2/4pi/8pi" (17 keys), 52-59 orphaned JSDoc; `bridge-analysis.ts:145-148` dangling JSDoc for a moved `ALPHA`; `discovery.ts:6` "(132 → 36 → ~3)" (4196 candidates now); `edge.ts:254-259` describes a snapshot event as a rule.

### Negative results

No file in composition/bridges/canonical/relations imports the atlas barrel. `rankDiscoveries` does not import `adjudication.ts`; annotation passes never re-order. 22 canonical entries evaluated against CODATA/textbook values agree to ≤ 1.3e-3; every prefactor table value reads correct. The AST-monomial path that would skip a sourced prefactor is unreachable. `holds` handles `isInteger(...)` and hyphenated names. `COMPOSITION_TABLE` is 9 defined / 55 silent as stated. Refuted and unresolved are kept apart in `retrodict`, `linkage`, `grounding`, `falsify`.
## 5. Atlas, formal pins, applied cases (`src/atlas`, `formal/physjs`, `src/cases`, `data/atlas`)

Items marked ✔ were re-run by the audit lead.

### High

- **A1 · `src/atlas/physjs-ref.ts:282` — `fidelity: 'sanity-lemmas'` is hand-set for all 230 manifest keys, but the sanity-lemma file instantiates only the 10 atlas references.** `src/relations/types.ts:72` defines that value as "the statement was instantiated on known cases in `tests/atlas/formal-sanity.test.ts`"; that file has no `be-` reference at all ✔ and its completeness check (`:339`) enumerates only the ten `ab-*` ids. `derive-evidence.ts:250` turns the fidelity straight into `formally-proved`, so the 118 catalog rows that derive `formally-proved` rest on a fidelity label whose stated grounds are false for them. The real review of catalog rows is the `REVIEWED_ROWS_SHA256` pin, a different method with no name in `FormalFidelity`. ✔ `physjsFormalRef('be-249')`, a key with no bridge at all, returns `{kind: 'bridge', fidelity: 'sanity-lemmas'}`. Fix: add a `FormalFidelity` member naming the manifest-hash review (e.g. `'manifest-reviewed'`); emit `'sanity-lemmas'` only for keys the sanity file lists; make the sanity test fail when a `'sanity-lemmas'` reference has no lemma; refuse or mark `unreviewed` the keys ahead of the catalog.
- **A2 · `src/atlas/types.ts:128` — every atlas bridge stores a hand-set `evidence` set, it is published verbatim in `data/atlas/*.json`, and it disagrees with the derived set on all 20 bridges.** `derive-evidence.ts:6` says "no record stores an evidence set", yet the 20 records set it (`oscillators/bridges-exact.ts:117,181`, `bridges-limits.ts:214,323`, `bridges-coarse.ts:117`, `diffusion/bridges.ts:90,152,216`, `diffusion/bridges-closure.ts:110,179,267,334,376`, `waves/bridges.ts:63,97,169,266`, `waves/bridges-closure.ts:115,156,223`) and `serialize.ts:189` writes it into the CC BY 4.0 artifact (`data/atlas/oscillators.json` lines 556–990). ✔ stored ≠ derived on 20 of 20. Examples: `ab-chain-wave` stores `dimension-checked`, a tag `derive-evidence.ts` says "has no source on today's data"; `ab-stokes-einstein` stores `numerically-supported` while the derivation gives `symbolically-checked` only; `ab-spring-lc` stores `['numerically-supported','proposed']` and derives `['contradicted','formally-proved','symbolically-checked']`; every record stores `proposed` beside a positive tag, which the derivation never does. `tests/atlas/evidence-rule.test.ts:131` checks only that a stored tag has some witness, so it cannot fail. This is law 1 (no hand-set evidence tag) and law 4 (two different facts under one name). Fix: drop `evidence` from `AtlasBridge` or make it a derived accessor; have `serializeBridge` emit the derived set against the committed witness artifact; regenerate the JSON; add a test that the artifact's `evidence` equals the derivation.

### Medium

- **A3 · `physjs-ref.ts:401` — the manifest gate skips every structural check for the 79 keys ahead of the catalog (be-171…be-249).** The `continue` precedes the Lean-file check, the axioms/version/url checks and the compiled-table comparison at `:451`. Probe: a compiled `be-249` with `theorem: 'PhysJS.Wrong.theorem', axioms: ['sorryAx'], covers: 'nonsense'` → `physjsManifestProblems` returns `[]`; a manifest theorem with no file in `theorem-files.json` → `[]`. Fix: run the nested/compiled/file checks for every entry; skip only "resolves to a bridge" for ahead keys.
- **A4 · Neither the gate nor the hash pin would notice an axiom list containing `sorryAx`.** `physjsManifestProblems` compares `ref.axioms` to the manifest, but `ref` is built from the table generated from the same manifest, so they agree by construction; the top-level comparison at `:451` omits `axioms` and `leanProof`; `REVIEWED_ROWS_SHA256` hashes `[key, theorem, kind, covers]` only; `deriveEvidence` never reads `axioms`. Probe: manifest and ref for `be-16` both with `axioms: [...,'sorryAx']` → `[]`; `deriveEvidence` with `axioms: ['sorryAx']` → `['formally-proved']`. TOOLS.md records that Lean exits 0 on `sorry`; `leanProof` and `axioms` are self-reported by PhysJS and not re-measured here, so an axiom allow-list is the only local guard and there is none. Fix: reject any statement whose axioms are not a subset of `{propext, Classical.choice, Quot.sound}` (today all 230 have exactly that list); include `axioms` and `leanProof` in the compiled comparison and in the hashed rows.
- **A5 · The exported artifacts contradict their own schema.** `data/schemas/atlas-record.v0.json:181` declares `atlasBridge.evidence` as `"type": "string"` ✔ while `serialize.ts:189` emits an array; `data/atlas/oscillators.json` points `$schema` at that file; `tests/atlas/schema-pin.test.ts` pins the schema's structure only (no validator; `ajv` not installed). Fix: make the schema an array of `evidenceTag` and validate every committed `data/atlas/*.json` against it in `atlas-json.test.ts`.
- **A6 · `src/atlas/witness-numeric.ts:124` — `runNumericWitness` reports `'checked'` for a NaN target or NaN tolerance** because `fine > spec.tolerance` is false for NaN. Probe: `{target: NaN}` → `checked`; `{tolerance: NaN}` → `checked`. The finiteness guard at `:103` covers only evaluated values; this runner is on the public subpath. Fix: `unresolved`/`parse-error` unless `target` and `tolerance` are finite and `tolerance >= 0`.
- **A7 · `src/atlas/regime.ts:61` — `admitApproximation` has no caller in `src/`; the "gate at ADMISSION" runs only inside `tests/atlas/regime-admission.test.ts:376-384`.** ✔ no call site under `src/`. A bridge admitted without a horizon or `deltaAt` reaches the registry and the JSON export; only the test refuses it. Fix: wrap each family's `bridges` array in `admitApproximation` in `families.ts`.

### Low

- **A8 · `physjs-ref.ts:47`** module history ends at "PhysJS #68 adds be-134 through be-146"; the pin is PhysJS #73 with 230 entries to `be-249`. Fix: delete the running history and point at `NOTES.md`.
- **A9 · `coverage.ts:73`** "the 55 catalog rows" (the catalog holds 160). Remove the number.
- **A10 · `MissingDeltaAtError`** is thrown by `admitApproximation` but exported from neither `src/atlas/index.ts` nor `public.ts`, while `MissingHorizonError` is public. Export it.
- **A11 · `serialize.ts:103-112` `serializeBound` drops `deltaAtBasis`**, so the artifact cannot say whether a bound's point value is `closed-form` or `numerically-supported` (`ab-damped-massless` is the latter). Emit it and re-pin.
- **A12 · `error-algebra.ts:60` `composeBoundPath([])` returns an exact identity bound** `{K: 1, delta: 0}` for a path of nothing, and `composeBounds` propagates NaN, negative and infinite K or delta silently (`{K: NaN, delta: -1}∘{K: -2, delta: Infinity}` → `{K: NaN, delta: NaN}`). Fix: `RangeError` on an empty path and on non-finite or negative pairs.
- **A13 · `witness-numeric.ts:121`** maps `coarse === 0 && fine === 0` to ratio 1 → `no-convergence` with the text "refinement did not reduce the error", although the comment above says an exact scheme's honest ratio is Infinity. Give `0/0` its own reason.
- **A14 · `applicability.ts:181` `isGuarded`** matches a divisor symbol as a substring of the side-condition text: `x/a` with "the amplitude is positive" is guarded by the `a` of "amplitude". Match whole tokens.
- **A15 · Controls that cannot fail outside CI.** `tests/atlas/negative-controls.test.ts:239,244` and `tests/atlas/witness-results.test.ts:48` `return` silently when the simplifier is absent and `UPT_REQUIRE_PEERS` is unset; MathTS is now required, so the skip is dead on a correct install and a vacuous pass on a broken one. `tests/atlas/evidence-rule.test.ts:143` asserts inside `if (b.witnesses.length === 0)` and no bridge has zero witnesses. `tests/atlas/formal-sanity.test.ts:353` asserts a fidelity that `physjsFormalRef` sets unconditionally. `tests/atlas/chain-pipeline-catalog.test.ts:70` asserts `categoryCompositionForChain(...)` is `undefined`, and the function always returns `undefined`. Fix: `it.skip` with a reason or delete; rewrite the vacuous assertions as positive checks.
- **A16 · `physjsFormalRef` hands out a reviewed-grade reference for a key that resolves to no bridge** (`be-249` above). Refuse keys for which `physjsAheadOfCatalog` is true, or return `unreviewed`.
- **A17 · `benchmark/stats.ts:82` `mcnemar`** continuity correction goes negative then squared: `{b: 3, c: 3}` → `chiSquared: 0.1667` where the Edwards form `max(0, |b−c|−1)²` gives 0. `exactP` is right. Clamp.
- **A18 · `benchmark/hybrid-retrieval.ts:191`** a non-404 HTTP error from a present Ollama is reported as `'reply-not-a-vector'`. Use a distinct reason.

### Nit

- `chain-pipeline.ts:125` `categoryCompositionForChain` computes `relationsAreStored` and discards it; documented to always return `undefined`.
- `benchmark/run-atlas.ts:93` maps `'model-incompatibility'` to an instrument `'models'` no `AtlasRunConfig` field gates, and `checkApplicability` is called without `premises`/`conclusion`, so the finding cannot arise.
- `relations/regime.ts:381` `uncoveredRegions` pushes `coveredBy`, always `[]`.
- `benchmark/backend-shapes.ts:79` and `export.ts:51` return validated objects through `as unknown as` (extra fields kept); a typed pick would remove both casts.
- `benchmark/baselines.ts:61` `symbolNames` does not descend into `integral`/`derivative` nodes; `leakage.ts` states that limit, `baselines.ts` does not.
- `witness-dominance.ts:64` checks `fine.bound` but never `coarse.bound`.
- `scripts/vendor-physjs.ts:57` `DECLARATION` matches one leading attribute and a line starting with `theorem|lemma`; `open Foo in theorem …` on one line, or two attributes, would be missed (today every theorem resolves to exactly one file).
- `tools/formalref-axiom-gate/gate.ts:109` `lean4PhyslibReferences` scans only `ATLAS_FAMILIES`; a catalog row carrying a `lean4-physlib` reference would be silently excluded.
- `families.ts` imports the generic `AtlasFamily` type from `./oscillators/index.js`.
- `formal/physjs/manifest.json` records one theorem under two keys (`PhysJS.PlanckArea.area_law` for `be-14` as `derivation-step` and `be-43` as `bridge`); consistent, but `FILE_BY_THEOREM` keys by theorem so `theorem-files.json` shows one theorem, not two keys.

### Checked and clean

- No code path hand-sets `formally-proved`, `symbolically-checked`, `formally-proved-property` or `formally-proved-cross-check`; `deriveEvidence` requires `kind === 'bridge'` and a non-`unreviewed` fidelity.
- `composeBounds`/`composeBoundPath` arithmetic and fold order correct; the `model-pendulum → model-lc` route composes to `{K: 1, delta: 0.0158525}` and `model-telegraph → model-heat` refuses `norm-not-stated`, as NOTES states. Regime groups: a dimensionless input yields one trivial group, no double-add; `regimeHolds` is tri-state. Composition table 9 defined, 55 silent cells.
- `data/atlas/witness-results.json`: 22 rows, 18 numeric and 4 symbolic, all `checked`; numeric and CAS kinds are separate rows; each registered witness has a negative control; numeric controls assert `refuted` with a meta-check.
- Manifest/table/catalog: 230 entries, no duplicate keys, every theorem has exactly one Lean file, `theorem-files.json.commit` equals the manifest commit; 141 catalog rows carry `formalKey` equal to `be-<id>`; the 79 ahead keys are exactly be-171…be-249, all `bridge`, excluded from `bridgeSeedKeys`; derived tags 118 `formally-proved`, 41 `proposed`, 1 `contradicted`, matching NOTES. `data/atlas/*.json` are byte-identical to a fresh export.
- All six applied cases recomputed by hand from CODATA constants agree with `upt evaluate … --json` (resistor noise, skin depth, lumped cooling, Kepler RV, Brownian sphere, damped resonator; values in the reviewer's notes).
- Every `catch` in scope converts to a typed `unresolved`/fallback carrying the reason.
## 6. CLI (`src/cli/`, `src/cli-api.ts`, `bin/upt.mjs`, `cli/README.md`, `docs/CLI.md`)

Reviewer: CLI agent, every finding reproduced on the built `dist/` with `node bin/upt.mjs` and exit codes captured to a file (an early `head` pipe triggers the shim's EPIPE handler and reports exit 0; one such false alarm was caught and retracted). Lead re-ran the items marked ✔.

### High

- **K1 ✔ The CLI-boundary test passes vacuously.** `tests/cli/cli-boundary.test.ts:38` matches `^import (?!type\b).* from '../../` per line, so a multi-line `import {\n…\n} from '../../…'` is invisible. Two command modules import library values that way: `src/cli/commands/regime.ts:24-28` (`assertSynonymAgreement`, `resolveQuantityName`, `SynonymDisagreementError` from `dimensional/formula-names.js`) and `src/cli/commands/retrieve.ts:14-18` (`canonicalRetrievalCorpus`, `ollamaEmbedder`, `retrieveHybrid` from `atlas/benchmark/hybrid-retrieval.js`). The test reports 9 passed. NOTES 2026-10-08 "No module under `src/cli/commands/` imports a library value" is therefore false, and this is a test that cannot fail (AGENTS law 3). Fix: read the three names from `ctx.api` in regime.ts (`cli-api.ts` already exports them), add the retrieval functions to the barrel, make the test scan multi-line imports, and prove it red on the current tree first.
- **K2 ✔ `derive --json` emits a `prefactor` for a formula the text says does not match.** `src/cli/commands/derive.ts:235-247` sets `mean` before the `cv < 1e-9` test and spreads it unconditionally. `upt derive period:time length:length gravity:acceleration --formula "length*gravity" --json` → exit 3, `result.prefactor = 10.72…`, while text mode prints "formula does NOT match the dimensional monomial" and no prefactor. Fix: emit `prefactor: null` and `matchesMonomial: false` on that path.
- **K3 ✔ A non-zero exit with a JSON envelope on stdout contradicts the documented contract.** `cli/README.md:302-306` says errors never emit an envelope and exit non-zero with empty stdout. `search.ts:62-64`: `upt search zzzzqqq --json` prints the envelope and exits 1. `confront.ts:211-236`: `upt confront be-53 --json` prints `status: "refused"` and returns 1 after `emitJson`. Fix: exit 0 with the envelope (the no-match is the result, as `path` does) or document the two exceptions.

### Medium

- **K4 ✔ `map --out=PATH` is silently ignored in text mode.** `map.ts:715-729` honours `out` only in the visual branch. `upt map --source=catalog --out=FILE` → exit 0, 29 lines on stdout, no file, no warning; empty `--out=` exits 1 only with `--format=dot`, though `cli/README.md:539` says it always does. `docs/CLI.md` documents `--out` with no format restriction. Fix: honour it or reject it without a visual format (exit 2).
- **K5 ✔ `candidates.ts:49-53` hard-codes prose the adjudication ledger contradicts.** It calls `coarsening-length ≟ quantum-correlation-length` "genuinely motivated"; `ADJUDICATIONS` records that pair as `decoy` ("Non-equilibrium vs equilibrium length; unanimous") and `upt connectors` prints it under DECOY. The paragraph also prints under `--source=canonical`, where the pair does not exist. Fix: derive the example from `adjudicationFor` or delete the prose.
- **K6 ✔ `upt <command> -h` runs the command.** `main.ts:174` tests only `rest.includes('--help')`; `args.ts:44` passes single-dash tokens through as positionals. `upt map -h` prints the full linkage map (49 lines, exit 0); `upt help -h` → "Unknown command '-h'". Global help says `-h` is the same. `upt confront -h` runs every confrontation. Fix: treat `-h` as `--help` in `dispatch` and `help`.
- **K7 ✔ A registered example is broken.** `ground.ts:113` `example: 'upt ground temperature mass'` (printed in `docs/CLI.md` and `upt help`) exits 1: "no discovery candidate pairs 'temperature' with 'mass'". Fix: a pair that is a candidate, plus a test that every registered `example` exits 0.
- **K8 ✔ `upt metric kerr --geodesic` with no parameters fails.** Exit 2, "radial potential is negative at the start": the defaults at `metric.ts:273-281` give an unphysical start. `metric.ts:241,299` also convert any library throw into `UsageError`, so an internal error surfaces as exit 2 "usage". Fix: geodesic-valid defaults; map only known error classes.
- **K9 ✔ Duplicate inputs silently take the last value, inconsistently.** `upt eval x x=1 x=2` → `2`, exit 0 (`eval.ts:49-56`); `explain hawking-temperature mass=1 mass=2` uses 2 (the "given twice" guard at `explain.ts:212-214` fires only for two different spellings); `evaluate --sigma T_K=3 --sigma T_K=4` keeps 4 while a repeated positional `R_ohm=1 R_ohm=2` correctly errors; `regime --at` repeated keeps the last. Fix: reject a repeated key everywhere, as `evaluate` positionals do.
- **K10 Non-numeric binding exit codes differ by command.** `eval x x=nope` → 1; `explain … mass=nope` / `mass=1e500` / `mass=` → 2 (`explain.ts:89-93`); `regime --at theta0=nope` → 1. The README puts a bad value under exit 1. Fix: `CliError` for a bad value in explain.
- **K11 A non-existent catalog id and a real bridge with no evaluator get the same message, naming an internal function.** `upt evaluate be-999`, `be-53`, `be-11` all print "evaluateBridge: catalog id N has no evaluator" (`evaluate.ts:375-381`, text built in `bridges/evaluators.ts`). Fix: distinguish "not a catalog id" from "no evaluator"; drop the prefix.
- **K12 `cli/README.md` is stale against the registry** while `docs/CLI.md` is generated and current. Flags with no mention: `--verbose`, `--bind-short`, `--route`, `--family`, `--observable`, `--all-routes`, `--max-routes` (map); `--compare` (path); `--ollama-url` (retrieve); `--budget-ms`, `--holdout-tol`, `--alpha` (probe); `--source=poster`. README:495 describes `--equation-only` as "skip the linkage map" but verdict-only is now the default and `--verbose` adds the map. Fix: generate the flag table or prune the README to the exit-code and syntax notes it claims to keep.
- **K13 `symbolic.ts:696-707` prints a `confidence` line in text only; `--json` has no `confidence` field.** `symbolic.ts:670` also says "MathTS absent" though MathTS is required. Fix: add the field; drop the phrase.

### Low

- `derive.ts:224-227` reports a non-finite result as "formula uses an undeclared variable: … (got Infinity)". Classify by error class.
- `derive` exit code for an undeclared symbol depends on the branch (2 on a unique monomial, 3 on a non-unique one).
- Doubled "parse error: parse error:" prefix in `eval.ts:107` and `derive.ts:174`.
- `derive` leaks raw MathTS text "Undefined symbol c" where "declare `c:c`" is the fix the help describes.
- A non-finite eval result exits 2 while a non-finite eval input exits 1; the README defines 2 as syntax.
- `audit.ts:421-425` emits `definitions` twice in `--json` (nested and top-level).
- `cli/README.md:258-271` envelope shape omits keys real envelopes carry (`readiness`, `adjudicationSummary`, `rigorDistribution`, `statisticDistribution`, `dataHandlingDistribution`, `compositionRecovery`); `confront --bridge=be-37 --json` reports `rigorDistribution` for the whole registry (`api.rigorDistribution()` takes no selection).
- Number formatting is per-command: explain 15 s.d., evaluate full doubles and σ at 3, path 6, derive/symbolic `toExponential(4)`, audit 3, recover 0, confront `toFixed(1|2)`, discover `toFixed(1)`. One evaluate line prints the same number at two precisions ("116045.181215501 K … 1.160452e+5 K"). Route through `formatQuantity`.
- `evaluate` prints SI base units for derived outputs (be-58 `[kg^2*m^4/(s^5*A^2)]` where `V^2/Hz` is expected).
- `explain` NOT COVERED suggestion searches stop-word-like tokens (`not-a-quantity-xyz` → "`upt search not` finds 63"); `explain.ts:264` drops only tokens under 3 letters. Apply `STOP_WORDS`.
- `explain` with a domain violation exits 0 and buries it in the summary (`mass=-1`), while `evaluate` exits 1 for the same class.
- `testplan.ts:143` is case-sensitive on case ids; `evaluate.ts:370` lowercases.
- `regime.ts:54` usage omits `--assume`/`--deny`; `regime plasma` says "UNCHECKED" for a family that states no inequality (VACUOUS).
- `map --source=poster` is a documented value that always prints EMPTY.
- `map --proposed` in text mode only adds the anchor line (`map.ts:644-654`); no proposals, no warning.
- `--natural --geometrized` together accepted silently (`eval.ts:116`, `map.ts:623`).
- No `--` end-of-options (`args.ts:44-53`).

### Nit

`cli/README.md:182` version example `0.29.0`; `closed-form-range.ts` and `published-url.ts` import library values from support modules, the edge NOTES already records.

### Unverified (the reviewer stopped on the lead's wrap-up request)

A second batch of about 60 edge invocations (metric/testplan/confront/discover/probe/retrieve) was cut short; `probe run --problem=package.json` wording, `retrieve --embed` fallback text, `confront --rigor=nope`, `metric schwarzschild M=0|r=0|r=1km` were not checked. `--record`/`--replay`/`--show-record` end-to-end flows were not exercised beyond argument validation. A text-mode sweep for leaked `undefined`/`NaN` was not run (the JSON sweep was). `record*.ts`, `_atlas-map.ts` (1386 lines), `probe.ts`, `discover.ts` were grep-read, not reviewed line by line.

### Negative results

Unit-edge inputs behave: `T=25degC`, `T=10eV` (k_B T note on stderr), `A=1cm^2`, `R_ohm=1kohm`, `R_ohm=1cm` refused with the dimension, `--sigma T_K=1m` refused, negative kelvin and `mu_e ≤ 0` refused by the domain, unknown key exit 1, `=2` exit 2, `BE-63`/`63`/`be-63` all accepted. A `--json` sweep over 43 invocations: every zero-exit stdout parses; non-finite numbers appear only as the documented `"Infinity"` strings; no `"undefined"` or `[object Object]`. Exit-code contract held where documented: `map --equation` factor-2 Hawking exit 3 (`kind: 'factor', ratio: 2`), exact Hawking 0, `regime --at theta0=0.9` 3, `path … t=1000` 3, `--sweep` validations all exit 1 with precise messages. Dispatcher: unknown flag exit 2 naming the flag and command, `--json` twice exit 2, `--record` without a file exit 2, `--replay=missing` exit 1, `upt chain` exit 2 with its status. `map` option validation lists the vocabulary on every bad value; `--format=svg` renders; filter legends print both drop counts. `atlas be-16` prints the stored formalRef without deriving `formally-proved`; `be-57` says no formalRef. `explain` bridge-id redirect forces `source: "catalog"` as documented; `G=7e-11` rejected as a constant disagreement; `sound-speed` without `gamma` prints no number and `gamma=1.4` → 341.565025531987 (NOTES). `evaluate --help` range is registry-derived (`BE-16/42/51/52/55..170`); `docs/CLI.md` is fresh; `src/cli` has no message-regex classification and no `process.*` use outside `main.ts`/`record*.ts`/`output.ts`.
## 7. Test suite, hooks and CI (`tests/`, `.githooks/`, `.github/workflows/`, `bench/`)

Reviewer: tests agent. Lead re-verified the items marked ✔ by reading the cited lines. Headline numbers from the latest master CI run, not from docs: 545 test files, 6531 tests (6527 pass, 4 skipped), 654 s wall. The pre-push hook and NOTES.md:536-537 still say "58 s warm, 4,659 tests".

### High

- **T1 ✔ A committed golden pins a formatting bug.** `tests/cli/golden/discover-derive.txt:28,35,63` contain `equals ? (undefined) — an equal-[energy] scale`. Source: `src/composition/consequence.ts:143` interpolates `(${other?.id})` after `other = sources.find(e => e !== home)`, which is `undefined` for a one-source proposal. Both golden harnesses enforce the literal `(undefined)` in user-facing output. Fix: omit the parenthetical when `other` is undefined; regenerate the golden in the same commit; retract in CHANGELOG.
- **T2 ✔ Test titles contradict their bodies in every catalog-pin file.** `confrontation-coverage.test.ts:24` "audits all 58 catalogued bridges" asserts 160; `:54` "the tiers sum to 48" asserts 160; `catalog-adapter.test.ts:151` "unsubmitted entries as 21" asserts 109; `linkage-map.test.ts:25-26` "127-edge graph into 102 components (98 isolated)" asserts 133/129; `discovery.test.ts:251` "(1525)" asserts 4196; `link-candidates.test.ts:28` "(389)" asserts 4196; `discovery-calibration.test.ts:109` "1176" asserts 1777; `atlas/coverage.test.ts:83` "55 rows" asserts 160; `audited-catalog.test.ts:64,69` "63 rows and 54 edges" asserts 160/158; `source-extension.test.ts:85` "44" asserts 160; `proposed-bridges.test.ts:281` "faithful 44" asserts 160; `compose-relation.test.ts:98-103` "exactly the seven" lists ten. Fix: strip numbers from titles; keep the number only in the assertion.
- **T3 `docs/architecture/TEST_COVERAGE.md` cannot see 37 test files and over-credits barrel imports.** The generator (`tools/create-dependency-graph/create-dependency-graph.ts:372-470`) maps tests to sources only through `src/` imports; 53 files import `dist/cli/main.js` and 37 import only `dist/`, so `src/cli/record.ts`, `record-reach.ts`, `conventions.ts`, `determination.ts`, `top-level-help.ts` are listed as uncovered though `record-*.test.ts` exercise them. `traceReExports` credits every file behind a barrel, so "349 of 360 covered" is inflated. Direct-import measurement: 59 src files have no test importing them directly (`cases/quadrature.ts`, `composition/formula-shape.ts`, `dimensional/constant-rows.ts`, `numerical/input-validation.ts`, `numerical/covariant-eikonal.ts`, `atlas/translation.ts`, `composition/consistency.ts`, `composition/composition-recovery.ts`, `relations/domain-regimes.ts`, `dimensional/natural-units.ts`, `dimensional/hyphen-names.ts`, …). The doc's "Expected test: `tests/unit/<module>/x.test.ts`" (generator line 1772) names a directory that does not exist. Fix: resolve `dist/<p>.js` → `src/<p>.ts`; report barrel-traced and direct coverage as two columns.
- **T4 ✔ The pre-push hook swallows the failure of the generator it gates on.** `.githooks/pre-push:90-91`: `bun install … || true`, `bun run docs:deps >/dev/null 2>&1 || true`, then `git diff --quiet -- docs/architecture/`. A crashed generator leaves the tree unchanged and the gate prints OK; CI's `docs-fresh` then fails. Line 138 does the same for the code-docs checker. Fix: drop `|| true` and fail on non-zero.
- **T5 ✔ A unit test fetches from the network.** `tests/tools/criterion3-labels.test.ts:51-55` runs `git show <commit>:corpus.json` and, on failure, `git fetch --depth=1 origin <commit>`. In a shallow clone the outcome depends on GitHub. Fix: vendor the labelled corpus bytes or their SHA-256 (Amendment 8 records it) into `tests/fixtures/`.

### Medium

- **T6 The composed-pair golden is regenerated inside the change it should detect.** `tests/composition/compose-relation.golden.json` (7.3 MB, 24964 rows) was rewritten in 8 catalog-ingest commits between 2026-10-04 and 2026-10-07; `compose-relation.test.ts:120-129` pins `24964` and `22`, which also move per ingest. Fix: pin the invariant (every composed pair's outcome under the table); store the ordered-pair golden additively.
- **T7 The 36-case golden corpus runs twice through identical code.** `upt-golden.test.ts` spawns `bin/upt.mjs` (a shim over `dist/cli/main.js`); `inprocess-golden.test.ts` calls `runCli` from the same module. 190 s + 91 s of the 654 s suite; both headers are stale ("before the TypeScript CLI port"). Fix: keep the in-process corpus plus one or two spawned smoke cases.
- **T8 ✔ Peer-gated controls pass vacuously instead of skipping.** `negative-controls.test.ts:239,245`, `witness-results.test.ts:75` (and `witness-runners.test.ts`): `if (!peerPresent && !peerRequired) return;` inside `it()`. Vitest reports passed, not skipped. `tests/peers-required.test.ts` checks only autograd, not the simplifier or viz peer. Fix: `it.skipIf(...)`; extend `peers-required`.
- **T9 ✔ `engines.node >=18.0.0` is wrong for the suite.** `basic-usage.test.ts`, `readme-examples.test.ts`, `readme-snippets.test.ts` spawn `node --experimental-strip-types` (Node ≥ 22.6); 7 files use `import.meta.dirname` (≥ 20.11). CI pins Node 22. Fix: `engines.node >=22.6` and say so in TOOLS.md.
- **T10 ✔ `GL4_LONG_ORBITS`/`GL4_LONG_STEPS` are never set anywhere.** `conserved-charge-mercury.test.ts:100-101` defaults to 2 orbits "full 10-orbit via env override"; `gl4-integrator.test.ts:205` defaults to 20. The nightly sets only `GL4_LONG=1` (`ci.yml:239`). Nightly log: Mercury test 109 ms. Fix: set the override in the nightly or delete it.
- **T11 Spawn-based CLI tests are the slow tail.** CI per-file: `upt-golden` 190 s, `new-commands` 136 s (five `upt ground` calls at 360 s budgets), `inprocess-golden` 91 s, `upt-map-format` 79 s, `hardening` 75 s, `json-contract` 51 s, `evaluate-repro-built-cli` 50 s, `upt-discover-opts` 47 s, `source-anchor` 45 s. 16 CLI files recompute the 4196-candidate funnel from scratch. Fix: a memoised discover helper; one file for `ground` cases.
- **T12 `upt-map-format.test.ts:31` silently skips when `dist/` is absent** (`describe.skipIf(!existsSync(distIndex))`, header stale: CI builds first) while 70 sibling files fail; `public-surface.test.ts:346-364` warns and returns. A scoped run after editing `src/cli` without rebuilding passes against stale `dist/` in all 70 files. Fix: one `tests/helpers/dist.ts` that throws when `dist/index.js` is older than the newest `src/**/*.ts`.
- **T13 ✔ The manifest "swapped theorem" control changes the row shape, not the theorem.** `physjs-manifest.test.ts:102` maps row 0 to a 3-column row (drops `covers`), so the hash differs even if the hasher ignored the theorem column. Fix: `[row[0], rows[1][1], row[2], row[3]]`.
- **T14 `bench/README.md:15` says CI writes `bench/results.json`; nothing runs `bench`.** The README also lists two bench files that do not exist, omits six that do, and says `files` ships only `dist/`, README, LICENSE. Fix: correct or delete the claim.
- **T15 `publish.yml` runs the full suite twice** (`bun run test` at line 36, then `prepublishOnly → validate → npm test`); `ci.yml` `test` compiles three times and runs the probe suite twice. Fix: `--coverage` on the single run; drop the duplicate test step.

### Low

- `catalog-adapter.test.ts:102-104` `else { expect(true).toBe(true); }`.
- `probe/coverage-backfill.test.ts:516` `if (!first) return;` passes on an empty map.
- `canonical-compare-pairing.test.ts:56,68` `expect(CONST).toBeDefined()` on imports.
- `tests/cli/golden/audit.txt:129` pins `cplx=Infinity be-150` (source `audit.ts:117`).
- `probe/backend.test.ts:53-59` "kills a hung worker" at 200 ms can kill the child before it starts; the assertion is satisfied either way.
- 13 test files `mkdtempSync` and never `rmSync`.
- `hybrid-retrieval.test.ts:161-164`, `retrieve.test.ts:48` connect to `127.0.0.1:1`/`:9`; a sandbox that drops rather than refuses hits the 1000 ms timeout and reports a different reason.
- `witness-runners.test.ts:69-78`, `probe/modules.test.ts:119-129` are the last two wall-clock-ordered tests (20× and 50× margins).
- `.githooks/pre-push:75-78`, `NOTES.md:536-537` claim "58 s warm"; CI measures 654 s.
- `actions/checkout@v7`, `setup-node@v7` tag-pinned while `setup-bun` is SHA-pinned; no dependency cache in any job; the code-docs ratchet runs only on `pull_request`, so a direct push to master never runs it.
- `.githooks/pre-push:130,186` hard-code `$HOME/Github/skills/...` and `python`; both gates skip silently elsewhere.
- `scripts/atlas-benchmark-models.mjs:41` hard-codes `F:/bench-iso`.
- `tests/numerical/engine-conformance.test.ts` runs the AD conformance, not the engine one; `engine-conformance.ts:2-3` says "Both MathTSEngine and MathTSEngine".
- `vitest-coverage-alignment.test.ts:7-8` "No CI job runs them" is stale (`ci.yml:47`).
- 9 test files redefine a local `sym`/`dim` builder (two with `dim: {}` cast to `ExprNode`); 39 CLI test files define their own `run`/`capture` over `runCli`.
- `catalog-reference-golden.test.ts:17-31` hand-lists 13 `ONE_ULP` ids, a platform artefact typed as data.

### Nits

`public-api-stability.test.ts:70` split string only defeats grep; `physjs-manifest.test.ts:93` pins the toolchain literal outside the hash; `gl4-integrator.test.ts:176-180` "NOT EXERCISED IN COMMIT" is stale (nightly runs it); `formal-sanity.test.ts:91` carries the suite's only TODO.

### Data-pin inventory

48 literal counts across 30 files are retyped on every catalog change (full table in the reviewer output; the densest: `linkage-map.test.ts` 8 literals, `confrontation-coverage` 5, `formalref-kind` 5, `bridge-derivation-audit` 5, `compose-relation` 4). "Record from before" comments: 191 across 44 test files. Suggested fix for the class: one `tests/fixtures/catalog-census.json` written by a script with `--check` in `docs-fresh`.

### Negative results

545 `*.test.ts` files = CI's 545; no `.spec.ts`/`.test.js`; the four tests under `tests/fixtures/` are collected. 37 golden files = 36 cases + 1 stderr, no orphan. No `it.only`/`describe.only`/`it.todo`. No golden test asserts only that the file parses. No `expect.any` outside one positional-mock site. No `catch {}` swallows an assertion. The layer-order live gate has positive controls for the yml. Scoped runs of the seven most suspicious files: 54/54 pass. `tests/fixtures/schwarzschild.ts` uses `C_SI`, `G_SI` (no truncated constants). No hard-coded repo-root paths in `tests/`, `tools/`, `scripts/`. Every real-process spawn uses the 30 s hang guard.
## 8. Documentation and governance records

Reviewer: docs agent. Lead re-verified the items marked ✔ with a CLI run, `ls`, or `grep`.

### Critical

- **D1 ✔ README's "first five minutes" example prints something the CLI no longer prints.** `README.md:89` claims `upt evaluate be-63 mu_e=2` prints `M_Ch_solar = 1.4558683960704613`. The CLI prints `mass [kg] = 2.895722239784147e+30` (same mass, different name, unit and line). `tests/tools/readme-examples.test.ts` runs only the TypeScript fences. Fix: replace the sentence; extend the README test to the bash fences.
- **D2 ✔ MEMORY.md's source map describes a `src/` layout that no longer exists.** `MEMORY.md:48` (bridges row) names `equations/`, `gravitational-lensing.ts`, `perihelion-precession.ts`, `be55…be62-*.ts`, `be51Edge`/`be52Edge` in `src/composition/edges/calibration.ts`; `MEMORY.md:50` (composition row) names `edges/catalog-full.ts`, `catalog-{quantum,…}.ts`, `quantities.ts` barrels. `ls src/composition/edges src/bridges/equations` → both absent; `grep -rlw be51Edge src` → none. The 8.0.0 CHANGELOG records the move to `data/bridge-catalog.json` → `catalog-load.ts`/`registry.ts` → `catalog-graph.ts`. MEMORY.md is what every agent loads first. Fix: rewrite both rows.

### High

- **D3 ✔ CHANGELOG has two `## [Unreleased]` headings** (lines 9 and 416). The second is a 780-line block between `[3.0.0]` and `[2.0.1]` with three `### Added`, three `### Fixed`, two `### Changed`, opened by a "Status as of 2026-10-04" banner carrying 20 retraction phrases. Its content shipped in 4.0.0/5.0.0. Fix: fold lines 416–1194 under the releases they shipped in; keep one `[Unreleased]`.
- **D4 `## Notes released before 9.0.0` (CHANGELOG:95)** is a non-version heading with duplicate sub-headings (`### Fixed` at 99, 105, 208; `### Breaking` 117, 195; `### Documented` 121, 137). Fix: merge and move under the version whose code it describes.
- **D5 ✔ Hand-written architecture docs describe removed code, and README says a checker guards them.** `README.md:324-325` says every authored document ends with a `## Verification` block and `repo_map.py check` fails when a claim drifts. `repo_map.py` is private and not run (ci.yml says so; the Verification block itself says it was not re-run). Meanwhile `docs/architecture/ARCHITECTURE.md:72` "50 ids in BRIDGE_EVALUATORS" (120), `:114` "MathTSEngine lives behind an optionalDependency" (it is a dependency), `:190,:280` describe `Float64ReferenceEngine` (`src/numerical/float64-engine.ts` absent, not exported); `API.md:307,334,342-344` document importing it; `COMPONENTS.md:560,821`, `DATAFLOW.md:158,225,240,491` ("49-edge graph"; 158), `OVERVIEW.md:40`; `docs/specification/Part-X-Curvature-and-Field-Equations.md:201` names the same engine. Fix: delete the `repo_map.py` sentence or state the checker is private; re-measure or strike the sentences.
- **D6 ✔ The role of `todo.md` is stated four ways and they contradict.** `AGENTS.md:15` "actionable open work"; `AGENTS.md:46` sends status there; `CLAUDE.md:12` "Open work is in `todo.md`"; versus `WORKFLOWS.md:8` and `MEMORY.md:113` "`todo.md` is the historical ledger"; `docs/README.md:42` "later planning lives in … todo.md". `todo.md` has 0 `- [ ]` and 303 `- [x]` rows. This is the routing table's own drift defect, in the law file. Fix: AGENTS row → `ACTIVE.md`; CLAUDE.md:12 → "Open work is in `ACTIVE.md`"; keep one of WORKFLOWS/MEMORY.
- **D7 ✔ ACTIVE.md ticked rows name report files that do not exist.** 10 rows (247, 274, 300, 321, 324, 328, 389, 426, 428, 432) say "The report is `docs/dogfood/…-rN.md`"; `docs/dogfood` is absent (moved to `docs/persona-sessions/…-session-N.md` at 8.0.0). Same dead path in `todo.md:22-23`, `docs/planning/Applied-Physicist-Candidate-Bridges-Design.md:5` (dead relative link), `CHANGELOG.md:141,167` (inside the block rewritten at 9.0.0 time), `.github/workflows/publish.yml:45`.

### Medium

- **D8 ✔ What the npm package ships is stated three ways.** `README.md:50` "ships `dist/`, `bin/`, this README and the licence"; `docs/CLI.md:146` / `upt atlas --help` say `witness-results.json` "is not in the published package"; `NOTES.md:135` (2026-10-03) "still does not ship `data/`". `package.json` `files` = `["dist","bin","data","README.md","LICENSE"]` and `scripts/package-smoke.mjs` requires every `data/` file to ship. Fix: README adds `data/`; the `--stored` help drops its sentence; NOTES gets a dated correction.
- **D9 ✔ CONTRIBUTING.md is stale.** `:64` "41-edge graph" (158); `:74` "55-entry catalog" (160); `:77` "`src/bridges/index.ts` … regenerate with `bun run catalog:json`" as the source of truth (the JSON is the record since 8.0.0); `:94` "TypeScript 5.9+/6.x" (7); `:99` "Conventions live in `CLAUDE.md`" (a loader). Fix: point at the data file, drop the counts, say TypeScript 7, point conventions at AGENTS/WORKFLOWS.
- **D10 ✔ `cli/README.md:77` "29 commands"** vs README's generated "30 commands: 28 registered, plus help and version"; `src/cli/commands/` holds 28 command modules. Fix: derive or delete the number.
- **D11 ✔ `ROADMAP.md:489` keeps the phrase ACTIVE.md retracted**: "On 2026-10-01 the owner dropped the human-dependent studies and removed the human-reviewer gates." `ACTIVE.md:7` strikes that sentence and adds the 2026-10-06 rule that Tom reviews every agent PR. Fix: restate as "dropped the study gates" and point at ACTIVE.md.
- **D12 The Tom-review rule is stated in two live files with its date** (`WORKFLOWS.md:117` and `ACTIVE.md:7`); one should reference the other.
- **D13 18 design docs under `docs/planning/` carry status, dates and counts** (AGENTS rule 6): `Formula-Dimensional-Check-Design-Note.md:11` "Status: IMPLEMENTED 2026-06-14"; `MathTS-Formula-Integration-Design-Note.md:12`; `Identifiability-Classifier-Design-Note.md:12`; `Retrodiction-Harness-Design-Note.md:15`; `System-Requirements.md:49` "Status: met at v0.1.0"; `v0.5.0-Implementation-Plan.md:2222` "COMPLETE"; `v0.1.0-Release-Procedure.md:120` "as of 2026-05-05"; `v0.10.0-Improvement-Plan.md:44` "MET"; "Status as of 2026-10-02/03" banners in `Atlas-Phase-4-Design.md:3`, `Atlas-Roadmap-Implementation-Plan.md:3`, `Bridge-Remediation-Plan.md:3,5,397,458,497`, `Layering-Refactor-Design.md:3`, `BE-13-name-proposal.md:3`, `Unproven-Bridges-Lean-Feasibility.md:3`; "record from before" chains inside `Unproven-Bridges-Lean-Feasibility.md` (7), `Bridge-Gap-Inference.md` (7), `Atlas-Roadmap-Implementation-Plan.md` (4). Fix: move each status sentence to NOTES/CHANGELOG and leave a path reference.
- **D14 ✔ The specification index carries a status the ledger says is undecided.** `docs/specification/README.md:20` "Phases B–D met 2026-06-11"; `Part-IX-Composition.md:88` "Phase B will ship a `compose` operator"; `ROADMAP.md:525` "awaiting an owner ruling"; `ACTIVE.md:503` records it as an open owner decision. Three readings coexist. Fix: owner ruling, then one sentence in NOTES.
- **D15 ✔ README link descriptions for Parts I and II disagree with the spec index.** `README.md:308-309` "Part I … Bridge Equations 11-20", "Part II … 21-54"; the spec index says Part I holds "the cross-domain bridges in categories A–E" and Part II "the remaining cross-domain write-ups". Neither Part has a `BE-N` heading. Fix: copy the index's scopes.
- **D16 ✔ `ROADMAP.md:61,136` say the catalog JSON is generated from `src/bridges/equations/*.ts`**; the directory is absent and the JSON is the record. Fix: strike the TS-generates-JSON sentences.
- **D17 ✔ `README.md:297` "MathTS `simplify` (optional peer)"** while `package.json` lists `@danielsimonjr/mathts-expression` under `dependencies` and README:57 says MathTS is required.

### Low

- `MEMORY.md:11` "SemVer applies from v0.1.0" (duplicates CHANGELOG:6-7); `:22` "TypeScript 7"; the Dependabot lockfileVersion paragraph; "`mathts-gpu` arrives as MathTS's dependency" are version/toolchain facts that move. Keep the invariant, move the version words.
- `MEMORY.md:108` "`scorer/labels.json`" without its path (`tests/fixtures/atlas/benchmark/scorer/labels.json`).
- MEMORY/CONTRIBUTING duplicates: default branch, lockfile, `.js` imports; WORKFLOWS/MEMORY both state "UPT does not run Lean" with the PhysJS URL.
- `TOOLS.md` Commands table omits `cli-reference.ts --check`, `vendor-physjs.ts --check` and the code-docs ratchet job.
- ACTIVE.md ticked rows 445, 377 name `BridgeEquations.hawkingTemperature`/`landauerEnergy` (symbol gone; `grep -rlw BridgeEquations src` → none); row 481 "Euler's number is `exp(1)` or `euler`" versus row 448 "Refuse `euler`". Fix: one-line "superseded by row N" notes.
- `docs/README.md:42` points "later planning" at `todo.md`.
- Dead relative link: `docs/planning/v0.3.0-Implementation-Plan.md:54,211` → `docs/specification/Part-VIII-Metric-Layer.md` resolves from `docs/planning/` to a missing path.
- `package.json` `repository`/`bugs`/`homepage` use the lower-case repo name while the remote and every in-repo citation use `Universal-Physics-Tensor`; `directories.doc: "docs"` names a directory the tarball does not ship.
- `CHANGELOG.md:141,167` (block written at 9.0.0 time) still name `docs/dogfood/…`.

### Nits

`cli/README.md:182` version example "0.29.0"; README "Composing Bridges (v0.8.0)", "Since v0.12"; `WORKFLOWS.md:67` names the "Adam+Eve adversarial pair" via `todo.md §Conventions`, a 2026-06-11 swarm convention nothing else mentions; README's generated commands table lists `chain` while `upt help` does not (deliberate per NOTES; two registries).

### Drift prose, counts per file

| File | "record from before" | "Retracted" | `~~` pairs |
|---|---|---|---|
| NOTES.md | 101 | 9 | 9 |
| CHANGELOG.md | 39 | 46 | 104 |
| ACTIVE.md | 2 | 14 | 13 |
| todo.md | 0 | 3 | 5–6 |
| docs/architecture/INTEGRATION_MAP.md | 49 | – | – |
| docs/architecture/duplicate-symbols.md | 9 | – | – |
| docs/specification/CHANGELOG.md | 7 | – | – |
| AGENTS, CLAUDE, WORKFLOWS, TOOLS, MEMORY, README, CONTRIBUTING, cli/README | 0 | 0 | 0 |

Paragraphs that have become unreadable (retractions ≥ a third of the sentences, or ≥ 6 in one bullet): `CHANGELOG.md:418` (20 retraction phrases, five superseded pins in one paragraph); `NOTES.md:42` (6 of 17 sentences); `NOTES.md:48` (6 of 20; the bullet's own title is struck); `NOTES.md:84,127` (3 of 7 each). NOTES.md is 557 lines; the live state is the 7 bullets of "As of 2026-10-08". Suggested fix: move everything older than the latest release under a `## Superseded (history)` heading, or prune per the routing rule.

### Negative results

Catalog counts in NOTES 2026-10-08 and the README table all re-derive from the data (160/11–170/124/33/3/120/40/158/120/19/9; be-65 the only `notice`; `packageVersion` 9.0.0). PhysJS manifest: v2, 230 keys, 208/13/2/1/3/3 by kind, 79 keys above 170, 27 nested statements, `REVIEWED_ROWS_SHA256` matches, 13 sentinels, 141 catalog references split 119/16/3/3; `bun run atlas:formal-gate` prints exactly the PASS line. `readme-status --check`, `cli-reference --check`, `physjs:table --check`, `audit:plans` exit 0 with the expected counts. `upt connectors` prints 67/23 and `upt probe scan --json` 5053/6 as NOTES says. `CONSTANT_REGISTRY` 29/17/16/8; `H0_SI` 2.1842852410855023e-18; canonical registry 109 with 40/27/1/3/6/2/4 field counts; `NOT_COMPOSABLE_SEEDS` 10. CLI boundary holds (no command module imports a library value). README TypeScript examples run against `dist/` with the printed values; bash examples `eval`, `derive`, `explain hawking-temperature mass=1Msun`, `search pendulum`, `version` match. All 60+ absolute GitHub links resolve; every relative link resolves except the two above. Every `exports` target, `bin`, every script file, and every path named in AGENTS/WORKFLOWS/TOOLS/MEMORY/NOTES (≈150) exists. CI jobs match WORKFLOWS/TOOLS. Persona rotation README matches NOTES. Open ACTIVE rows 490, 492, 493 are genuinely open; no open row is already done. Every 9.0.0 CHANGELOG entry spot-checked describes a change in the diff and states a why. LICENSE is MIT, LICENSE-DATA CC BY 4.0, README's licence line matches both.

## 9. Suggested order of work

Not a plan; a ranking by consequence per unit of change, for the owner to accept or reorder. Each item is one PR-shaped change with its own ACTIVE.md row, a red-first test where a test applies, and a CHANGELOG retraction where a claim is withdrawn.

1. README:89 and MEMORY.md source map (§8 D1, D2). One afternoon; closes the two first-contact defects.
2. Derived `fidelity` and `evidence` (§5 A1, A2) and the `be-37` double confidence (§3 B1). Law 1.
3. Controls that cannot fail: axis gate (§4 C2), `numericalRecovery` (§4 C3), CLI-boundary test (§6 K1), manifest control (§7 T13), golden references at non-unit inputs (§3 B4), peer-gated `skipIf` (§7 T8). Law 3; each needs its red run kept.
4. `CE-normal-distribution` (§4 C1) with the corpus amendment.
5. Error handling that erases the failure kind: `gl4-integrator.ts`, `retrodiction.ts`, `canonical-compare.ts`, `runNumericWitness`, pre-push `|| true` (§2 N1, N2; §4 C6, C7; §5 A6; §7 T4).
6. Constant override on the graph path (§3 B2); `bridgeGradient` root export (§2 N3); composed edges dropping `regime` and `coefficientUnset` (§4 C5).
7. The CLI contract items (§6 K2–K9): one PR for exit codes and duplicate keys, one for `-h`, `--out`, the broken example and the kerr default.
8. The documentation sweep after the 8.0.0 move (§8 D3–D9, D13–D17; §4 stale comments; §2 N19): one PR per file group, counts removed rather than updated wherever a generated span exists.
9. Test-suite hygiene: titles without counts (§7 T2), the catalog census fixture (§7 inventory), the `(undefined)` and `Infinity` goldens (§7 T1, Low), coverage generator through `dist/` (§7 T3), `engines.node` (§7 T9).
10. NOTES/CHANGELOG readability (§8 D3, D4, drift table): one `[Unreleased]`, history folded under its release, NOTES older than the last release under a Superseded heading.

## 10. What this audit did not do

It did not run Lean, did not re-measure PhysJS axioms, and did not re-run the criterion-2/3 studies. It did not review `src/cli/record*.ts`, `_atlas-map.ts`, `probe.ts`, `discover.ts` line by line (§6 unverified). It did not run the nightly `long-tests` job. It did not open any pull request, edit any file in the repository, or change the branch; the working tree is clean at 7f36d16.
