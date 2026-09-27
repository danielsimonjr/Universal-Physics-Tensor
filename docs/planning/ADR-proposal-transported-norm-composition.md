# ADR proposal — composing an approximation with an exact equivalence through a transported norm

A proposal for a reviewed act, written for Mothership to decide. It defines nothing and changes
nothing: the composition table, `boundPath` and the CLI are untouched by it. Its subject is audit
item I2 (finding F05, `docs/audit/Universal_Physics_Tensor_CLI_Audit.md` §4.3 and §14 item 2) and the
cell that `Atlas-Phase-1-Design.md` §2.2 item 3 names as conservative. Widening follows
`Atlas-Phase-2-Design.md` §4. The worked evidence is `tests/atlas/transported-norm-demo.test.ts`.

---

## 1. The problem in one route

`model-pendulum → model-spring → model-lc` is `ab-pendulum-linear` (an approximation, bound in the
*relative period error, normalized by the value of the reduced model*) followed by `ab-spring-lc`
(an exact equivalence, no bound). Two independent gates refuse it, and both refusals are correct as
the records stand:

1. **Relation gate.** `composeRelation('approximation', 'exact-equivalence')` is
   `'no-composite-claim'`, so `boundPath` refuses before any arithmetic.
2. **Norm gate.** Even with a table cell, `boundPath` gate 4 returns `'norm-not-stated'`: the exact
   bridge has no `bound`, so it states no norm, and `IDENTITY_BOUND` is the identity only *in a
   norm the map preserves* (`src/atlas/error-algebra.ts`). The composed number would be the same as
   the pendulum's. The risk is a correct number attached to the wrong norm.

So the table cell is necessary but not sufficient. What makes the composite sound is a fact about
the exact map: how it acts on the quantity the bound measures. The records have no field for it.

## 2. The rule

