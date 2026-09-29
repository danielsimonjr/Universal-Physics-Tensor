# Engineering physicist — CLI dogfood, 2026-09-29

Session on master `44e4450`, after Tier 10 (`#222`, `#223`) and `docs/design/tier-10-cross-family-path.md`. The question for this seat was whether `upt path` does what that design says: cross-family routes, bounds, regimes, horizons, exit codes, help, and JSON. The composition table was not widened. No sigma was added. `--at` stayed one flat namespace.

## What worked

Checked against the design's own chains. These are the behaviors this branch leaves in place.

- `upt path model-pendulum model-lc --at theta0=0.2 T0=1 t=10` exits 0. Same family. Composed bound `K = 1`, `delta = 0.015852531101436806`, point delta `0.002505744228602058`, transport `nt-spring-lc-relative-period`, horizons hold.
- `upt path model-klein-gordon model-schrodinger-free --json` exits 0. `crossFamily` is true, `modelFamilies` is `waves` then `diffusion`, the step is `ab-kg-schrodinger`, and the bound is that bridge's own (`K = 1`, `delta ≈ 0.0024875775822101875`). `family` on the step stays the filing family `waves`. With `c=1 omega0=1 k=1` the regime `ck/ω₀ ≤ 0.1` is violated and the command exits 3.
- `upt path model-klein-gordon model-fick` exits 0, `no composite claim`, names the silent cell, and prints no bound.
- `upt path model-klein-gordon model-lc` exits 0 with reason `missing-lipschitz`. It crosses waves → oscillators and does not invent a Lipschitz constant.
- `upt path model-stokes-drag model-fick` exits 0, no chain, and names `ab-stokes-einstein`. The multi-premise bridge is not a step.
- `upt path model-langevin model-fick` is `ab-langevin-diffusion` plus that named join. It does not fold `6πηa` into the bound.
- `upt path model-telegraph model-heat` exits 0 with `norm-not-stated`.
- `upt path model-schrodinger-free model-klein-gordon` exits 0, no chain. The route is not symmetric.
- `upt path --sigma` exits 2. There is no sigma on this command.
- `--tolerance` without `t` is `UNDETERMINED` and exits 0. A tolerance that was checked and is inadequate exits 3.
- `upt path model-pendulum model-spring --at theta0=0.8 T0=1 t=10` exits 3 in text and in `--json`. The regime is `VIOLATED` (`theta0 <= 0.5`) and the point carries no bound. The domain supremum is still printed above that line (suggestion below).
- `upt help path` already stated the Tier 10 gates: a route may cross families, a bound crosses only on a witnessed transport, and a multi-premise bridge is named and is not a step.

## Bugs

### An unknown model is blamed on the other endpoint's family

```
upt path model-nope model-spring
```

Printed exit 1: not a model of family `oscillators`. `selectRoute` searched with `findPath` inside the known endpoint's family, so the unknown id was reported as missing from that family. `model-spring` is an oscillator. `model-nope` was never looked up as its own id.

Expected: exit 1, `unknown model 'model-nope'`, and `upt atlas` named as the list. Both ends unknown names both ids. A real cross-family pair is unchanged. Fixed on this branch. Distinct from a missing chain, which stays exit 0.

### Help and the README disagree with the exit codes the JSON envelope uses

`upt path … --json` on a violated regime exits 3. The envelope's `reason` strings include `cross-family-unmapped`, `missing-lipschitz`, `norm-not-stated`, `norm-mismatch`, `uniformity-unanalysed`, and `no-composite-claim`.

`cli/README.md` said every `--json` command exits 0. `upt help statuses` did not define those reason strings, so a script that reads `definitions` could not look them up. `upt help` (the top-level blurb) did not say that a matching norm name across families is `cross-family-unmapped` and still exit 0, or that exit 3 under `--json` is unchanged.

Expected: the README says the exit code is the text command's exit code, and that a failed check is still exit 3 under `--json`. `upt help statuses` defines each reason, kept apart from `no composite claim`. The top-level path blurb states the cross-family gate and the `--json` exit. Fixed on this branch. The composition table is unchanged, and a no-claim still has no `bound` key.

## Confusing UX and docs

- A violated pendulum path still prints the domain composed bound (`K = 1 · delta = 0.01585…`) and then `no bound on this path is claimed at this point`. Both lines are true of different objects (the record's domain supremum, and the point). A script that takes the first number it sees treats a refused point as a bound. Not changed: removing the supremum would hide the record. The order is the confusion.
- `--at` is one flat namespace, as the design requires. A name that exists in two families is not disambiguated. That limit is documented and was not hit by the chains above.
- `upt help path` is long enough that the exit-code sentence sits after the sweep flags. The statuses glossary is the page that defines the reason strings; the top-level blurb now points at the same words.

## Suggestions not implemented

- On a violated or horizon-failed path, print the "no bound at this point" line before the domain supremum, or label the supremum as the record's domain rather than as the answer at `--at`.
- Do not add sigma. `upt path --sigma` exiting 2 is the right refusal.
