/**
 * Optional embedding retrieval. An embedder proposes an order. `rankByStructure`
 * decides what is accepted. Cosine similarity does not enter that score.
 *
 * The Ollama implementation speaks HTTP to a local process. Nothing here
 * imports an embedding library, and nothing calls out of process unless a
 * caller asks for embeddings and supplies that implementation.
 *
 * The query form is the one registered in pre-registration Amendment 11.
 * Corpus records are embedded as their text, with no instruction prefix.
 *
 * @module atlas/benchmark/hybrid-retrieval
 * @internal
 */

import { CANONICAL_EQUATIONS } from '../../canonical/registry.js';
import { rankByStructure, type CorpusRecord, type RetrievalQuery } from './baselines.js';

/** The instruction line registered with the embedding condition. @internal */
export const EMBEDDING_INSTRUCTION =
  'Given a physics claim, retrieve the established physical relation that the claim restates or misuses';

/** qwen3-embedding:4b, the model the design names. The package does not install it. @internal */
export const OLLAMA_EMBEDDING_MODEL = 'qwen3-embedding:4b';

/**
 * Length stored in the frozen vector file
 * `docs/research/criterion3/embeddings/qwen3-embedding-4b.json`.
 * A live reply of another length is not that file's vector.
 * @internal
 */
export const FROZEN_VECTOR_DIMS = 2560;

/** SHA-256 of that frozen file, as registered in Amendment 11. @internal */
export const FROZEN_VECTOR_SHA256 = '8fd79d2c6aaaf95c67f9a29ceb5fe4b88b42970c8e514d98c72c00a2c519cbdc';

/**
 * How long a local Ollama call may run before it counts as not finishing.
 * The design names that outcome and does not name a duration.
 * @internal
 */
export const OLLAMA_TIMEOUT_MS = 5000;

/** What the caller hears when embeddings were not asked for. @internal */
export const ATLAS_ONLY_NOTE = 'Embeddings were not requested. This is the atlas search.';

/** What the caller hears when an embedding order was computed and then not accepted. @internal */
export const PROPOSAL_NOTE =
  'The embedding order is a proposal, not evidence and not an acceptance. rankByStructure accepted a separate order. Cosine similarity does not enter that score.';

const REASON_TEXT = {
  'process-not-there': 'the process is not there',
  'model-not-there': 'the model is not there',
  'reply-not-a-vector':
    'the reply is not a vector, or its length is not the length stored in the frozen file',
  'call-did-not-finish': 'the call does not finish',
} as const;

/** Why an embedding request fell back to the atlas search. @internal */
export type EmbeddingFallbackReason = keyof typeof REASON_TEXT;

/** An embedding request that cannot be used. The atlas search still answers. @internal */
export class EmbeddingUnavailable extends Error {
  readonly reason: EmbeddingFallbackReason;
  constructor(reason: EmbeddingFallbackReason) {
    super(REASON_TEXT[reason]);
    this.name = 'EmbeddingUnavailable';
    this.reason = reason;
  }
}

/** One vector per string, every vector the same length. @internal */
export type Embedder = (texts: readonly string[]) => Promise<readonly (readonly number[])[]>;

/** `Instruct: …` newline `Query: …`, the registered query form. @internal */
export function queryInput(claim: string): string {
  return `Instruct: ${EMBEDDING_INSTRUCTION}\nQuery: ${claim}`;
}

/**
 * A pure function of the text. The same text is the same vector.
 * `v = [sum of char codes, sum of (index+1) times char code]`.
 * @internal
 */
export function stubVector(text: string): readonly number[] {
  let sum = 0;
  let weighted = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    sum += code;
    weighted += (i + 1) * code;
  }
  return [sum, weighted];
}

/** The stub embedder. It does not open a socket. @internal */
export const stubEmbedder: Embedder = async (texts) => texts.map((text) => stubVector(text));

/** Cosine similarity. Unequal lengths are not a similarity. @internal */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new EmbeddingUnavailable('reply-not-a-vector');
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/**
 * Best cosine first. A tie breaks by record id, so the order does not depend
 * on which vector was computed last.
 * @internal
 */
export function rankByCosine(
  query: ArrayLike<number>,
  records: readonly { readonly id: string; readonly vector: ArrayLike<number> }[],
): string[] {
  return records
    .map((r) => ({ id: r.id, s: cosine(query, r.vector) }))
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((x) => x.id);
}

/** Decode a little-endian float32 vector stored as base64, the frozen file's encoding. @internal */
export function decodeFloat32(encoded: string): Float32Array {
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.byteLength === 0 || bytes.byteLength % 4 !== 0) {
    throw new EmbeddingUnavailable('reply-not-a-vector');
  }
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