Let `A : P → R` be an approximation with bound `(K_A, δ_A)` in norm `N` on `R`-side quantities, and
let `E : R → S` be an exact equivalence with map `Φ` and inverse `Φ⁻¹`. **Push `P` through the
same `Φ`** and compare the image with `S`. Then

    ‖Φ(p) − Φ(r)‖_{N'}  ≤  K_Φ · ‖p − r‖_N  ≤  K_Φ·K_A·|Δinput| + K_Φ·δ_A

which is `composeBounds((K_Φ, 0), (K_A, δ_A)) = (K_Φ·K_A, K_Φ·δ_A)` in the **transported norm**
`N'`. `K_Φ` is the Lipschitz constant of `Φ` from `N` to `N'`:
`K_Φ = sup ‖Φa − Φb‖_{N'} / ‖a − b‖_N`. When `Φ` is an isometry of `N` (`N' = N`, `K_Φ = 1`), the
bound transports unchanged.

**Soundness conditions.** All of these must hold, and each is stated by a record, not inferred:

1. **The map declares its action on the bounded quantity.** The exact bridge names the norm it
   receives (`N`, matched by exact string, as gate 4 matches), the norm it delivers (`N'`, in the
   target model's own vocabulary), and `K_Φ`. For example, a period maps to a period under a
   uniform time rescaling, an amplitude is rescaled by a stated factor, or a parameter set is
   restricted by the dictionary.
2. **The same `Φ` acts on both sides of the comparison.** The composite bounds `Φ(p)` against
   `Φ(r)`. It does not bound `p` against `Φ(r)`. A map that treats the premise and the reduced
   model differently (for example an amplitude-dependent time rescaling applied to one side only)
   carries no bound.
3. **`Φ` is invertible, and its own side conditions hold.** `exact-equivalence` requires an
   `inverse` by contract. A bridge that is exact only on a side condition (`ab-damped-rlc`, exact
   only when the damping ratios agree) transports only on that side condition.
4. **Domain, regime and horizon travel with the map.** In the approximation-then-exact order, the
   premise `P` is untouched, so the domain and regime of `A` stay as stated. A horizon stated in
   `R`'s time must be restated in `S`'s time through the declared time map before it is evaluated
   against an `S`-side `t`.
5. **Uniformity is preserved.** What `A`'s error is uniform in must survive `Φ`. A uniform time
   rescaling preserves "one period". A non-uniform one does not.
6. **A parameter-dependent `K_Φ` follows the `delta` / `deltaAt` discipline.** The declared scalar is
   the supremum over the declared domain, and a machine form gives the value at a point.

### 2.1 Norm classes under the spring ↔ LC map

The recorded map is `q(t) = (q0/x0)·x(ω_LC t / ω_s)`: an amplitude scale `q0/x0` and a uniform time
scale `ω_s/ω_LC`. The same map preserves some norms and not others:

| Norm on the `R` side | Image norm on the `S` side | `K_Φ` | Consequence |
|---|---|---|---|
| relative period error | relative period error | 1 | transports unchanged |
| absolute period error (s) | absolute period error in circuit time (s) | `ω_s/ω_LC` | IDENTITY transport wrong unless `ω_s = ω_LC` |
| absolute trajectory `sup |x − x_r|` (m) | `sup |q − q_r|` (C), time argument remapped | `q0/x0` | wrong units and magnitude under IDENTITY |
| amplitude-normalised trajectory `sup |x − x_r| / x0` | `sup |q − q_r| / q0` | 1 | transports unchanged |
| phase drift (rad) per reduced period | same | 1 | transports; a horizon in seconds scales by `ω_s/ω_LC` |
| energy error | energy error | the energy scale factor | "energy up to scale" is the bridge's own caveat |

The `K_Φ` of a norm depends on the dictionary instance. Under the literal dictionary
(`L = m`, `C = 1/k`) the time scale is 1 and absolute period error happens to be preserved. Under
the dictionary instance of the bridge's own witness fixture (dimensioned frequencies differ) it is
not. So a declaration has to state the factor as a function of both parameter sets. A constant that
is correct for one fixture does not cover the others.

### 2.2 Non-isometric and non-uniform maps

- **`K_Φ ≠ 1`, finite and declared.** The bound is multiplied: `(K_Φ·K_A, K_Φ·δ_A)` in `N'`. This
  is still a claim, provided `N'` is named in `S`'s vocabulary.
- **`K_Φ` undeclared or unbounded.** No claim. This is gate 4's existing refusal, and the rule
  leaves it unchanged.
- **Non-uniform time maps** (`t ↦ f(t)` with `f` not affine, or a time scale that depends on the
  state or the amplitude). A period is not mapped to a period, and "the relative period error" of
  the image is not defined by the declaration. Such a map cannot declare a period-class transport.
  A trajectory-class transport needs `f` and its Lipschitz constant explicitly.
- **Norm-dependent exactness.** Every invertible `Φ` preserves some norm: the pushforward
  `N'(a, b) = N(Φ⁻¹a, Φ⁻¹b)` has `K_Φ = 1` by construction. That is why the *relation* composite is
  safe while the *numeric* composite is not. A claim in the pushforward norm is only useful, and only
  checkable, when the pushforward is named as a quantity of `S`. The declaration exists to name it.

## 3. The other order is a separate decision

`exact-equivalence` then `approximation` (`E : S → R`, then `A : R → Q`) pulls the input side back
through `Φ⁻¹`. The bound stays in `A`'s own norm on the `Q` side, but `A`'s **domain, regime and
horizon** are stated on `R`'s parameters and time, and must be re-expressed on `S`'s parameters
through the dictionary. This is a different transport, with a different failure mode: a regime that
silently fails to translate, rather than a norm that silently changes meaning. It is a different
table cell. This proposal asks Mothership to decide the approximation-then-exact cell only. It
records the other order so that a widening of one is not read as a widening of both.

## 4. Evidence tags of the composite

The composite's evidence is **derived at read time from its parts and the declaration, and stored
nowhere** (AGENTS.md law 1; `src/atlas/derive-evidence.ts`):

- **No stronger than the weakest part.** The composite's tag set is the intersection of the parts'
  derivable tags, further intersected with the tags derivable for the transport declaration itself.
- **The declaration is a claim and needs its own witness.** A declared `K_Φ` with no passing witness
  contributes only `'proposed'`, and the composite is then `'proposed'` at most. The demonstration
  test is the shape such a witness takes: it integrates the premise's image through `Φ`
  independently and compares it with the closed form. It is not registered as one.
- **`symbolically-checked` is not inherited** from a CAS check of the dictionary (for example, the
  one covering `ab-spring-lc`). That check concerns `k/m ↔ 1/(LC)`, not the transport of a norm. The
  transport identity would need its own CAS artifact.
- **`formally-proved` is unreachable** except through a reviewed `formalRef` covering *each* part
  and the transport lemma. `ab-pendulum-linear`'s `formalRef` covers its transformation and
  explicitly not `bound.delta`, so it cannot lift a composite bound.
- **`deltaAtBasis` of the composite is `'closed-form'`** only when the approximation's is and
  `K_Φ` is closed form. Otherwise it is `'numerically-supported'`.

## 5. What the table cell and the licensing field would say

**Cell:** `COMPOSITION_TABLE.approximation['exact-equivalence'] = 'approximation'`, justified by
"an approximation followed by an invertible relabelling is an approximation *of the relabelled
model*, in the norm the relabelling declares it carries."

**Licensing edge field** (proposed; the name is for review): an optional field on
`exact-equivalence` bridges, a list of norm transports. Each entry carries:

- `from`: the exact `norm` string it accepts;
- `to`: the norm string on the target side;
- `K`: a closed-form `(params) => number` plus its domain supremum;
- the time map, if any, and how a horizon is restated through it;
- the uniformity it preserves;
- the witness id that exercises it, and its `basis`.

The inverse direction is declared separately, because `findPath` traverses exact edges both ways
and `K_{Φ⁻¹}` is not `K_Φ` in general (it is `1/K_Φ` for a scaling).

**Gate change** (for review, not made here): gate 4 of `boundPath` would accept an exact edge as
`(K_Φ, 0)` in `to` when it declares a transport whose `from` equals the running norm. Otherwise
`'norm-not-stated'` stands. The cell alone therefore licenses a relation-level composite only. No
number is produced for an undeclared map, so the cell cannot be widened ahead of the data that
licenses it.

**Reviewed-act procedure** (`Atlas-Phase-2-Design.md` §4): fail the pinned silent-cell count first,
assert the new cell individually (a count pin does not detect a swap), and name the field above as
the licence.

**Open question for the decision.** Should `composeRelation` return `'approximation'` for this cell
unconditionally, with the bound gated on the declaration, or should the relation itself be withheld
when no declaration exists? The first keeps the table a pure function of relation types. The second
avoids a printed "composite relation: approximation" with no bound under it. §2.2's pushforward
argument says the first is not a false relation claim. The second is the more conservative display.

## 6. Which exact maps would need declarations

The set is derived, not listed by hand. The `adjacencies` query in the demonstration test enumerates
every approximation that forms a chain with an exact equivalence, in either order, from both the
source registry and `data/atlas/atlas.json`, and asserts that the two agree. The cases it finds, and
what each would declare:

- **`ab-spring-lc` after `ab-pendulum-linear`** (approximation then exact; the F05 route).
  - Declaration: relative period error to relative period error, `K = 1`.
  - Time map: uniform, `t_LC = t·ω_s/ω_LC`. The horizon `4 T0/θ0²` is restated in circuit time
    through it.
  - Evidence: the demonstration integrates both routes.
- **`ab-heat-diffusion` after `ab-telegraph-diffusion`** (approximation then exact, traversed through
  the inverse `model-fick → model-heat`).
  - Declaration: relative error of the slow-mode decay rate to the same norm, `K = 1`, because the
    map `T ↦ c, κ/(ρc_p) ↦ D` keeps the time and space variables, so the decay rate `D q²` maps to
    `(κ/ρc_p) q²`.
  - Evidence: not demonstrated numerically here; it would need its own witness. The declaration must
    be stated for the inverse direction.
- **`ab-damped-rlc` before `ab-damped-massless`** (exact then approximation; the §3 cell, outside
  I2).
  - The bound `sup |x − x_reduced| for t ≥ 5 m/b` is ABSOLUTE and holds only at the normalisation
    `b = k = x0 = 1`, so pulling it back to circuit parameters changes both its magnitude
    (`q0/x0`) and its horizon (the time scale `ω_RLC/ω_mech`).
  - It transports only on the damping-ratio side condition.
  - A declaration is possible, but it is not an isometry.

## 7. Alternatives considered

1. **Leave the cell silent.** This is the existing design (`Atlas-Phase-1-Design.md` §2.2 item 3).
   It is honest, and a no-claim route can name what it lacks. It blocks a natural journey, and it keeps
   "silence" indistinguishable from "unsound" for routes where the transport is in fact trivial.
2. **Per-route declarations instead of a table cell.** Declare the pendulum→LC composite on the
   route itself. It is precise, but routes are *derived* by `findPath`. Declaring a derived object
   by hand is the asserted-evidence pattern law 1 forbids. It also grows with the number of routes
   rather than the number of exact maps, and it would duplicate the same transport fact across every
   route through one bridge (the drift defect).
3. **Transport with `K = 1` whenever the edge is exact.** Refuted by the demonstration. The same
   map is an isometry of relative period error and not of absolute period or absolute trajectory
   error. This is the error gate 4 exists to prevent.
4. **Per-bridge transport declarations plus the table cell** (§5). The transport fact lives once, on
   the map that owns it, and gate 4 reads it. This is the recommendation.
5. **A structured `norm` type instead of a string.** A norm class with its invariances (for example
   time-scale invariant, amplitude invariant) would let `K_Φ` be derived for some maps rather than
   declared. This is attractive, but it is a larger change to `ApproximationBound` and to every
   record. It is compatible with option 4 as a later refinement.
