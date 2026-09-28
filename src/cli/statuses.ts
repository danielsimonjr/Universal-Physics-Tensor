/**
 * The status words the CLI prints, defined once (audit I13).
 *
 * `upt help statuses` prints this table, and every `--json` envelope carries the definitions of the
 * statuses its command can emit (`emitJson` adds them from here, so a command cannot omit them and no
 * command keeps a private copy). A status a command prints but this table does not assign to it is a
 * defect, which `tests/cli/statuses.test.ts` looks for in the commands' own output.
 */

export interface StatusDefinition {
  /** The key under `definitions` in a `--json` envelope. */
  readonly key: string;
  /** The words as the commands print them, text or JSON. */
  readonly words: readonly string[];
  readonly meaning: string;
  /** The commands (envelope `command` names) that can emit it. */
  readonly commands: readonly string[];
}

export const STATUS_GLOSSARY: readonly StatusDefinition[] = [
  {
    key: 'valid',
    words: ['valid'],
    meaning:
      'every machine inequality the record states was evaluated at the point and holds. Only a record ' +
      'that states at least one inequality can be valid; its prose premises are listed apart and were not checked',
    commands: ['regime'],
  },
  {
    key: 'vacuous',
    words: ['VACUOUS', 'vacuous'],
    meaning:
      'the record states no machine inequality, so nothing was evaluated: not a pass, and not evidence ' +
      'that the record applies at the point',
    commands: ['regime', 'path', 'atlas', 'map'],
  },
  {
    key: 'unknown',
    words: ['UNKNOWN', 'unknown', 'UNCHECKED', 'unchecked'],
    meaning:
      'a value the check needs was not supplied (or a search stopped at its budget), so the check did not ' +
      'run: a failure to confirm, never a pass and never a violation. It exits 0',
    commands: ['regime', 'path', 'evaluate', 'map'],
  },
  {
    key: 'violated',
    words: ['VIOLATED', 'violated'],
    meaning:
      'a machine inequality (a regime, horizon or validity condition) was evaluated at the point and fails; ' +
      'no bound is claimed there',
    commands: ['regime', 'path', 'evaluate'],
  },
  {
    key: 'adequate',
    words: ['ADEQUATE', 'adequate'],
    meaning:
      'every bound on the path is claimed at the point and its error, in the norm the tolerance is stated in, ' +
      'is within the tolerance',
    commands: ['path'],
  },
  {
    key: 'inadequate',
    words: ['INADEQUATE', 'inadequate'],
    meaning:
      'the point is outside a regime or past a horizon on the path, or the error exceeds the tolerance; exit 3',
    commands: ['path'],
  },
  {
    key: 'undetermined',
    words: ['UNDETERMINED', 'undetermined'],
    meaning:
      'the point does not settle adequacy: a value is missing, the bound is in another norm with no declared ' +
      'translation, or an upper bound is past its horizon. It is not shown inadequate',
    commands: ['path'],
  },
  {
    key: 'neither',
    words: ['NEITHER', 'neither'],
    meaning:
      'in a route-coverage grid, no encoded route claims a bound at this point: the parent model is the one ' +
      'to use there and no reduced-model number is given. It does not say the models disagree',
    commands: ['path'],
  },
  {
    key: 'unsettled',
    words: ['UNSETTLED', 'unsettled'],
    meaning: 'in a route-coverage grid, a coordinate or t was not supplied, so whether a route covers the point is not settled',
    commands: ['path'],
  },
  {
    key: 'no-composite-claim',
    words: ['no composite claim', 'no-claim'],
    meaning:
      'the composition table yields no relation for two steps of the route (a silent cell), or a step carries ' +
      'no bound in the running norm, so the route claims no error; regimes and horizons are still reported. It exits 0',
    commands: ['path', 'map'],
  },
  {
    key: 'decoy',
    words: ['DECOY', 'decoy'],
    meaning:
      'a set of constants closes the dimensions, but its monomial does not reproduce the evaluator: a failed ' +
      'dimensional reconstruction, not a physical refutation of the formula',
    commands: ['audit'],
  },
  {
    key: 'adjudicated-decoy',
    words: ['decoy'],
    meaning:
      'a recorded adjudication of the identification a ≡ b found a dimensional coincidence with no mechanism ' +
      '(trivial and definitional identifications included). Folded out of the PROMISING list by default. Not ' +
      'the DECOY of `upt audit`, which is a failed dimensional reconstruction of a bridge',
    commands: ['discover'],
  },
  {
    key: 'entailed',
    words: ['entailed'],
    meaning:
      'real physics that the canonical L-layer already carries, so not a new link. As a recorded adjudication ' +
      'verdict it folds the identification out of the PROMISING list by default; as a consequence signal it ' +
      'means the derived monomial has the same normal form, target and governing set as a canonical equation',
    commands: ['discover'],
  },
  {
    key: 'novel-consequence',
    words: ['novel-consequence'],
    meaning:
      'the derived monomial consequence matches no canonical equation: unadjudicated, and not evidence that it holds',
    commands: ['discover'],
  },
  {
    key: 'inconclusive',
    words: ['inconclusive'],
    meaning: 'no monomial consequence could be derived, so nothing was compared',
    commands: ['discover'],
  },
  {
    key: 'genuine',
    words: ['genuine'],
    meaning: 'a recorded adjudication found the identification real physics and a new link',
    commands: ['discover'],
  },
  {
    key: 'deferred',
    words: ['deferred'],
    meaning:
      'the identification was reviewed and consciously parked. An identification with no recorded adjudication ' +
      'was never reviewed, which is not the same',
    commands: ['discover'],
  },
  {
    key: 'not-covered',
    words: ['NOT COVERED'],
    meaning:
      'the name is not a quantity of the selected graph (--source), so there is nothing to evaluate; the nearest ' +
      'names and what `upt search` finds are listed. It is not a statement about the physics',
    commands: ['explain'],
  },
  {
    key: 'promising',
    words: ['PROMISING', 'promising'],
    meaning:
      'an identification a ≡ b that is numerically consistent, connects disconnected physics and unlocks at least ' +
      'one quantity: worth a physicist\'s review, not evidence that it holds',
    commands: ['discover'],
  },
  {
    key: 'inert',
    words: ['INERT', 'inert'],
    meaning: 'consistent but idle: a dimensional coincidence that connects nothing new and unlocks no quantity',
    commands: ['discover'],
  },
  {
    key: 'contradictory',
    words: ['CONTRADICTORY', 'contradictory'],
    meaning: 'the identification breaks the numerical consistency of the graph: a falsification within the graph',
    commands: ['discover'],
  },
  {
    key: 'magnitude-clash',
    words: ['magnitude-clash'],
    meaning:
      'the two quantities\' representative values differ by more than the threshold of orders of magnitude: an ' +
      'independent falsification',
    commands: ['discover'],
  },
  {
    key: 'axis-clash',
    words: ['axis-clash'],
    meaning:
      'the identification\'s stated scale or force regime labels disagree: a prior from catalog labels, no ' +
      'computation, never counted as a falsification',
    commands: ['discover'],
  },
  {
    key: 'reproduced',
    words: ['reproduced'],
    meaning: 'the replayed run gave the recorded exit code, stdout and stderr, byte for byte',
    commands: ['replay'],
  },
  {
    key: 'differs',
    words: ['differs', 'differ'],
    meaning:
      'the replayed run differs from the record: the stream and first differing line are named, with every ' +
      'changed version, parser or constant and whether the command can reach it. Exit 3',
    commands: ['replay'],
  },
  {
    key: 'not-replayable',
    words: ['not replayable', 'not-replayable'],
    meaning:
      'the entry is not re-run: its line is malformed, it wrote a file (--out, which a replay would overwrite; the ' +
      'recorded artifact hash stays in the record), or it is a timed probe search. Nothing was compared',
    commands: ['replay'],
  },
  {
    key: 'checked',
    words: ['checked'],
    meaning: 'a witness ran in this invocation and its claim held',
    commands: ['atlas', 'map', 'path'],
  },
  {
    key: 'refuted',
    words: ['refuted', 'REFUTED'],
    meaning:
      'a witness ran and its claim failed. On a negative control the wrong hypothesis is refuted, which is ' +
      'the control working. A refuted witness makes `--run` exit 3',
    commands: ['atlas', 'map', 'path'],
  },
  {
    key: 'unresolved',
    words: ['unresolved'],
    meaning:
      'a witness did not run (its peer is absent, it timed out, its input did not parse) or ran and could not ' +
      'decide (a CAS difference that did not simplify to zero, no convergence). Not a refutation, and never ' +
      'counted with the refuted',
    commands: ['atlas', 'map', 'path'],
  },
];

/** The definitions of the statuses `command` can emit, keyed as in the glossary. */
export function definitionsFor(command: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of STATUS_GLOSSARY) if (s.commands.includes(command)) out[s.key] = s.meaning;
  return out;
}

export function statusMeaning(key: string): string {
  const s = STATUS_GLOSSARY.find((d) => d.key === key);
  if (s === undefined) throw new Error(`statuses: no status '${key}'`);
  return s.meaning;
}

export function glossaryText(): string {
  const lines = [
    'upt help statuses — the status words the commands print',
    '',
    'Each --json envelope carries these definitions, under `definitions`, for the statuses its command',
    'can emit. A status that did not check anything never reads as a pass.',
    '',
  ];
  for (const s of STATUS_GLOSSARY) {
    lines.push(`  ${s.words.join(' / ')}   (${s.commands.map((c) => (c === 'replay' ? '--replay' : c)).join(', ')})`);
    lines.push(`        ${s.meaning}.`);
  }
  return lines.join('\n');
}
