# Physlib axiom probes

These files measure the axioms that the Lean proofs behind the atlas `formalRef` records depend
on. The gate in `tools/formalref-axiom-gate/` runs them and compares the result with each record.

| File | Purpose |
|---|---|
| `AxiomProbe.lean` | Prints the axioms of each probed Physlib theorem with `#print axioms`. |
| `HoleProbe.lean` | A positive control. It proves `(1 : Nat) = 2` with `sorry`, so its report must contain `sorryAx`. |
| `UptImportedHole.lean` | A `module` file, in the same form as the Physlib files, that proves `(1 : Nat) = 2` with `sorry`. The gate compiles it. |
| `ImportedHoleProbe.lean` | The imported-module control. It imports `UptImportedHole`, so its report must contain `sorryAx`. |
| `captured/AxiomProbe.out` | The output of `AxiomProbe.lean` at the pinned commit. The gate's tests use it. |
| `captured/HoleProbe.out` | The output of `HoleProbe.lean` at the pinned commit. |
| `captured/ImportedHoleProbe.out` | The output of `ImportedHoleProbe.lean` at the pinned commit. |
| `captured/UptImportedHole.compile.out` | The compiler output for `UptImportedHole.lean` at the pinned commit. |

## Why the positive controls exist

A report with no `sorryAx` has two possible causes. The proofs have no holes, or the probe cannot
see a hole. Two controls test the second cause. The gate fails when either control does not report
`sorryAx`.

- `HoleProbe.lean` has its `sorry` in the probe file itself.
- `ImportedHoleProbe.lean` reaches its `sorry` through an import of a compiled module.
  `UptImportedHole.lean` has the same form as the Physlib files (`module`, `@[expose] public
  section`). The compiler writes the same set of files for it (`.olean`, `.olean.private`,
  `.olean.server`, `.ilean`, `.ir`). Every probed Physlib theorem is also reached through an import.

For an imported theorem, `#print axioms` does not read the proof. It reads a list of axioms that Lean
computes and stores in the `.olean` when the `.olean` is written (`Lean/Util/CollectAxioms.lean`).
The second control shows that this stored list contains `sorryAx` for a hole. The controls do not
check how the Physlib `.olean` files were built: a stale or changed `.olean` carries whatever list
was stored in it.

The gate deletes the old output of `UptImportedHole.lean` before it compiles the file. It fails when
the compile fails, so the control cannot pass on an `.olean` from an earlier run.

Lean exits with code 0 for a proof that uses `sorry`. Lean only prints a warning. The gate therefore
reads the printed axioms and ignores the exit code.

## The pinned commit

Physlib `5ad56e24de155462acd8478458292347393d5908`, toolchain `leanprover/lean4:v4.34.0`. These
probes measure that checkout. The live atlas has no `lean4-physlib` formalRef: `ab-pendulum-linear`
names the PhysJS theorem that imports `linearizedEquationOfMotion_iff`. The gate runs these probes
only when a `lean4-physlib` formalRef exists.

## Run the gate

1. Install the Lean toolchain manager `elan`.
2. Fetch Physlib at the pinned commit into a new, empty directory:

   ```bash
   mkdir physlib && cd physlib
   git init -q && git remote add origin https://github.com/leanprover-community/physlib.git
   git fetch -q --depth 1 origin 5ad56e24de155462acd8478458292347393d5908 && git checkout -q FETCH_HEAD
   ```

3. Download the prebuilt Mathlib files. This step avoids most of the Mathlib build:

   ```bash
   lake exe cache get
   ```

4. Build the probed modules:

   ```bash
   lake build Physlib.ClassicalMechanics.Pendulum.SimplePendulum.SmallAngle Physlib.ClassicalMechanics.Pendulum.SimplePendulum.PeriodFormula Physlib.ClassicalMechanics.WaveEquation.Basic
   ```

5. From the repository root, run the gate. The gate first checks that the checkout is at the
   commit and toolchain of every `formalRef.version`. Then it copies the four `.lean` files into
   the checkout, compiles `UptImportedHole.lean` into `.lake/build/lib/lean`, and leaves them there:

   ```bash
   bun run atlas:formal-gate -- --physlib <checkout> [--lake <path to lake>]
   ```

The gate prints `formalRef axiom gate: PASS` and exits 0, or prints each problem and exits 1.

## When the pin or a formalRef changes

Add each new `lean4-physlib` formalRef theorem to `AxiomProbe.lean`. When the pin changes, update
the `version` of every such formalRef; the gate fails for a checkout at another commit. Run the
gate with `--write-captured`. The option writes new files into `captured/`. Review the new output
before you commit it. A `lean4-physjs` reference is checked against `formal/physjs/manifest.json`
and is not added here.
