# BE-53 Yang–Mills confrontation

Design for confronting the Yang–Mills β-function bridge with a measured
running coupling. The release slot is recorded in `todo.md`. This note
is the design. No implementation follows from the file existing.
Approval and what has landed are recorded outside this file.

This note does not widen the composition table, add a symbol, edit
`src/canonical`, or change the shape of `--at`. It does not change the
one-loop formula the bridge already evaluates.

## 1. Problem

The bridge states the one-loop coefficient

```
β(g) = −b₀ g³ / (16π²),    b₀ = (11/3) N_c − (2/3) N_f
```

for a stated color number and flavor number. That expression is a
property of the bridge. It is not a comparison with a measurement.

The backlog item names a measured strong coupling at the Z mass and
asks for a value or consistency confrontation. A one-loop evaluation
at a single scale does not determine that coupling. Flavor thresholds
and higher-loop terms sit between the coefficient and the measured
number. Treating the one-loop formula as if it predicted the measured
coupling would report a residual the formula does not own.

The sign of `b₀` for a stated `(N_c, N_f)` is already decided by the
formula. A positive `b₀` is asymptotic freedom in this one-loop
truncation. That sign is not a value residual, not a bound residual,
and not a consistency residual against a dataset.

## 2. Contract

Two answers stay separate.

- **The bridge.** `evaluate` of the existing edge, given `g`, `N_c`,
  and `N_f`, returns the one-loop `β(g)`. The output may say whether
  `b₀` is positive, zero, or negative for those inputs, and it labels
  that statement as the one-loop coefficient. It does not call the
  statement a data test.
- **A confrontation.** Exists only when both of these are supplied by
  the caller, not by this repository:
  1. a table of measured couplings, each row a scale, a central value,
     an uncertainty, and a citation;
  2. a running procedure whose record states its loop order and its
     flavor thresholds.

  The procedure is a function the caller provides. This note does not
  specify its steps, its integrator, or its thresholds. The
  confrontation compares the procedure's output at the table's scales
  with the table, using an outcome kind the confrontation registry
  already has (`value` or `consistency`). The one-loop bridge formula
  is not that procedure.

When the caller asks for a confrontation and either input is missing,
the command refuses, names which input is missing, and does not print
a residual. The proposed single central value at the Z mass, with no
table and no running procedure, is a missing-input refusal. It is not
encoded as a target.

A refusal is not a pass and not a fail. It does not change the
bridge's catalog status.

## 3. What stays refused

- No flavor thresholds, no higher-loop terms, and no running table are
  added to the repository by this note or by an implementation of it.
- The one-loop formula is not fitted to a measured coupling, and a
  measured coupling is not inverted to produce a `b₀`.
- No new package and no QCD library.
- The composition table, `src/canonical`, sigma, and `--at` are
  untouched.
- The release tag, the version bump, and publication stay with
  Mothership. This note does not perform them.

## 4. Tests that hold the contract

After approval, the tests are the contract. They are not part of this
change. None of them calls a network or ships a dataset.

- A confrontation request with no table and no procedure exits as a
  refusal and names both missing inputs. The output has no residual.
- A request that supplies a table and a procedure whose record does
  not state a loop order and thresholds is refused the same way. A
  procedure that is the one-loop formula itself is that case.
- A stub procedure that does state loop order and thresholds, and a
  fixture table, produce an existing outcome kind. Replacing the stub
  so that it ignores the table and returns the one-loop formula fails
  that test.
- The bridge evaluator for a stated `(N_c, N_f)` is unchanged. A test
  that already pins `b₀` for SU(3) with six flavors still passes, and
  that pin is not relabeled as a confrontation.

## 5. Approval

Approval of this note accepts the split between the one-loop
coefficient and a confrontation, and the refusal when the table or the
running procedure is absent. It does not accept an implementation, a
dataset, a running procedure, or a release.
