// The store is a thin wrapper around one plain object. Nothing renders from it
// directly: apps read selectors, and only actions call commit().

export function createStore(initial) {
  let state = initial;
  let revision = 0;
  const listeners = new Set();

  return {
    get state() {
      return state;
    },
    get revision() {
      return revision;
    },
    /** Run a mutation, then tell everyone who is listening. */
    commit(mutator) {
      mutator(state);
      revision += 1;
      for (const listener of [...listeners]) listener(state, revision);
      return revision;
    },
    /** Swap the whole world (restart / new seed). */
    replace(next) {
      state = next;
      revision += 1;
      for (const listener of [...listeners]) listener(state, revision);
    },
    /** Tell listeners something changed when the platform already mutated it. */
    notify() {
      revision += 1;
      for (const listener of [...listeners]) listener(state, revision);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
