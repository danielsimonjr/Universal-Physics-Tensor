/**
 * Ambient module declaration for the optional peer dependency
 * `@danielsimonjr/mathts-tensor`. The package is listed in package.json's peerDependencies as
 * optional, and is therefore not guaranteed to be installed at
 * tsc time — without this declaration, the static `import { Tensor } from
 * '@danielsimonjr/mathts-tensor'` at the top of `numerical/mathts-engine.ts`
 * would fail tsc with TS2307 and need `@ts-ignore` (or skip the build
 * entirely in environments without the sister-repo dep installed).
 *
 * The declaration body is empty: `Tensor` resolves to `any` at type-check
 * time when this ambient is the only declaration available. With the
 * optional peer ACTUALLY installed (the maintainer's primary dev env),
 * `node_modules/@danielsimonjr/mathts-tensor/dist/index.d.ts` takes
 * precedence and provides the real typing. The empty ambient is therefore
 * a *fallback* shim that makes the build robust to optional-peer-absence,
 * not a primary typing source.
 *
 * v0.6.1 Phase 0 cleanup: mirrors the v0.5.1 TS-4 precedent for
 * `mathts-autograd.ambient.d.ts`. Closes the build-fails-without-peer gap
 * caught at v0.6.1 sprint baseline (`tsc` failed at `src/numerical/engine-
 * registry.ts:43` and `src/numerical/mathts-engine.ts:13` with TS2307).
 *
 * @module numerical/mathts-tensor.ambient
 */

declare module '@danielsimonjr/mathts-tensor' {
  // `Tensor` is used as both a value (static constructors) AND a type
  // (parameter / return annotations) throughout `numerical/mathts-engine.ts`.
  // The empty-namespace form (`declare module ... ;`) makes it resolve as a
  // namespace, which TS2709 rejects when used as a type. Declaring it as a
  // class permits both shapes; `any`-typed members preserve the "real types
  // win when peer is installed" semantics.
  //
  // The `[key: string]: any` index signatures are DELIBERATE, not laxness to be
  // narrowed away (audit item evaluated 2026-06-22, declined): the codebase uses
  // ~16 static + ~10 instance `Tensor` members with non-trivial signatures
  // (einsum/contract/mergeAxes/splitAxis/addCell/populatedCells/…). Replacing the
  // index signatures with a hand-written structural interface would (a) duplicate
  // the peer's full type API as a fallback maintained here, (b) break the
  // no-peer build the moment any new `Tensor` member is used, and (c) add zero
  // safety in the primary dev env, where the real peer `.d.ts` shadows this shim
  // entirely. The index signature is the correct decoupling for an OPTIONAL peer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Class form with `static [key: string]` is a tree-sitter ERROR node (the
  // TypeScript grammar's index_signature has no `static`). A value and a type
  // of the same name keep both uses: `Tensor.einsum(...)` and `x: Tensor`.
  // The index signatures stay: an optional peer's fallback must not name every
  // member the real package exports.
  export interface Tensor {
    [key: string]: any;
    readonly shape: ReadonlyArray<number>;
  }
  export const Tensor: {
    new (...args: any[]): Tensor;
    readonly prototype: Tensor;
    [key: string]: any;
  };
}

