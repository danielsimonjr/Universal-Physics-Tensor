/**
 * `selectRoute` converts the library's `RangeError` (an unknown endpoint) to a `CliError`
 * (exit 1) and nothing else: a `TypeError` thrown by the route search is a defect and
 * propagates as one, where before every error class became a user error.
 *
 * Found by the 2026-10-15 survey (`_atlas-route.ts:44-52`): the comment said "RangeError"
 * while the catch mapped every class.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import * as api from '../../dist/cli-api.js';
import { selectRoute } from '../../dist/cli/commands/_atlas-route.js';
import { CliError } from '../../dist/cli/errors.js';

function faking(throwing: () => never): typeof api {
  return { ...api, findPath: throwing, findAtlasPath: throwing } as typeof api;
}

describe('selectRoute', () => {
  it('a RangeError from the search is a CliError naming the command (exit 1)', () => {
    const fake = faking(() => {
      throw new RangeError('planted unknown endpoint');
    });
    expect(() => selectRoute(fake, 'model-pendulum', 'model-spring', 'path')).toThrow(CliError);
    expect(() => selectRoute(fake, 'model-pendulum', 'model-spring', 'path')).toThrow('upt path: planted unknown endpoint');
  });
  it('a planted TypeError is a defect and propagates unconverted', () => {
    const fake = faking(() => {
      throw new TypeError('planted defect');
    });
    let caught: unknown;
    try {
      selectRoute(fake, 'model-pendulum', 'model-spring', 'path');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TypeError);
    expect(caught).not.toBeInstanceOf(CliError);
  });
  it('CONTROL: the real search still finds the pendulum → spring route', () => {
    const { bridges } = selectRoute(api, 'model-pendulum', 'model-spring', 'path');
    expect(bridges?.map((b) => b.id)).toEqual(['ab-pendulum-linear']);
  });
});
