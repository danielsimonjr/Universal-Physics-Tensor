/**
 * Side-effect barrel: importing this module registers every ported CLI
 * command (each command module calls `registerCommand` at load time).
 * `main.ts` imports this once so `runCli`'s dispatch body never needs to
 * change as commands are added.
 */
import './priority.js';
import './audit.js';
import './coverage.js';
import './canonical.js';
import './recover.js';
import './connectors.js';
import './predict.js';
import './candidates.js';
import './frontier.js';
import './explain.js';
import './symbolic.js';
import './eval.js';
import './derive.js';
import './map.js';
import './discover.js';
import './confront.js';
import './axes.js';
import './evaluate.js';
import './ground.js';
import './probe.js';
import './regime.js';
import './path.js';
import './atlas.js';
import './search.js';
import './retrieve.js';
import './metric.js';
import './testplan.js';
