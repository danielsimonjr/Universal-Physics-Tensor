/**
 * Interpreter for a catalog validity condition.
 *
 * A condition is a boolean expression over quantity names, the registered
 * constants, `finite`, and `integer`. It is not JavaScript `eval`.
 *
 * @module bridges/holds
 */

export class HoldsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HoldsError';
  }
}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

const OPS = ['>=', '<=', '===', '!==', '==', '!=', '&&', '||', '>', '<', '!'];

function tokenize(source: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      i += 1;
      continue;
    }
    if (c === '(') {
      out.push({ t: 'lp' });
      i += 1;
      continue;
    }
    if (c === ')') {
      out.push({ t: 'rp' });
      i += 1;
      continue;
    }
    const op = OPS.find((candidate) => source.startsWith(candidate, i));
    if (op !== undefined) {
      out.push({ t: 'op', v: op });
      i += op.length;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      out.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/.exec(source.slice(i));
      if (m === null) throw new HoldsError(`bad number at ${i} in ${source}`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
      if (m === null) throw new HoldsError(`bad name at ${i} in ${source}`);
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    throw new HoldsError(`unexpected '${c}' in ${source}`);
  }
  return out;
}

/**
 * Names in `holds` may contain hyphens. Rewrite the declared names to
 * underscores, longest first, before the lexer treats `-` as subtraction.
 */
export function rewriteHoldsNames(source: string, names: readonly string[]): string {
  const ordered = [...names].sort((a, b) => b.length - a.length);
  let out = source;
  for (const name of ordered) {
    if (!name.includes('-')) continue;
    out = out.split(name).join(name.replace(/-/g, '_'));
  }
  return out;
}

interface Parser {
  toks: Tok[];
  i: number;
}

function peek(p: Parser): Tok | undefined {
  return p.toks[p.i];
}

function peekOp(p: Parser): string | undefined {
  const tok = peek(p);
  return tok !== undefined && tok.t === 'op' ? tok.v : undefined;
}

function eat(p: Parser): Tok {
  const tok = p.toks[p.i];
  if (tok === undefined) throw new HoldsError('unexpected end of condition');
  p.i += 1;
  return tok;
}

function asBool(value: number | boolean, op: string): boolean {
  if (typeof value !== 'boolean') throw new HoldsError(`${op} needs a condition`);
  return value;
}

function parseOr(p: Parser, env: Env): number | boolean {
  let left = parseAnd(p, env);
  while (peekOp(p) === '||') {
    eat(p);
    const right = parseAnd(p, env);
    left = asBool(left, '||') || asBool(right, '||');
  }
  return left;
}

function parseAnd(p: Parser, env: Env): number | boolean {
  let left = parseNot(p, env);
  while (peekOp(p) === '&&') {
    eat(p);
    const right = parseNot(p, env);
    left = asBool(left, '&&') && asBool(right, '&&');
  }
  return left;
}

function parseNot(p: Parser, env: Env): number | boolean {
  if (peekOp(p) === '!') {
    eat(p);
    return !asBool(parseNot(p, env), '!');
  }
  return parseCmp(p, env);
}

function parseCmp(p: Parser, env: Env): number | boolean {
  const left = parseAdd(p, env);
  const op = peek(p);
  if (op?.t === 'op' && ['>', '<', '>=', '<=', '==', '!=', '===', '!=='].includes(op.v)) {
    eat(p);
    const right = parseAdd(p, env);
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      throw new HoldsError('comparison of a condition');
    }
    switch (op.v) {
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '==':
      case '===':
        return left === right;
      case '!=':
      case '!==':
        return left !== right;
      default:
        throw new HoldsError(`bad comparison ${op.v}`);
    }
  }
  return left;
}

