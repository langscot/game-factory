// Assembles the platform: one store, one bus, one clock, one set of selectors
// and actions. Both the game and the dev harness build a world this way, so
// they exercise the same code.

import { seedWorld } from "./seed.js";
import { createStore } from "./store.js";
import { createRng } from "./rng.js";
import { createClock } from "./clock.js";
import { createEventBus } from "./events.js";
import { createSelectors } from "./selectors.js";
import { createSession } from "./session.js";
import { createActions } from "./actions.js";
import { createTicketWatcher } from "./watchers.js";
import { assertValidWorld, findProblems } from "./validate.js";

export const DEFAULT_SEED = 20261115;

export function createWorld({ seed = DEFAULT_SEED } = {}) {
  const store = createStore(seedWorld({ seed }));
  assertValidWorld(store);

  const rng = createRng(seed);
  const clock = createClock({ store, seed });
  const events = createEventBus({ store, clock });
  const selectors = createSelectors(store);
  const session = createSession({ store, events, clock });
  const actions = createActions({ store, selectors, events, clock, session });
  const watcher = createTicketWatcher({ store, events, session, clock });

  return {
    store,
    rng,
    clock,
    events,
    world: selectors,
    session,
    actions,
    watcher,
    problems: () => findProblems(store.state),
  };
}
