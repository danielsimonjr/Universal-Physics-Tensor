# MathTS units and applied-case records

This document is a plan. It authorizes nothing: `ACTIVE.md` is the gate, and none of the pull requests below is opened by this file. It does not merge, tag, publish, or release.

The live dependency pin is `package.json`. The unit API named here is the one those packages export: `@danielsimonjr/mathts-core` and `@danielsimonjr/mathts-functions` at the unit-delegation release, and `@danielsimonjr/mathts-units`, which re-exports the core unit system from the same commit. A later MathTS release can close a gap named below. The gap list is the contract of the API this plan read, by importing `Unit`, `Unit.exactScale`, `getUnitRow`, `unitRowExactScale`, `unitRowExactOffset`, and `toSiDimensionVector` and comparing them with `data/units.json` and `src/dimensional/units.ts`.

Two parts. Part A replaces UPT's unit reader with that API. Part B replaces the per-case modules under `src/cases/` with one catalog and one engine. Each part is a sequence of small pull requests. A pull request keeps the existing tests green, and a new assertion is shown to fail on the tree before the production change.

## Part A — delegate unit handling to MathTS

### What UPT owns

The unit reader is one pipeline. Callers (`binding-value.ts`, `evaluator-inputs.ts`, `unit-convention.ts`, `symbolic-constants.ts`, the CLI record fingerprint, the magnitude gate) go through it. They do not each grow a MathTS call.

| Owner | What it decides |
|---|---|
| `data/units.json`, `data/units.schema.json` | The admitted spellings, exact scale expressions, dimensions, prefix flags, the `cycles` flag, refused spellings and their messages, prefix-letter units, affine scales, spelling notes. |
| `src/dimensional/unit-data.ts` | Loads and validates that file. Resolves a scale name to a shared scale, `pi`, or a constant spelling (`c`, `e`, `m_u`, `M_sun`, `Msun_iau`, `ln2`). |
| `src/dimensional/exact-scale.ts` | Exact scale: a rational times one floating irrational factor. Decimal literals, products, quotients, integer powers, addition, the single-solidus split, and the one rounding to a double. |
| `src/dimensional/units.ts` | The unit grammar and the public conversion API: `readUnit`, `parseUnit`, `convertValue`, `readQuantityLiteral`, `unitDimension`, `unitRows`, `unitTables`, `unitConventionNotes`, `affineReadingNote`. Errors: `UnitError`, `UnknownUnitError`, `UnitRefusedError`, `AmbiguousUnitError`. Types: `ParsedUnit`, `ConvertedValue`, `AffineTemperature`, `TemperatureReading`. |
| `src/dimensional/algebra.ts` | The seven-base `Dimension` record and `siUnitOf`, the base-unit spelling `parseUnit` reads back. |
| `src/dimensional/unit-convention.ts` | Which quantity is spoken in GeV, bit, nat, or J/K. |
| `src/dimensional/natural-units.ts` | `--natural` (`ħ = c = 1`) and `--geometrized` (`G = 1` as well). |
| `src/cli/expr-print.ts` `derivedUnitOf` | The derived label printed beside the base form (`S` beside the siemens base form). |
| `src/core/constants.ts` | Measured constants already read from MathTS. Unit rows cite them by spelling. This plan does not move them again. |

The grammar in `units.ts` is deliberate and separate from the formula grammar. A unit token holds a prefix, a glued product, or a glued power (`mN`, `m2K`, `Vs`, `K²`, `°C`, `%`). Everything after the first `/` is the denominator (`W/m*K` and `km/s/Mpc`). An exact symbol wins over a prefix (`min` is a minute, `d` is a day, `T` is the tesla). A token with two dimensionally distinct splits is refused by name (`AmbiguousUnitError`). An affine temperature is accepted only alone, and the caller chooses `absolute` or `difference`. A `cycles` flag on `Hz` and `rpm` is returned to the caller; `evaluator-inputs.ts` multiplies by 2π only when the parameter is marked angular. `convertValue` itself does not.

`src/index.ts` exports `parseUnit`, `convertValue`, the four error classes, and the types `AffineTemperature`, `ConvertedValue`, `ParsedUnit`, `TemperatureReading`. Those names stay. The implementation behind them moves.

### The MathTS API these owners would call

