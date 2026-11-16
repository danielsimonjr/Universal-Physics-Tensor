# Catalog judgments record

Written against commit 2fa530ab. Each file and line is read at that commit. `CHANGELOG.md` grows at its head, so a line number in that file moves with each new entry.

This file records the judgment that the repository already holds for each item of the `ACTIVE.md` row "Record catalog judgments".
A judgment is not a gate. No code reads this file.
The file invents no verdict.
Where the repository holds no verdict, the record says "No verdict is recorded" and names the search that found none.

## Bridge 44 (soft hair)

**Question:** "Is the encoded `Q_soft²` L²-norm a genuine information↔gravity bridge, or internal to classical radiation theory?" (`CONTRIBUTING.md:36-38`)

**Recorded judgment:** The adjudication table records bridge 44 as "**CONTESTED → unadjudicated**" (`docs/architecture/v0.8.0-catalog-adjudication.md:40`).
The row gives the reason: "Adjudicating it mechanically would smuggle in the conclusion." (same line)

**Evidence:**
- "Which charge is meant, and whether the encoded square is that charge." (`docs/planning/Unproven-Bridges-Lean-Feasibility.md:442`)
- "The adjudication note leaves the id contested for this reason." (`docs/planning/Unproven-Bridges-Lean-Feasibility.md:442`)
- The catalog entry for id 44 starts at `data/bridge-catalog.json:1587` and carries `"contested": true`.
- "BE-44/46/50 contested, recorded as standing physicist-review tasks." (`CHANGELOG.md:8349-8350`)

**State:** The repository records bridge 44 as contested and unadjudicated.

## Bridge 46 (multiverse measure)

**Question:** "is anthropic selection a regime?" (`CONTRIBUTING.md:41-42`)

**Recorded judgment:** The adjudication table records bridge 46 as "**CONTESTED → unadjudicated**" (`docs/architecture/v0.8.0-catalog-adjudication.md:41`).
The row gives the reason: "Not decidable by the criterion as stated." (same line)

**Evidence:**
- "Specific measure proposals (scale-factor cutoff, proper-time cutoff, etc.) are untestable without further theoretical development; without a determination of W, the equation has no operational predictive content." (`data/bridge-catalog.json:1688`, the `description` of the id 46 entry, which starts at `:1670`)
- "BE-44/46/50 contested, recorded as standing physicist-review tasks." (`CHANGELOG.md:8349-8350`)

**State:** The repository records bridge 46 as contested and unadjudicated.

## Bridge 50 (Wheeler-Feynman)

**Question:** "does the absorber boundary condition's thermodynamic-arrow claim make the encoded time-symmetry residual regime-spanning?" (`CONTRIBUTING.md:43-45`)

**Recorded judgment:** The adjudication table records bridge 50 as "**CONTESTED → unadjudicated**" (`docs/architecture/v0.8.0-catalog-adjudication.md:42`).
The row gives the reason: "The encoded time-symmetry residual sits on the internal side; the bridge claim lives in the boundary condition the AST does not encode." (same line)

**Evidence:**
- "`be-50` stays `proposed` because it is unadjudicated." (`CHANGELOG.md:1657`)
- "The id is contested. This lemma does not decide the contest." (`src/atlas/physjs-entries.generated.ts:674`; a test pins the first sentence at `tests/atlas/physjs-manifest.test.ts:70`)

**State:** The repository records bridge 50 as contested and unadjudicated.

## Novel-candidate verdicts

**Question:** "Each needs a physicist's call: physically meaningful, trivially true, or nonsense?" (`CONTRIBUTING.md:66-67`, step 7 at `:62`)

**Recorded judgment:** No verdict is recorded.
The two candidate files ask for verdict lines: "Reviewed rows get a verdict line added beneath the table." (`docs/research/v0.10.0-novel-candidates.md:35-36`) and "Verdicts get appended below." (`docs/research/v0.11.0-novel-candidates.md:35`).
A case-insensitive search of both files for `verdict`, `reviewed`, `outcome`, `genuine`, `reject`, `keep` and `clean one` finds only those protocol lines and a header at `v0.10.0-novel-candidates.md:8`.
No text follows the protocol paragraph in either file.

