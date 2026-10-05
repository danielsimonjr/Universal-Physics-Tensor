/**
 * `upt search <word> ...` — find a law, model, bridge or quantity by the words
 * a physicist would use, and name the command that inspects it.
 *
 * Audit §14 I5. `explain schrodinger-equation` failed because the name was a
 * model, not a quantity, and its suggestions were edit-distance neighbours.
 * This command searches every registry the CLI exposes by WORD: names, ids,
 * symbols, genuine aliases (`resolveToCatalogName`) and catalog-bridge
 * descriptions. An equal dimension is never a match: a radius is not a
 * wavelength, and angular frequency is not frequency, even where the two share
 * a dimension.
 *
 * A word of one or two letters is a symbol, not an English word: it matches a
 * quantity symbol, an alias or a whole id segment exactly, and never a stray
 * letter inside a description.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { CliError, UsageError } from '../errors.js';
import { emitJson } from '../output.js';
import { buildSearchIndex, fold, matchEveryWord, queryWords, SEARCH_SECTIONS, STOP_WORDS } from '../search-index.js';

const FLAGS: FlagSpec[] = [JSON_FLAG];

const HELP = `upt search <word> ...
        Find a catalog bridge, canonical equation, atlas model, atlas bridge,
        quantity, applied case, or regime registration by the words in its name, id, symbol, alias
        or bridge description, and print the command that inspects each match. Every
        word must match. Two or more words that share a field must sit together
        there, in either order, and a word in that phrase is not a prefix of a
        longer word. A trailing parenthetical is a gloss. A gloss does not
        combine with the title, so a query split across them matches nothing,
        and a query that is the gloss says so. Words that never share a
        non-gloss field still match. A space inside one argument, and a hyphen, are word
        breaks, so a quoted phrase and a hyphenated name are several words.
        An equal dimension is never a match (a radius is not
        a wavelength). A word of one or two letters matches a symbol or alias
        exactly. A longer word that only continues the query is named as a
        prefix, so landau is not reported as Landauer without saying so.
        A catalog bridge with no evaluator and a formalRef routes to
        upt atlas, and the hit quotes that reference's covers line.
        No match exits 1 and names the registries searched.
        e.g.  upt search Schrödinger
              upt search thermal noise`;

const PER_SECTION = 10;

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const raw = [...args.positionals];
  if (raw.length === 0) throw new UsageError('upt search: give at least one word, e.g. `upt search thermal noise`');
  const query = queryWords(raw);
  if (query.length === 0) throw new UsageError('upt search: give at least one word, e.g. `upt search thermal noise`');
  const index = buildSearchIndex(api);
  const significant = query.length > 1 ? query.filter((q) => !STOP_WORDS.has(fold(q))) : query;
  if (significant.length === 0) throw new UsageError(`upt search: '${query.join(' ')}' has only stop words`);
  const matches = matchEveryWord(api, index, significant);

  const counts = SEARCH_SECTIONS.map(([k, title]) => `${index.filter((e) => e.kind === k).length} ${title}`).join(', ');
  const scope = `searched ${counts}; this registry only`;

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'search',
        epistemics:
          'Matched by the words of names, ids, symbols, genuine aliases and catalog-bridge descriptions. ' +
          'An equal dimension is never a match. No match means none in these registries, not none in physics.',
        options: { query },
        result: {
          scope,
          matches: matches.map((m) => ({
            kind: m.entry.kind,
            id: m.entry.id,
            summary: m.entry.line,
            matchedIn: m.matchedIn,
            ...(m.alias === undefined ? {} : { alias: m.alias }),
            command: m.entry.command,
            ...(m.prefixes === undefined ? {} : { prefixes: m.prefixes }),
          })),
        },
      },
      ctx.write,
    );
    return matches.length === 0 ? 1 : 0;
  }

  if (matches.length === 0) {
    throw new CliError(`upt search: no entry matches every word of '${query.join(' ')}' — ${scope}`);
  }
  out(`\nupt search ${query.join(' ')} — ${matches.length} match(es); every word matched`);
  out('  matched by words, symbols and genuine aliases; an equal dimension is never a match (a radius is not a wavelength)');
  for (const [kind, title] of SEARCH_SECTIONS) {
    const inKind = matches.filter((m) => m.entry.kind === kind);
    if (inKind.length === 0) continue;
    out(`\n${title}:`);
    for (const m of inKind.slice(0, PER_SECTION)) {
      const prefix = (m.prefixes ?? []).map((p) => `${p.query} is a prefix of ${p.word}`).join('; ');
      out(`  ${m.entry.line}${m.alias === undefined ? '' : ` (alias ${m.alias})`}  [words in: ${m.matchedIn.join(', ')}${prefix === '' ? '' : `; ${prefix}`}]`);
      out(`      ${m.entry.commandLabel}: ${m.entry.command}${m.entry.note === undefined ? '' : ` (${m.entry.note})`}`);
    }
    if (inKind.length > PER_SECTION) out(`  … and ${inKind.length - PER_SECTION} more (--json lists every match)`);
  }
  out(`\n${scope}.`);
  return 0;
}

export const command: Command = {
  name: 'search',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Find a bridge, equation, model, quantity, case, or regime by the words in its record.',
  example: 'upt search thermal noise',
  group: 'explore',
  run,
};
registerCommand(command);
