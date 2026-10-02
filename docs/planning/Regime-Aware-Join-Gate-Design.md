# Regime-aware join gate

This note specifies when a chain of proved edges may meet on a shared
quantity. It changes no code, no public export, and no cell of the
composition table. Landing the note does not change the pipeline. A
change that implements the rule is a separate pull request, and it is
work when an `ACTIVE.md` task names this note.

The pipeline this gate inserts into is
`docs/planning/Bridge-Discovery-Pipeline-Design.md`. That note owns the
seed rule, the Buckingham filter, the structural classifier, the chain
order, and the stub. This note owns only the join. It does not restate
those stages.

## The joins

`runChainPipeline` admits a pair when `composeSymbolic` accepts it, the
Buckingham filter keeps it, and `matchChain` does not call it a
confirmation or a restatement. Two such pairs meet only because one
edge's target and the other's source are the quantity `mass`:

- `chain-be-63-be-12`, Chandrasekhar mass into the thermal de Broglie
  wavelength;
- `chain-be-63-be-37`, Chandrasekhar mass into the Shapiro delay.

`mass` is one graph node. Its `attributes` are empty, because that node
is the generic mass: a stellar limit, a thermal particle, and a
weak-field lens were not folded into one regime. Both ports of each
pair are that same node, so a comparison of the node's own scale and
force cannot see a difference. The name match is not a regime match.

## What this reuses

| Piece | Role in the gate |
|---|---|
| Catalog category on `BRIDGE_EQUATIONS`, read by `beId` | The filing of the equation. Not read off the edge's string id. |
| `tensorIndexComponent` in `src/bridges/tensor-index.ts` | The domain tag. Category letter to the §VI.6.1 component. Category N is `unassigned`. A letter outside A–O already throws there; the gate does not catch that throw. |
| `GATE_AXES` in `src/composition/axes.ts` | The scale and force axes the discovery falsifier already gates. `information`, `symmetry`, `topology`, and `statistics` stay ungated. This note does not flip `gated`. |
| `Quantity.attributes` on the two junction ports | The scale and force of that use, when either port states them. |
| `BridgeEdge.regime` and `regimeOverlap` in `src/relations/regime.ts` | The π-group regime already recorded on an edge. `disjoint` is a mismatch. `overlap` and `nested` are not. |
| `matchChain` / `classifyStructure` | Runs first. A confirmation or a restatement never reaches the rejection. |

`admitApproximation` in `src/atlas/regime.ts` is not the gate. It admits
an `AtlasBridge` whose relation is `approximation` by requiring a
horizon and `deltaAt`. A catalog `BridgeEdge` is not that record, and
these joins are not missing a horizon.

`regimesDiffer` is not the predicate. It compares `information` as well
as scale and force. `information` is ungated. The gate walks
`GATE_AXES` only, with the same both-stated rule: a value missing on
either port abstains on that axis.

The catalog `bridges` tuple is not a facet. BE-12 and BE-63 are both
`[quantum, classical]`. Requiring those tuples to be equal would admit
`chain-be-63-be-12`.

## Data model

Nothing new is stored on `Quantity` or on `BridgeEdge`. `mass` stays
untagged. A second hand-written copy of the category would drift from
`tensorIndexComponent`.

The gate computes three facets for a pair the enumerator has already
accepted.

**Domain, per edge.** `edge.beId === null` has no domain. A `beId` with
no catalog row has no domain; the gate does not invent one and does not
throw. Otherwise the domain is `tensorIndexComponent` of that row's
category. `unassigned` (category N) is no domain. The component is a
property of the equation, so both ports of one edge share it.

**Scale and force, per port.** The producer port is the first edge's
target. The consumer port is the source `findJunction` would select:
the source whose name is the target's name, or, failing that, the
source named by a `QUANTITY_IDENTIFICATIONS` row whose `from` is the
target's name. The recorded quantity is the producer target's name,
which is the name the chain substitutes.

**π-regime, per edge.** The edge's `regime` field, when present. It is
the edge's claim about where the formula holds, not a new inequality.

A facet that is absent is an abstention. Abstention is not a mismatch
and not a drop.