**Evidence:**
- The candidate id `be-42-via-rs>>be-12` is at `docs/research/v0.10.0-novel-candidates.md:14` and `docs/research/v0.11.0-novel-candidates.md:19`.
- The tracker row at `todo.md:2491-2493` calls `be-42-via-rs>>be-12` "the clean one". No candidate file holds that phrase.
- `NOTES.md:187` states that "no candidate has been adjudicated by a physicist (there is no human reviewer, above)".

**State:** Neither candidate file holds a verdict line.

## Quantity-identification review

**Question:** "**Review the quantity identifications and alias dispositions** in `src/composition/compose.ts` (`QUANTITY_IDENTIFICATIONS` and `SOURCE_ALIAS_DISPOSITIONS`) — each is an explicit physics judgment" (`CONTRIBUTING.md:49-51`)

**Recorded judgment:** No verdict is recorded.
The search covers the whole repository, without `node_modules`, `dist` and `.git`, for `QUANTITY_IDENTIFICATIONS`.
The hits are the registry in `src/composition/compose.ts`, code that reads the registry, and documents that describe the registry.
The other hits are the issue template `.github/ISSUE_TEMPLATE/3-quantity-identification.yml` and tracker rows.
No line records an agreement with, or a rebuttal of, an entry.

**Evidence:**
- The tracker row reads "`QUANTITY_IDENTIFICATIONS` review (currently the T_H ≡ T judgment + each future migration naming)." (`todo.md:2494-2495`)
- `docs/design/bridge-reduction-pass.md:37-38` calls the registry "the reviewed list `composeSymbolic` already consults". The line describes the registry; the line holds no review record.

**State:** The repository holds the review as a question and records no review result.

## Bridge 23 against Hartnoll 2015

**Question:** "**Check BE-23 (SYK Planckian dissipation)** against Hartnoll 2015 (*Nat. Phys.* 11:54) — is the encoded linear-in-T resistivity form the canonical one?" (`CONTRIBUTING.md:46-48`)

