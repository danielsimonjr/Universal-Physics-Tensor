/**
 * SVG rendering for the physics map — render Graphviz DOT source to an SVG
 * string via the optional **`@viz-js/viz`** peer (the real Graphviz compiled to
 * WebAssembly: same `dot` output, in-process, no native binary, no subprocess).
 *
 * Kept separate from `graph-viz.ts` so that module stays pure, synchronous, and
 * dependency-free (text only). The optional-renderer concern — a lazy dynamic
 * import with graceful fallback, mirroring `numerical/formula-registry.ts`'s
 * MathTS-peer pattern — lives here.
 *
 * @module composition/graph-viz-svg
 */

import type { Viz } from '@viz-js/viz';

/**
 * Thrown by {@link renderDotToSvg} when the optional `@viz-js/viz` peer is not
 * installed. The message names the install command and the no-install
 * alternative.
 *
 * @public
 */
export class SvgRendererUnavailableError extends Error {
  constructor(
    message = 'SVG rendering needs the optional renderer: npm i @viz-js/viz ' +
      '(or use --format=dot | dot -Tsvg)',
  ) {
    super(message);
    this.name = 'SvgRendererUnavailableError';
  }
}

/**
 * The part of `@viz-js/viz` this module uses: `instance()` resolves the renderer, whose
 * `renderString` is the peer's own declared type. The peer's types are a devDependency, so the
 * dynamic import is typed without a cast; at runtime the peer stays optional.
 */
interface VizModule {
  instance(): Promise<Viz>;
}

/**
 * Render Graphviz DOT source (e.g. {@link buildVizModel}'s `toDot()`) to an SVG
 * document string. Lazy-loads the optional `@viz-js/viz` peer.
 *
 * @throws {SvgRendererUnavailableError} if the peer is not installed.
 * @public
 */
export async function renderDotToSvg(dot: string): Promise<string> {
  let viz: VizModule;
  try {
    viz = await import('@viz-js/viz');
  } catch {
    throw new SvgRendererUnavailableError();
  }
  const renderer = await viz.instance();
  return renderer.renderString(dot, { format: 'svg' });
}