## The rule

A pair is a **regime mismatch** when any of the following holds.

1. Both edges have a domain and the two components differ. The reason
   is `domain: <producer> ≠ <consumer>`, with the component strings
   `tensorIndexComponent` returns.
2. For a `GATE_AXES` axis, both ports state a value and the values
   differ. The reason is `<axis>: <producer> ≠ <consumer>`. Axes are
   emitted in `GATE_AXES` order.
3. Both edges have a `regime` and `regimeOverlap` returns `disjoint`.
   The reason is `regime: disjoint`. The gate does not call
   `regimeOverlap` when either edge has no `regime`. Silence on the
   record is not a constraint, the same rule that function already
   applies to a group only one regime names.

Reasons are that list, in that order, every firing facet included. The
class is the string `rejected: regime mismatch`. The record is:

- `kind`: `rejected: regime mismatch`
- `edgeIds`: the two edge ids, producer then consumer
- `quantity`: the producer target's name
- `reasons`: the list above

The record has no evidence field, no provisional id, and no statement
text. It is not passed to `deriveEvidence`. It is not a stub, and
`emitProofTarget` is not called.

For the two joins above the only firing facet is the domain.
BE-63 is category I, component `information-geometry`. BE-12 is
category A, component `quantum-classical`. BE-37 is category K,
component `field-unification`. Scale and force abstain because both
ports are `mass`. BE-12 and BE-63 carry no `regime`. BE-37 carries
`BE37_REGIME` and BE-63 does not, so the π-facet abstains. The reasons
are exactly:

- `chain-be-63-be-12`: `domain: information-geometry ≠ quantum-classical`
- `chain-be-63-be-37`: `domain: information-geometry ≠ field-unification`

A pair that fires no facet is admitted. That includes a law (`beId`
null), a category-N edge, a pair whose domains are the same component,
and a pair whose π-regimes overlap or nest.

## Where it sits

The orchestrator in `src/atlas/chain-pipeline.ts` already runs seeds,
seed-filtered enumeration, the Buckingham filter, `matchChain`, the
chain order, and the stub. The gate is a stage between `matchChain` and
the order.

1. Seeds. Unchanged. A key whose derived kind is not `bridge` is not a
   premise.
2. Enumeration. Unchanged. `enumerateCompositions` still proposes every
   pair `composeSymbolic` accepts. It does not import the gate and it
   does not drop a pair. A silent drop there would hide the class, and
   the default enumeration pins would move.
3. Buckingham filter. Unchanged. A chain the filter drops is absent. It
   is not a regime rejection. The two joins above survive the filter.
4. `matchChain`. Unchanged. `classifyStructure` does not grow a regime
   veto. Linkage calls that function and does not have `BridgeEdge`
   values. The gate needs `beId`, the two ports, and `regime`.
5. **Join gate.** This note. Skipped for a confirmation and for a
   restatement, as the next section says. Otherwise a mismatch is the
   rejection record, and an admission is the candidate the order
   already knows.
6. Order. Unchanged, and only over admissions. Rejections are not a
   fifth class inside `orderChainCandidates`. They follow the ordered
   survivors, compared by the same edge-id order that function already
   uses: a shorter chain first, then lexicographic ids. The two
   rejections are length 2, so `be-63`/`be-12` precedes `be-63`/`be-37`.
7. Emit. Unchanged for an admission. A rejection has no skeleton.

The function lives in `src/composition/chain-regime.ts`. The
orchestrator is the only caller. `src/composition/index.ts`,
`src/atlas/public.ts`, and the package barrel do not gain a name.
`src/composition/discovery.ts` and `src/composition/probe/` are not
edited. The seed predicate is not edited.

`composition/` may import `bridges/` and `relations/`. Those imports
are the layer order already in force. The allowlist does not grow.

## Confirmations and restatements

A confirmation is a chain whose normal form matches a catalog
right-hand side. The pipeline design's decision (a) says the run
reports that id and writes nothing. The regime gate does not block it
and does not change the record. The gate is not consulted, so a defect
in the domain table cannot hide a match the classifier already made.