**Recorded judgment:** No verdict is recorded for this check.
The search covers every file type, without `node_modules` and `.git`, for `Hartnoll`.
The hits are 19 files.
They are the catalog record, `docs/specification/Part-II.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, five issue templates, four planning documents and the two trackers.
The other hits are the citation strings of `tests/composition/compose-relation.golden.json` and three files under `docs/architecture/archive/bridge-audit/`.
Those three are the catalog snapshot, the entry 23 prompt and the entry 23 response.
No line states the result of the check that `CONTRIBUTING.md:46-48` asks for.

**Evidence:**
- The catalog entry for id 23 starts at `data/bridge-catalog.json:581`. The encoded formula is at `:593`.
- The entry `description` calls the form "the canonical strange-metal phenomenology" and cites the Hartnoll 2015 review (`data/bridge-catalog.json:599`).
- An archived reviewer response (`docs/architecture/archive/bridge-audit/responses/entry-23-adam.txt:47`) says: "Therefore, the formula is canonical as a phenomenological model, but it is not a derived equation of the SYK model itself." No file links that response to the `CONTRIBUTING.md` task.
  A search of the repository, without `node_modules` and `.git`, for `entry-23-adam` finds no file other than this one.
- "Hartnoll 2015 reviews the phenomenology and does not derive a unique `α`." (`docs/planning/Unproven-Bridges-Lean-Feasibility.md:196`)
- The recorded data comparison for id 23 uses Legros et al. 2019, not Hartnoll 2015: predicted 1, observed 1, sigma 0.4, within the observed range (`data/bridge-catalog.json:14637-14647`).

**State:** The repository records a data comparison against Legros et al. 2019 and no result of the Hartnoll 2015 check.

## Bridge 29 membership

**Question:** "**Adam-MEDIUM** BE-29 Jarzynski NOT-A-BRIDGE reconsider — Adam argues Jarzynski IS a non-eq ↔ eq bridge; "single-regime statmech" undersells the content." (`CHANGELOG.md:8597`)

**Recorded judgment:** The adjudication table records bridge 29 as "**NOT-A-BRIDGE (upheld)**" (`docs/architecture/v0.8.0-catalog-adjudication.md:36`).
The same row says: "Resolves the deferred Adam-MEDIUM reconsider: upheld."
The changelog records the same result: "BE-28/29/32/35/40 NOT-A-BRIDGE upheld with reasons + citations (BE-29 resolves the deferred Adam-MEDIUM reconsider)" (`CHANGELOG.md:8347-8349`).

**Evidence:**
- The catalog entry 29 is "Jarzynski free-energy equality (canonical 1997 form)" (`data/bridge-catalog.json:851`), with `bridges` `["unknown","unknown"]` (`:854-857`).
- "Recommendations 1 and 3 remain physicist surfaces." (`docs/research/BE-29-Landauer-Recovery.md:110`)
- "Two carry a property and do not light the tag: `be-29` `PhysJS.Jarzynski.jensen_work` (`⟨W⟩ ≥ ΔF` by Jensen, not Jarzynski's equality), `be-11` `PhysJS.Lindblad.preserve`." (`NOTES.md:357`)

**State:** The adjudication table records bridge 29 as NOT-A-BRIDGE (upheld) and records the reconsider as resolved.

## Bridges 22 and 31 rename review

**Question:** "**Two marginal cases** (BE-22, BE-31) where a stricter audit might prefer NOT-A-BRIDGE. Both have plausible framings in the named direction; neither needs immediate action. Flag for v0.8 audit consideration." (`docs/architecture/BRIDGE-PHYSICS-AUDIT-v2.md:759-761`)

**Recorded judgment:** No verdict is recorded.
The audit puts the item under the heading "Three lowest-priority gaps to defer to v0.8" (`docs/architecture/BRIDGE-PHYSICS-AUDIT-v2.md:866`).
The item says: "Both defensible as-is; per-bridge review during a v0.8 audit pass." (`:869-870`)
The v0.8 adjudication covers nine `['unknown','unknown']` entries (`CHANGELOG.md:8344`). A search of `docs/architecture/v0.8.0-catalog-adjudication.md` for `BE-22`, `BE-31`, `be-22` and `be-31` finds no line.

**Evidence:**
- In the audit, a "rename" is a regime-tuple assignment: "**17 `unknown↔unknown` renames** applied (BE-21/22/26/27/30/31/33/34/37/38/39/41/43/45/47/48/49)." (`docs/architecture/BRIDGE-PHYSICS-AUDIT-v2.md:27`)
- For BE-31 the audit table proposes "[quantum, classical] would be slightly tighter", rated "LOW (preference)" (`docs/architecture/BRIDGE-PHYSICS-AUDIT-v2.md:494`).
- The changelog lists "Eve-E8 BE-22/31 marginal renames." under "**Eve gap findings deferred** (low-priority ride-alongs):" (`CHANGELOG.md:8603`, under the heading at `:8599`).
- The catalog tuples are `["quantum","holography"]` for be-22 (`data/bridge-catalog.json:529-532`) and `["quantum","cosmological"]` for be-31 (`:947-950`).
- "The rename review of bridges 22 and 31 does not change the formulas below." (`docs/planning/Unproven-Bridges-Lean-Feasibility.md:51`)

**State:** The repository holds the bridge 22 and 31 review as a deferred audit item and records no per-bridge result.

## Tracker state

`todo.md:2486` says: "Moved to `ACTIVE.md` on 2026-10-01. These judgments are not gates, and an agent does not invent the verdict."
The ticked rows under that line are `todo.md:2488`, `:2491`, `:2494` and `:2496`.
Commit 482a51d0 ticks them. Its subject is "Close the human-reviewer gates and make ACTIVE.md the live task list. (#244)".
The ticks record the move to `ACTIVE.md`, not a completed judgment. This record does not edit `todo.md`.

## Scope

The bridge 42 membership reversal landed in the v0.8 adjudication (`CHANGELOG.md:8344-8347`). This file does not repeat it.