function parseAdd(p: Parser, env: Env): number | boolean {
  let left = parseMul(p, env);
  while (peekOp(p) === '+' || peekOp(p) === '-') {
    const op = eat(p);
    const right = parseMul(p, env);
    if (typeof left !== 'number' || typeof right !== 'number' || op.t !== 'op') {
      throw new HoldsError('arithmetic on a condition');
    }
    left = op.v === '+' ? left + right : left - right;
  }
  return left;
}

function parseMul(p: Parser, env: Env): number | boolean {
  let left = parseUnary(p, env);
  while (peekOp(p) === '*' || peekOp(p) === '/') {
    const op = eat(p);
    const right = parseUnary(p, env);
    if (typeof left !== 'number' || typeof right !== 'number' || op.t !== 'op') {
      throw new HoldsError('arithmetic on a condition');
    }
    left = op.v === '*' ? left * right : left / right;
  }
  return left;
}

function parseUnary(p: Parser, env: Env): number | boolean {
  if (peekOp(p) === '-') {
    eat(p);
    const v = parsePow(p, env);
    if (typeof v !== 'number') throw new HoldsError('negation of a condition');
    return -v;
  }
  if (peekOp(p) === '+') {
    eat(p);
    return parsePow(p, env);
  }
  return parsePow(p, env);
}

function parsePow(p: Parser, env: Env): number | boolean {
  const base = parsePrimary(p, env);
  if (peekOp(p) === '^') {
    eat(p);
    const exp = parseUnary(p, env);
    if (typeof base !== 'number' || typeof exp !== 'number') throw new HoldsError('power of a condition');
    return base ** exp;
  }
  return base;
}

function parsePrimary(p: Parser, env: Env): number | boolean {
  const tok = peek(p);
  if (tok?.t === 'num') {
    eat(p);
    return tok.v;
  }
  if (tok?.t === 'id') {
    eat(p);
    if (tok.v === 'true') return true;
    if (tok.v === 'false') return false;
    if (peek(p)?.t === 'lp') {
      eat(p);
      const arg = parseAdd(p, env);
      if (peek(p)?.t !== 'rp') throw new HoldsError(`unclosed ${tok.v}`);
      eat(p);
      if (typeof arg !== 'number') throw new HoldsError(`${tok.v} needs a number`);
      if (tok.v === 'finite') return Number.isFinite(arg);
      if (tok.v === 'integer') return Number.isInteger(arg);
      if (tok.v === 'sqrt') return Math.sqrt(arg);
      if (tok.v === 'abs') return Math.abs(arg);
      if (tok.v === 'exp') return Math.exp(arg);
      throw new HoldsError(`unknown predicate ${tok.v}`);
    }
    if (Object.hasOwn(env.values, tok.v)) return env.values[tok.v]!;
    if (Object.hasOwn(env.constants, tok.v)) return env.constants[tok.v]!;
    throw new HoldsError(`unbound '${tok.v}'`);
  }
  if (tok?.t === 'lp') {
    eat(p);
    const v = parseOr(p, env);
    if (peek(p)?.t !== 'rp') throw new HoldsError('unclosed group');
    eat(p);
    return v;
  }
  throw new HoldsError('expected a value');
}

interface Env {
  values: Record<string, number>;
  constants: Record<string, number>;
}

/**
 * Whether `holds` is true for `values`.
 * Hyphenated quantity names are rewritten with `names` before parsing.
 */
export function holds(
  source: string,
  values: Readonly<Record<string, number>>,
  constants: Readonly<Record<string, number>>,
  names: readonly string[],
): boolean {
  const rewritten = rewriteHoldsNames(source, names);
  const folded: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) folded[key.replace(/-/g, '_')] = value;
  const p: Parser = { toks: tokenize(rewritten), i: 0 };
  const result = parseOr(p, { values: folded, constants });
  if (p.i !== p.toks.length) throw new HoldsError(`trailing input in ${source}`);
  if (typeof result !== 'boolean') throw new HoldsError(`condition is not boolean: ${source}`);
  return result;
}
