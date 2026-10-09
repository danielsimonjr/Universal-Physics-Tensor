# AGENTS.md — the law for this repo

Operating charter for AI agents working in `universal-physics-tensor`. The sibling `CLAUDE.md`
loads it. **This file holds what is still true next year. Nothing dated, nothing "currently".**

> **Route every fact to exactly ONE file. A fact in two files is the drift defect.**
>
> | File | Holds | Test |
> |---|---|---|
> | `AGENTS.md` | the law — role, rules, invariants | still true next year? |
> | `WORKFLOWS.md` | procedure — what to run, in order | a sequence of commands? |
> | `TOOLS.md` | instruments, and **how each one lies** | is it *what to run it with*? |
> | `MEMORY.md` | **stateless** facts — names, shapes, invariants | true regardless of *when*? |
> | `NOTES.md` | **stateful** — phase and criterion state, versions, open findings | carries an "as of"? |
> | `ACTIVE.md` | actionable open work, and the authorization gate | can it be checked off? |
> | `CHANGELOG.md` | what landed | is it history? |
> | `docs/planning/*` | **design and intent only** | would it read the same next month? |
>
> The fleet session log (`status.md`, outside this repository) is a working log, not a repo record.

## What this repo is

A TypeScript ESM library exploring unified physics through a rank-6 tensor (vision in `README.md`).
Its atlas layer is a typed, machine-checkable representation of relations between physical models:
relation type, side conditions, regime, error bound with horizon, witnesses and counterexamples.

**What it offers is a method, and the discipline below is what makes it work rather than
decorative.**

## The law

1. **EVIDENCE IS DERIVED, NEVER ASSERTED.** No evidence tag is hand-set. `formally-proved` is
   reachable only through a reviewed `formalRef`. This is the repo's whole thesis; every other
   rule serves it.
2. **A CONTROL THAT CANNOT FAIL IS WORTHLESS.** Every control carries a paired check proving the
   assertion FAILS on the true claim. A positive control whose marker was chosen *after* seeing
   the answer proves the matcher fires, not that the original check would have caught anything —
   disclose that limitation where it applies.
3. **A TEST THAT CANNOT FAIL IS WORSE THAN NO TEST**, because it manufactures confidence. Prove
   a new invariant RED before you make it green.
4. **DIFFERENT FACTS STAY SEPARATE.** `refuted` and `unresolved` are not the same result and are
   never merged into one count. Neither are "tasks landed" and "criterion met".
5. **A NEGATIVE RESULT IS A RESULT.** Record it plainly. A repo that hides its own negative
   result misleads its next reader, who is you in a month.
6. **DESIGN DOCS CARRY NO STATUS.** No MET/UNMET, no counts that change, no dates, no versions.
   Those go to `NOTES.md`, `CHANGELOG.md` or `ACTIVE.md`. See the routing table above. Move a
   statement; never copy it.
7. **VERIFY BY A SECOND, INDEPENDENT METHOD** before any claim leaves this repo. An exit code is
   not an outcome; an empty result is not an absence.
8. **RETRACT IN HISTORY, FIX IN CODE.** A false claim is struck through and retracted in
   `CHANGELOG.md`, never rewritten into truth, so a reader can see it was made and withdrawn. A
   scope claim ("every other bridge searched") is true only of what existed when it was made;
   restate the scope rather than letting it silently widen.

## Boundaries

- **ADR-level calls, releases and npm publish are NOT this session's.** Implement, commit, push,
  report. Escalate to Mothership.
- **Anything outward-facing is the owner's alone.**
- **No agent that has read `src/atlas/` may author, encode or rate a benchmark item** — it would
  test memorisation instead of the method. Atlas-blind MODEL instances may, launched isolated by
  `scripts/atlas-benchmark-models.mjs`, and every artifact records them as models. The two raters
  are separate instances with no shared context, and neither is the author.