/** The live canonical registry as retrieval records. Text is the name and the latex. @internal */
export function canonicalRetrievalCorpus(): CorpusRecord[] {
  return CANONICAL_EQUATIONS.map((equation) => ({
    id: equation.id,
    text: `${equation.name}. ${equation.formula_latex}`,
    ...(equation.scalarAst === undefined ? {} : { expr: equation.scalarAst }),
  }));
}

/** Where an Ollama embedder reaches the server, which model it asks for, and the vector width it expects. @internal */
export interface OllamaEmbedderOptions {
  readonly baseUrl: string;
  readonly model?: string;
  readonly expectedDims?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
}

/** A local Ollama embedder. Off unless a caller constructs it. @internal */
export function ollamaEmbedder(options: OllamaEmbedderOptions): Embedder {
  const model = options.model ?? OLLAMA_EMBEDDING_MODEL;
  const expectedDims = options.expectedDims ?? FROZEN_VECTOR_DIMS;
  const timeoutMs = options.timeoutMs ?? OLLAMA_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/$/, '');
  return async (texts) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetchImpl(`${base}/api/embed`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model, input: [...texts] }),
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) throw new EmbeddingUnavailable('call-did-not-finish');
        throw new EmbeddingUnavailable('process-not-there');
      }
      // Ollama answers an unknown model with 404; the status is the signal, not the body's text.
      if (response.status === 404) throw new EmbeddingUnavailable('model-not-there');
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new EmbeddingUnavailable('reply-not-a-vector');
      }
      if (!response.ok) throw new EmbeddingUnavailable('reply-not-a-vector');
      const embeddings = (body as { embeddings?: unknown }).embeddings;
      if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
        throw new EmbeddingUnavailable('reply-not-a-vector');
      }
      const vectors: number[][] = [];
      for (const row of embeddings) {
        if (!Array.isArray(row) || row.length !== expectedDims || row.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
          throw new EmbeddingUnavailable('reply-not-a-vector');
        }
        vectors.push(row);
      }
      return vectors;
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Both orders, kept apart. `accepted` is always `rankByStructure`. @internal */
export interface HybridRetrieval {
  readonly embeddings: 'not-requested' | 'used' | 'fallback';
  readonly fallback: EmbeddingFallbackReason | null;
  readonly proposals: readonly string[] | null;
  readonly accepted: readonly string[];
  readonly note: string;
}

function noteFor(base: string, query: RetrievalQuery): string {
  if (query.expr !== undefined) return base;
  return `${base} The claim has no expression, so the structural score is zero and the atlas order is by id.`;
}

function fallbackResult(query: RetrievalQuery, accepted: readonly string[], reason: EmbeddingFallbackReason): HybridRetrieval {
  return {
    embeddings: 'fallback',
    fallback: reason,
    proposals: null,
    accepted,
    note: noteFor(`Embeddings were requested. ${REASON_TEXT[reason]}. This is the atlas search.`, query),
  };
}

/**
 * Atlas search, optionally after an embedding proposal. A fallback is the
 * atlas answer plus a named reason. It does not throw.
 * @internal
 */
export async function retrieveHybrid(args: {
  readonly query: RetrievalQuery;
  readonly corpus: readonly CorpusRecord[];
  readonly embeddings?: boolean;
  readonly embedder?: Embedder;
}): Promise<HybridRetrieval> {
  const accepted = rankByStructure(args.query, args.corpus);
  if (args.embeddings !== true) {
    return {
      embeddings: 'not-requested',
      fallback: null,
      proposals: null,
      accepted,
      note: noteFor(ATLAS_ONLY_NOTE, args.query),
    };
  }
  if (args.embedder === undefined) {
    return fallbackResult(args.query, accepted, 'process-not-there');
  }
  const inputs = [queryInput(args.query.text), ...args.corpus.map((record) => record.text)];
  let vectors: readonly (readonly number[])[];
  try {
    vectors = await args.embedder(inputs);
  } catch (error) {
    if (error instanceof EmbeddingUnavailable) return fallbackResult(args.query, accepted, error.reason);
    throw error;
  }
  if (vectors.length !== inputs.length) return fallbackResult(args.query, accepted, 'reply-not-a-vector');
  try {
    const proposals = rankByCosine(
      vectors[0]!,
      args.corpus.map((record, index) => ({ id: record.id, vector: vectors[index + 1]! })),
    );
    return {
      embeddings: 'used',
      fallback: null,
      proposals,
      accepted,
      note: noteFor(PROPOSAL_NOTE, args.query),
    };
  } catch (error) {
    if (error instanceof EmbeddingUnavailable) return fallbackResult(args.query, accepted, error.reason);
    throw error;
  }
}