A restatement is a chain the registry pre-declared with
`restatesBridge`. That declaration is a reviewed identity, not a new
hypothesis. The gate does not overrule it. A confirmation is the
catalog-id case. A restatement is the same exemption applied to a
reviewed structural identity: the result stays a result.

The exemption is not a regime pardon written onto the edge. The
classifier's kind is the whole test. A fixture whose `beId`s would
mismatch, and whose formula is catalog 12's right-hand side, stays
`{ kind: 'confirmation', catalogId: 12, edgeIds }`.

## Test plan

Prove the new check red on the tree that admits the two joins, then
make it green. The old catalog expectation, that those two ids are
stubs, is the red run.

**Catalog.** `runChainPipeline(CATALOG_GRAPH)` returns two records of
kind `rejected: regime mismatch` and no stub, confirmation, or
restatement. The edge ids, quantity `mass`, and the two domain reasons
are the ones named above, in edge-id order. The catalog array is the
same array after the call. Neither record has statement text.

**The enumerator still proposes them.** On the same graph,
`enumerateCompositions` with the seed set still returns both pairs as
proof targets. The rejection is the pipeline's class, not a missing
pair.

**A confirmation is not blocked.** A pair whose formula is catalog 12's
right-hand side, with `beId` 63 on the producer and `beId` 12 on the
consumer, is a confirmation of id 12. Those components differ. The
result is the confirmation record and not a rejection.

**A same component is not a domain mismatch.** A non-catalog monomial
whose producer `beId` is 55 and whose consumer `beId` is 59 (both
category F, component `scale-transition`) stays a stub.

**Abstention is not a mismatch.** `beId: null` against a filed edge
produces no domain reason. `beId` 45 (category N, `unassigned`) against
`beId` 63 produces no domain reason. An edge id string of `be-63` with
`beId: null` is not filed: the lookup is `beId`, not the id string. The
existing fixture stub `chain-be-21-be-27` has `beId: null` on both
edges and stays a stub.

**Scale fires when both ports state it.** Two otherwise abstaining
edges, producer port `scale: quantum` and consumer port `scale:
classical`, reject with `scale: quantum ≠ classical`. One port silent
on `scale` does not. Deleting the axis walk admits the clashing pair;
that is the control.

**π-regime fires only on `disjoint`.** Two otherwise abstaining edges
whose regimes `regimeOverlap` calls `disjoint` reject with `regime:
disjoint`. An overlap does not. A regime on only one edge does not.

**Unchanged surroundings.** A derivation-step edge is still not a
premise. `discovery.ts`, the probe, `src/atlas/public.ts`, and the
package barrel do not name the gate. No `upt` command. The layer-order
allowlist stays the allowlist already on the tree.

## Out of scope

Editing `discovery.ts`, the probe, the composition table, `public.ts`,
or the package barrel. Promoting Tier 2. A release. An exception list
that admits one cross-component pair by name. A new axis value, or a
change to `gated`. Tagging `mass`. Rewriting `enumerateCompositions` or
`classifyStructure`. Calling `admitApproximation`.

## Open questions

The rule above is closed. The questions below do not change it.

1. **Chandrasekhar's category.** Category I files BE-63 as
   information-geometry, and that filing is what rejects both joins,
   including the Shapiro join. A later judgment that the Shapiro join
   is one gravitational mass is a refile of the category or an explicit
   exception. This note has no exception list. A silent admit is the
   defect the class exists to prevent.
2. **A law has no domain.** `beId: null` abstains on the domain facet.
   Scale, force, and a recorded `regime` still apply. Whether a law
   should carry a component is not decided here.
3. **A note on a confirmation.** The confirmation record stays the
   record the classifier already returns. Whether it should also carry
   a non-blocking regime annotation is not decided here. The annotation
   must not change the kind.
4. **Ungated axes.** `information` and the three axes after it stay out
   of the predicate until an audit gates them. That audit is the one
   `axes.ts` already names. This note does not run it.
5. **Chains longer than a pair.** The enumerator is pairwise. Each pair
   is gated on its own. A walker that folds three edges is a later
   change to the pipeline note, not a second rule here.