Import the class and the exact scales from `@danielsimonjr/mathts-core`. `@danielsimonjr/mathts-units` re-exports the same names. `@danielsimonjr/mathts-functions` also exports the factory wrappers `unit`, `to`, `toBest`, `splitUnit`, `createUnit`, and `compareUnits`. The exact result this plan uses is the core class and the exact-scale functions. `to` / `toSI` return a double that already applied an affine offset and, for `Hz` converted to `rad/s`, a factor of 2π. That double is the wrong value for a difference reading and for a non-angular frequency. `exactScale()` does not bake those in: `degC` is scale `1` with offset `273.15` available from `unitRowExactOffset`, and `Hz` is scale `1`.

| UPT | MathTS |
|---|---|
| `ExactScale` `{ num, den, irrational: number }` | `ExactScale` `{ num, den, irrationals }` with named powers of `pi` and `ln2` (`NAMED_IRRATIONALS`, `PI_EXACT_SCALE`, `LN2_EXACT_SCALE`) |
| `decimalScale`, `scaleOf`, `ratioScale` | `decimalExactScale`, `exactScaleOf`, `binaryExactScale`, `ratioExactScale` |
| `multiplyScales`, `divideScales`, `powerScale` (integer), `addScales` | `multiplyExactScales`, `divideExactScales`, `powerExactScale`, `addExactScales` |
| `scaleToNumber` | `exactScaleToNumber`, `roundExactScale` |
| `readScaleExpression`, `solidusSides` | `readScaleExpression`. The same single-solidus rule: `a/b*c` is a/(b·c). `readUnitScale` resolves names in `NAMED_SCALES`. |
| A row of `data/units.json` | `UNIT_ROWS`, `UNIT_ROW_ALIASES`, `getUnitRow`, `unitRowExactScale`, `unitRowValue`, `unitRowExactOffset` |
| Prefixes | `UNIT_PREFIX_SETS`, `unitPrefixExactScale`, `getUnitPrefix`, `SI_PREFIXES` |
| `parseUnit` / `readUnit` / a quantity literal | `Unit.parse`, `new Unit(value, notation)`, `Unit.isValuelessUnit`, `Unit.exactScale(text)`, `UnitInstance.exactScale()` |
| Absolute conversion | `UnitInstance.to`, `toSI`, `toNumber`. Safe only for an absolute reading whose scale has no cycle-to-radian factor. Prefer `exactScale` plus UPT's offset choice. |
| Dimension vector | `toSiDimensionVector`, `fromSiDimensionVector`, `toSiDimensions`, `fromSiDimensions`. The unit vector has length 10: mass, length, time, current, temperature, luminous intensity, amount, angle, bit, solid angle. The 7-vector is `[L, M, T, I, Θ, N, J]`. A nonzero angle, bit, or solid-angle exponent throws unless `{ ignoreExtra: true }`. |
| Errors | `UnitParseError`, `DimensionMismatchError` |
| `cycles` on a row | `UnitRow.cycles`. `1 Hz` converted with `.to('rad/s')` is 2π. `exactScale('Hz')` is 1. |
| Affine offset | `UnitRow.offset` and `unitRowExactOffset` (`degC` 273.15, `degF` 459.67, in the unit's own degrees, SI = (x + offset) × scale) |
| Extra spellings and user units | `Unit.createUnit` with an `exact` scale expression, `Unit.deleteUnit`. Process-global. This plan does not call them. |
| Display prefix, compound split, three-way compare | `toBest`, `splitUnit`, `compareUnits`. UPT has no caller that needs these. |

`Dimension`, `siUnitOf`, `derivedUnitOf`, `unit-convention.ts`, and `natural-units.ts` have no MathTS counterpart. They stay. `Unit.format` / `formatUnits` prints a different spelling (`(kg m^2) / (s^3 A^2)`, with spaces). `siUnitOf` stays so a library `unit` string remains a text `parseUnit` reads back.

### Where the two readers already agree

Checked by calling the published core and comparing with the local table and grammar:

- Scale expressions and the single solidus. `1 g/cm^3` → 1000 kg/m³, `72 mN/m` → 0.072 N/m, `W/m*K` and `W/(m*K)` are the same reading, `km/s/Mpc` is one denominator, `K^2` parses, `1/s` and `1/m^3` parse.
- Glued prefixes on a single factor: `1 km`, `1 kohm`, `1kohm`, `1 um`, `1 µm`, `GeV`, `kHz`, `25degC`, `myr` (milliyear).
- Absolute affine readings: `25 degC` → 298.15 K, `32 degF` → 273.15 K, and `°C`, `℃`, `°F`, `°R` parse.
- `exactScale` of `degC` is 1 and of `degF` is 5/9. The offset is a separate field. A difference reading can be built from those two fields.
- Rows both tables spell — metre through `therm`, including `pc`, `psi`, `torr`, `mmHg`, `hp`, `u` / `Da` / `amu` at the CODATA 2022 atomic mass, `eV` at the exact elementary charge — round to the same double. `pc` is the same double as `648000*astronomical_unit/pi`.
- `Hz` and `rpm` carry `cycles: true` on the MathTS row. `exactScale` of each is the plain rate (1 and 1/60), which is what `convertValue` returns today.

### Gaps MathTS does not close

Each row is a behavior the suite pins. Delegation that ignores it changes a result or an error class.

| UPT contract | MathTS, on the API this plan read |
|---|---|
| `bit` is ln 2 nat, dimensionless on the 7-vector. `unit-convention.ts` uses that scale for information quantities. | `bit` is a base of scale 1 on the bit axis (index 8). `toSiDimensionVector` throws unless `ignoreExtra` is set, and with that flag the scale is still 1. |
| `rad`, `deg`, `arcsec`, `arcmin`, `mas`, `uas`, `sr` are dimensionless. `convertValue('1 Hz', 'rad/s')` is 1, and the result carries `cycles: 1`. The angular-input path multiplies by 2π. | Those units have a nonzero angle or solid-angle exponent. `.to('rad/s')` on `1 Hz` is 2π and on `1 rpm` is 2π/60. `exactScale` itself matches UPT. |
| `ton` is `UnitRefusedError`: short, long, or metric. | `ton` parses as the short ton, 2000 lb = 907.18474 kg. |
| `dB`, `dBm`, `dBW`, `Np`, `Mach`, `mach` are `UnitRefusedError` with a reason that names the logarithm or the ratio. | `UnitParseError`: unit not found. No refusal registry and no reason string. |
| `d` is a day (86400 s). An exact symbol wins over the deci prefix. `dm` stays a decimetre. | `Unit.parse('d')` is "unit not found". `day` exists. |
| Two splits are `AmbiguousUnitError` naming each reading. `mol/mL` is one of them (millilitre or metre·litre). `mAs` is milliampere·second or metre·ampere·second. | `mol/mL` has one reading, 10⁶ mol/m³. `mAs` is "unit not found". There is no multiple-reading result. |
| Glued products and superscripts: `m2K` is m²·K, `Vs` and `cm^2/Vs` parse, `mmin` is metre·minute or millimetre·inch, `NN` is N·N, `K²` is K^2. A prefix letter is not doubled (`mm` is a millimetre). | `m2K`, `Vs`, `cm^2/Vs`, `mmin`, `NN` are "unit not found". `K²` throws on the character `²`. `K^2` parses. |
| An affine unit inside a compound is `UnitRefusedError` (`degC/s`, `1*degC`). | `degC/s` parses as a temperature rate. |
| `TemperatureReading` `'difference'` omits the offset. `convertValue('25 degC', 'K', 'difference')` is 25. | `.to('K')` and `.toSI()` always add the offset (`1 degC` → 274.15 K). No difference argument. The offset is available separately, so UPT can keep the choice while it still owns the call. |
| Spellings outside `data/units.json` are `UnknownUnitError` (`furlong`). | The MathTS table is wider (`furlong`, `yard`, `mile`, `cup`, `gallon`, `week`, `month`, `byte`, …). |
| Spelling notes (`myr` is a milliyear, bare `G` is the gauss, `Hz` counts cycles) are attached to the conversion the CLI prints. | No note table. |
| `siUnitOf` / the library `unit` string round-trips through `parseUnit`. | `formatUnits` is a different spelling. |

`Unit.createUnit` can register a missing spelling with an exact scale. It mutates a process-wide table. A library that did that would have a second table with a different lifetime from `data/units.json`. This plan does not use it. A missing spelling stays on the local reader until MathTS ships it as a built-in row.

`addExactScales` returns null when the irrational powers differ. UPT's `addScales` falls back to a float. The affine offsets are rational, so the ice-point sum does not use that fallback. The delegation PR makes unlike irrationals throw, and a test names `pi` + `ln2`.

`powerExactScale` throws on a non-integer power. UPT's `powerScale` turns that power into a float factor. Unit exponents are integers. The delegation PR throws on a fractional power.

### What stays in UPT

These are policy, and MathTS has no object for them. They call the delegated reader. They are not a second unit parser.

- The `Dimension` record, `algebra.ts`, and `siUnitOf`. Map a length-10 vector with `toSiDimensionVector` only after the bit and angle decisions above are applied. `{ ignoreExtra: true }` on a raw `bit` is the scale-1 reading this plan rejects.
- `natural-units.ts` and the geometrized mode.
- `unit-convention.ts` (GeV, bit, nat, J/K per quantity).
- The admission list: a spelling `data/units.json` does not contain stays `UnknownUnitError` even when MathTS parses it.
- The refusal list and its messages, for as long as MathTS reports those spellings as unknown or, for `ton`, parses one of the ambiguous tons.
- Spelling notes.
- The `cycles` flag as a count on the result, with the 2π factor applied only by the angular-input path.
- The public error classes. `UnitParseError` and `DimensionMismatchError` are caught at the wrapper and rethrown as `UnknownUnitError`, `UnitRefusedError`, or `UnitError`. Callers keep matching the UPT classes.
- `derivedUnitOf`.

### Ordered pull requests

Each one is mergeable on its own. Tests that already pass stay passing. A new test is written to fail on the unchanged tree first.

1. **A1 — Gap oracle, no production change.** `tests/dimensional/mathts-unit-gaps.test.ts` calls MathTS and the local reader on the same inputs. It asserts the agreements in the section above (the density, surface-tension, ohm, absolute temperature, parsec-double, and `exactScale('Hz') === 1` cases) and asserts each gap row (bit scale 1 on axis 8, `ton` accepted, bare `d` unknown, the glued forms and `K²` rejected, `degC/s` accepted, `mol/mL` a single reading, `.to('rad/s')` on `1 Hz` equal to 2π). The expected MathTS results were read while writing this plan, so the test proves a later edit still sees those results. It does not prove the oracle would have caught a MathTS change before the expected values were written down. The delegation pull requests are what prove the local reader still matches. Deleting one expected gap from the test is the control that the assertions are wired; say so in the test comment.

2. **A2 — Exact-scale arithmetic.** The bodies of the decimal, ratio, multiply, divide, integer-power, add, and round functions in `exact-scale.ts` call the MathTS exact-scale functions. `pi` and `ln2` become named powers. Callers keep the UPT function names, so `units.ts` and `unit-data.ts` do not change in this pull request. Unlike irrational powers throw, and a fractional power throws. `tests/dimensional/exact-unit-scale.test.ts` stays bit-identical on `1 g/cm^3`, `72 mN/m`, `1 kcal`, and the affine readings. Red first: a source assertion that `exact-scale.ts` calls `exactScaleToNumber`, failing while the local `rationalToNumber` is still the implementation, plus the `pi + ln2` throw, which fails while the float fallback is still there.

3. **A3 — The unit file's scale expressions are read by MathTS.** `unit-data.ts` calls `readScaleExpression` with UPT's resolver for the file's `scales` and the constant spellings. `data/units.json` stays the table, including `bit = ln2` and the day symbol `d`. A test pins every row's double to the value the local reader produced and fails if a row moves. Red first: the source assertion that `unit-data.ts` calls `readScaleExpression`, failing before the call is there.

4. **A4 — Agreed scales come from `Unit.exactScale`.** For one reading the local grammar already accepted, if every symbol is in both tables and `exactScaleToNumber(Unit.exactScale(text))` matches the local scale, the reading's scale is the MathTS exact scale. A pure 7-vector unit writes `toSiDimensionVector` into the `Dimension` record. Radian, degree, arcsecond, and steradian use `ignoreExtra` only when the numeric scale already matched, so they stay dimensionless at that scale. `bit` is excluded and stays the local ln 2 scale. Cycles stay the flag on the UPT row, checked equal to `UnitRow.cycles` where MathTS has the row. Offset for an absolute affine reading is `unitRowExactOffset`, checked equal to the local offset. A text outside this predicate never enters this path: there is no try/catch that treats a MathTS failure as "use the local reader". The predicate is the A1 list, and a test feeds it a member and a non-member. Red first: the source assertion that `units.ts` calls `Unit.exactScale`, failing before the call exists, and a `bit` assertion that fails if the MathTS scale 1 is returned.

5. **A5 — Agreed spellings parse through `Unit.parse`.** The predicate is the set of texts where `Unit.parse` and the local grammar produce one reading, the same dimension under the A4 rule, and the same scale. `1 km`, `25 degC` absolute, `g/cm^3`, `mN/m`, `kohm`, `GeV`, `km/s/Mpc` are in it. `bit`, `ton`, `dB`, `d`, `m2K`, `mAs`, `mol/mL`, `degC/s`, `K²`, `furlong`, and a difference reading are out of it and stay on the local grammar. The public functions and error classes are unchanged. Red first: a table of in-set and out-of-set texts, failing while every text still takes the local path only. The out-of-set texts must still throw the UPT error class they throw today.

6. **A6 — Glued forms, after MathTS ships them.** When a published MathTS accepts `m2K`, `Vs`, `cm^2/Vs`, `mmin`, `NN`, and `K²` with the readings `units.ts` documents, move those texts into the A5 set and delete the local splitter for them. One pull request. The dependency range moves in that pull request. Red first: the A1 rows for those texts still expect a `UnitParseError` and fail on the new package; the pull request flips the rows and the production path together. Ambiguity (`mAs` with two readings) is not this pull request.

7. **A7 — Multiple readings, after MathTS reports them.** When MathTS can return more than one dimensionally distinct reading, `mol/mL` and `mAs` become `AmbiguousUnitError` from that result. Until then the local grammar stays the ambiguity authority. One pull request, red first the same way as A6.

8. **A8 — Refusal messages, after MathTS has a refusal reason.** `dB`, `dBm`, `dBW`, `Np`, `Mach`, and `mach` stay `UnitRefusedError` with the message `data/units.json` stores. `ton` stays refused even if MathTS parses the short ton: that refusal is UPT policy, and this pull request keeps the denylist in the wrapper. One pull request.

9. **A9 — The day symbol `d`, after MathTS spells it and still prefers an exact symbol over a prefix.** `dm` remains a decimetre. One pull request. Red first on `parseUnit('d')` and `parseUnit('dm')`.

10. **A10 — Difference readings through MathTS, after MathTS can omit an affine offset.** Until then A4's use of `exactScale` plus `unitRowExactOffset` is the implementation, and the local branch for `'difference'` stays. The pull request deletes that branch only when a MathTS call takes the choice. `convertValue('25 degC', 'K', 'difference')` stays 25. Red first: that assertion fails if the call is switched to `.toSI()` on the old package.

11. **A11 — `bit` and the cycle factor.** Two decisions, two pull requests, because they change different results.
    - **A11a.** `bit` stays ln 2 on the 7-vector. The wrapper overrides the MathTS scale of 1. Adopting the MathTS bit axis would change every information quantity in `unit-convention.ts` and is a breaking change. It is not part of this plan. A test fails if `parseUnit('bit').scale` becomes 1.
    - **A11b.** `cycles` stays a count. `convertValue('1 Hz', 'rad/s')` stays 1 with `cycles: 1`. The angular path keeps the 2π. A test fails if conversion starts returning 2π. This pull request lands when the rest of the grammar has moved; it deletes any remaining local special case that only existed to implement this rule, and keeps the rule.

12. **A12 — Delete the local grammar and the local scale arithmetic.** Lands when A6–A10 have moved and A11 has kept its two rules in the wrapper. `units.ts` remains as the wrapper: admission list, refusal denylist, `bit` override, `cycles` count, difference offset, spelling notes, and the UPT error classes. `exact-scale.ts` remains only if a caller outside the unit reader still needs the UPT names; otherwise the callers use the MathTS functions and the file goes. `data/units.json` remains while it is still the admission list, the refusal messages, or the spelling notes. `Dimension`, `siUnitOf`, `natural-units.ts`, and `unit-convention.ts` stay. The public exports stay.

A12 is the last UPT pull request of this part. A6–A10 wait on a MathTS release. Publishing MathTS is the owner's job. This plan does not open those MathTS changes and does not patch MathTS from this repository.

### Tests that have to stay green

`tests/dimensional/exact-unit-scale.test.ts` (the second method against MathTS, the typed refusals, the cycle flag, the affine notes), `tests/dimensional/unit-data.test.ts`, the binding-reader tests, and the CLI goldens that print a unit. A golden moves only when a pinned input's value moves, and the pull request says which input. The A1 oracle is updated in the same pull request that closes the gap it names, not in a drive-by edit.

## Part B — one catalog for the applied cases

### The rule the per-case files break

`docs/architecture/bridge-catalog.md` and `src/bridges/README.md`: a bridge equation is a record in `data/bridge-catalog.json`. Adding a record does not add a TypeScript module. `src/bridges/relation-eval.ts` evaluates a record with no per-equation branch.

`src/cases/` is the same shape, still as modules. One applied case is one file:

| File | What is data | What is a numeric method |
|---|---|---|
| `resistor-noise.ts` | Parameters, governing text, outputs, checks, examples, links (`be-58` built as a template so the source guard stays quiet) | The loaded Nyquist density, its band integral through `adaptiveQuadrature`, the amplifier share |
| `skin-depth.ts` | The same kind of record, links to the telegraph model | `maxwellDepthFactor`; the classical δ is a closed form |
| `brownian-sphere.ts` | The same, plus wall and drift checks | `ballisticDeficit`, `hydrodynamicMsdRatio` (branch-cut integral), `faxenParallel`, `brennerPerpendicular`. `G_STANDARD` is `convertValue('1 kgf/kg', 'm/s^2')` |
| `kepler-rv.ts` | The same. The link to be-52 is a template literal | Closed forms. `JULIAN_YEAR_S` is `convertValue('1 yr', 's')`. The apsidal term is the catalog relation |
| `lumped-cooling.ts` | The same | `lumpedRadiatingTemperature` (RK4), `sphereEigenvalues` (`findRoot`), `sphereSeries` |
| `damped-resonator.ts` | The same | `windowedLinewidthHz` (`findRoot` on the windowed spectrum). The ring-down itself is a closed form |
| `quadrature.ts` | — | Shared `adaptiveQuadrature`. Not a case. It stays a module |
| `types.ts`, `index.ts` | The `AppliedCase` type and the registry `APPLIED_CASES` / `runAppliedCase` | The registry. They stay |

Tests import both the case objects and the numeric helpers (`tests/cases/*`, `tests/cli/signed-residual-label.test.ts`, `tests/numerical/mathts-delegation.test.ts`, `tests/cases/unit-table-constants.test.ts`, `tests/composition/probe/expression-gaps.test.ts`). `cli-api.ts` exports `APPLIED_CASES` and `runAppliedCase`. Those two names and the case ids stay, so the CLI and the expression-gap scan do not change their contract.

`tests/architecture/source-guard.test.ts` rejects a `be-<digits>` string that is the whole of a literal under `src/`, and it exempts `data/`. A catalog file under `data/` is the place a case may name `be-52` and `be-58`. A method file under `src/` keeps using a template or, better, reads the id from the record.

### The replacement

One catalog, `data/applied-cases.json`, validated by `data/applied-cases.schema.json` and loaded by one module, `src/cases/catalog.ts`. One engine builds an `AppliedCase` and runs it. One methods module, `src/cases/methods.ts`, holds the numeric functions an expression cannot state. `quadrature.ts` and `types.ts` stay. The six per-case files go.

A record:

- `id`, `title`, `parameters` (the same fields as `EvaluatorParameter`), `governing` (`parent`, `scalar`, `distinction`), `observable`, `conditions`, `notIncluded`, `measurement`, `links`, `examples`, `comparison`.
- `outputs`: each `{ key, symbol, unit, meaning }` plus either `expr` (a formula in the grammar `evaluateRelation` already uses) or `method` (a name exported from `methods.ts`).
- `checks`: `{ id, premise, quantity, expr, op, bound, threshold }`. The bound is the number the case file now exports as `MAX_BIOT` and its siblings. The expression reads inputs and outputs. `op` is the existing `<=`, `>=`, or `>`.
- `regimeAt`: omitted, or a method name, when the case's outputs are not the regime's coordinate names.

The engine:

1. Loads the catalog once, through the same schema path `unit-data.ts` uses (`core/json-schema.ts`). A broken file throws at load.
2. Resolves every `method` name against `methods.ts`. An unknown name throws at load, so a typo fails before a user runs the case.
3. Runs inputs through the existing `checkInputs` contract (`CASE_CONTRACTS` stays).
4. Evaluates `expr` outputs with the formula evaluator. Evaluates `method` outputs by calling that function with the inputs and the outputs already computed. A cycle in that order throws at load.
5. Evaluates each check expression and builds the `CaseCheck` with the existing `check` helper.
6. Returns the same `CaseResult` shape `runAppliedCase` returns today.

`methods.ts` keeps the functions whose body is an integral, a root, or an ODE: `adaptiveQuadrature`'s callers `parentDensity` integration, `hydrodynamicMsdRatio`, `faxenParallel`, `brennerPerpendicular`, `ballisticDeficit`, `lumpedRadiatingTemperature`, `sphereEigenvalues`, `sphereSeries`, `windowedLinewidthHz`, `maxwellDepthFactor` until B10 moves it. `maxwellDepthFactor` is `sqrt(hypot(1, r) + r)` and can become an expression once the formula grammar's `hypot` is the function the case calls; that is B10, and it is dropped from `methods.ts` only after the golden matches.

Closed forms (classical skin depth, the Keplerian K, the underdamped ring-down, the lumped exponential) become `expr` outputs. The be-52 apsidal term does not copy the catalog formula into the case. The output's record is `{ "relation": "be-52", "inputs": { ... } }` and the engine calls `evaluateRelation`. The relation id lives in `data/`, where the source guard allows it.

A new case whose outputs and checks are expressions adds a JSON record and no TypeScript. A new case that needs a new integral adds a function to `methods.ts` and a `method` name on the record. It does not add a file.

The thresholds tests import (`MAX_BIOT`, `CLASSICAL_MAX_X`, `G_STANDARD`, `JULIAN_YEAR_S`, and the rest) are read from the record or, for the two unit-table values, computed by `convertValue` at the call site. They are not copied into `methods.ts` as a second literal. A test that wants the number reads the catalog record.

### Ordered pull requests

Each pull request leaves `runAppliedCase(id, inputs)` returning the same outputs, checks, and failures for the examples already in the suite.

1. **B1 — Schema and loader, catalog not yet the runtime source.** Add `data/applied-cases.schema.json` and `src/cases/catalog.ts` with `readAppliedCaseFile`. A test builds the declarative projection of all six cases from the objects in memory, validates it, and rejects a file with a missing `id`, a duplicate `id`, an unknown `op`, and a check with no `expr` and no later `method`. `APPLIED_CASES` is still built from the six modules. Red first: the test file's import of `readAppliedCaseFile` fails before the loader exists. No second copy of the prose is committed in this pull request, so the projection is not a competing source.

2. **B2 — `case-skin-depth` data moves.** The declarative fields go into `data/applied-cases.json`. `skin-depth.ts` keeps `maxwellDepthFactor` and the `run` function, and exports the assembled `SKIN_DEPTH_CASE` from the catalog record plus that function. A test asserts the assembled object's parameters, checks, and examples equal the projection B1 built, then B1's projection for this id is deleted so the JSON is the only copy. Behavior tests stay on `runAppliedCase` and on `maxwellDepthFactor`. Red first: the equality assertion fails while the JSON record is absent.

3. **B3 — `case-kepler-rv` data moves.** Same shape as B2. `JULIAN_YEAR_S` stays a `convertValue` call. The be-52 link is a field on the JSON record. `tests/cases/unit-table-constants.test.ts` still imports the year from this module until B9.

4. **B4 — `case-damped-resonator` data moves.** `windowedLinewidthHz` and the threshold constants' values stay. The constants' values are the check bounds in the JSON. The test that imports `MAX_*` reads them from the assembled case in this same pull request.

5. **B5 — `case-resistor-noise` data moves.** The quadrature stays in `run`. The be-58 link moves onto the record.

6. **B6 — `case-lumped-cooling` data moves.** `lumpedRadiatingTemperature`, `sphereEigenvalues`, and `sphereSeries` stay exported from the module. Tests that construct a `LumpedRadiating` keep that type, moved to `types.ts` if the case file no longer needs to own it, in this same pull request.

7. **B7 — `case-brownian-sphere` data moves.** The integral and the wall corrections stay exported. `G_STANDARD` stays a `convertValue` call. This is the last case whose prose has two homes; after it, B1's in-memory projection test is deleted because the catalog file is the source and the loader test covers it.

8. **B8 — One methods module, the six files deleted.** Move every remaining `run` and helper into `src/cases/methods.ts`. `index.ts` builds `APPLIED_CASES` from the catalog plus that module. Update every test import in the same pull request. `src/cases/` then holds `index.ts`, `types.ts`, `catalog.ts`, `methods.ts`, and `quadrature.ts`. A test lists those names and fails if a file named like a case id is added. Red first: that list assertion fails while the six files are still there. `tests/numerical/mathts-delegation.test.ts` scans `methods.ts` for `quad`, `findRoot`, and `solveODESystem` instead of the old paths, and the scan is shown to fail if those calls are removed.

9. **B9 — The engine evaluates expressions, skin depth first.** `case-skin-depth` outputs and checks become `expr` fields. `run` for that id is the engine. `maxwellDepthFactor` stays a method until the numbers match with `hypot` in the formula grammar; if they match in this pull request, the method goes too, and if they do not, the pull request says so and leaves the method. Goldens for `upt evaluate case-skin-depth` stay. Red first: the engine result for the worked example is unset before the expressions are wired, and equals `runAppliedCase` after. A mutated exponent in the JSON expression moves the skin depth, and a test shows that, on the same pattern as the catalog reference golden.

10. **B10 — Kepler expressions, and the relation output.** The K outputs and the checks become expressions. The apsidal output calls `evaluateRelation` on the record's `relation` field. `JULIAN_YEAR_S` is `convertValue` inside the engine or the test, not a literal. Goldens stay. Red first the same way as B9, including a case whose relation id is wrong and which fails at load.

11. **B11 — Damped-resonator closed form.** The ring-down outputs become expressions. `windowedLinewidthHz` stays a method named by the comparison output. Goldens stay. Red first as in B9.

12. **B12 — The loader rejects a case file coming back.** The directory test from B8 stays, and a second assertion requires every catalog id to have each output as either `expr`, `relation`, or a `method` that `methods.ts` exports. Resistor noise, lumped cooling, and the Brownian sphere keep their methods. Their closed-form outputs may move to `expr` in later pull requests of the same shape as B9–B11, one case each, and only when the golden matches with no new numeric helper. This plan does not require those three to become expressions: the branch-cut integral, the sphere series, and the radiating RK4 are the methods the catalog names.

After B12, adding a case adds a record. Adding a file under `src/cases/` named for that case fails the test.

### Tests that have to stay green

`tests/cases/*.test.ts`, `tests/cli/signed-residual-label.test.ts`, `tests/numerical/mathts-delegation.test.ts`, `tests/bridges/evaluators.test.ts`, `tests/bridges/one-evaluate-path.test.ts`, `tests/composition/probe/expression-gaps.test.ts`, and the CLI goldens for `upt evaluate case-*`. A pull request that only moves a record updates imports and assertions that read a moved constant, and does not change an expected voltage, depth, amplitude, or residual. The expression pull requests (B9–B11) each include one mutation of an exponent that moves the output, so the expression is not a comment sitting beside an unchanged function.

## Out of scope

- Implementing any pull request in this document.
- Merging, tagging, publishing, or releasing.
- A MathTS change made from this repository. A6–A10 name the release they wait on. The owner publishes MathTS.
- Editing `data/units.json` scales to match a MathTS convention this plan rejected (`bit`, `ton`).
- Widening the admitted spellings to the whole MathTS table (`furlong` and the rest).
- Replacing `Dimension`, `siUnitOf`, natural units, or per-quantity conventions.
- A new per-case file, a compatibility shim that re-exports the deleted case modules, or a second copy of a case record kept in TypeScript after the JSON record lands.
