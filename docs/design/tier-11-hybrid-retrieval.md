# Tier 11 — optional embedding retrieval

Design for a hybrid retriever: an embedding model proposes canonical
relations for a claim, and the atlas decides whether a proposal is the
same relation. The release slot is recorded in `todo.md`. This note is
the design. No implementation follows from the file existing. Approval
and what has landed are recorded outside this file.

ROADMAP §8 asks for this and records that no design existed when that
section was written. The study that motivated it, the model digest, the
query instruction, and the frozen vector file are registered in
`docs/research/atlas-benchmark-preregistration.md`. This note does not
restate that study's scores.

This note does not widen the composition table, add a Stefan–Boltzmann
symbol, or change the shape of `--at`.

## 1. Problem

Typed structural search and an embedding model fail in different places.
A structural match is a check the atlas can defend. An embedding match
is a nearest neighbour in a vector space. Using either one as the whole
answer throws away the part the other is for.

The package also cannot take a hard dependency on a GPU, on Ollama, or
on a network service. A checkout with none of those still has to
retrieve, by the atlas search it already has.

## 2. The seam

An embedder is a function from a list of strings to a list of vectors,
one vector per string, every vector the same length. Two implementations
sit behind that function.

- **Stub.** A pure function of the text. The same text is the same
  vector. Tests use this. It does not open a socket.
- **Ollama.** A local process, spoken to over its HTTP API, model
  `qwen3-embedding:4b`. The package does not depend on that binary, on
  a client library, or on a GPU. The call is off unless a caller asks
  for it.

The query string uses the form registered with the embedding condition:
an instruction line, a newline, then `Query:` and the claim. Corpus
records are embedded as their text, with no instruction prefix. A
second instruction would not be comparable to the frozen vectors.

Ranking is cosine similarity, best first. A tie breaks by record id,
so the order does not depend on which vector happened to be computed
last.

## 3. Hybrid, and the fallback

The embedding rank is a proposal list. It is not an acceptance. A
proposal is accepted only by the atlas check that already exists:
`rankByStructure`, which scores a shared leakage key above symbol
overlap and scores a missing expression at zero. Cosine similarity
does not enter that score. A claim can be near in the vector space and
still fail the structural check. The output names both results and
does not collapse them into one verdict.

When the caller did not ask for embeddings, the result is the atlas
search alone, and the output says so.

When the caller asked and the Ollama path cannot be used, the result
is the same atlas search, and the output names the reason. The reasons
are:

- the process is not there;
- the model is not there;
- the reply is not a vector, or its length is not the length stored
  in the frozen file;
- the call does not finish.

A fallback is a successful atlas answer plus a named reason. It is not
an error exit, and it is not a silent embedding answer.

## 4. What the tests run

Two fixtures, neither of which starts Ollama.

- The stub embedder, on a handful of fixed strings. The test asserts
  the vectors, the cosine order, the tie break, and that a structural
  miss stays a miss when it ranked first in cosine.
- The frozen vector file named by the preregistration. The test reads
  it and ranks with those vectors. It does not re-embed. A file whose
  hash is not the registered hash is a failed test, not a new score.

A third test points the Ollama implementation at a closed port and
asserts the fallback reason and the atlas ranking. That test does not
require the binary.

A live call, on a machine that has the model, is outside this gate. It
waits on a reservation. Its output is a record of that run. It does not
replace the frozen file and it does not decide a study criterion.

## 5. What stays refused

- No new package dependency, and no import of an embedding library on
  the default path.
- The default command path does not call out of process.
- An embedding rank is not evidence. Evidence stays something the atlas
  derived.
- The composition table, a Stefan–Boltzmann symbol, and `--at` are
  untouched.
- The study's frozen scores are not recomputed here.

## 6. Approval

Approval of this note accepts the seam, the fallback reasons, and the
split between a proposal and an atlas check. It does not accept an
implementation, a live GPU run, or a change to a published verdict.
