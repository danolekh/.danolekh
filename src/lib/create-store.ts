import { useSyncExternalStore } from "react";

type Store<T> = {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
};

function createStore<T extends object>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (partial) => {
      const newPartial = typeof partial === "function" ? partial(state) : partial;
      state = { ...state, ...newPartial };
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function useStore<T extends object>(store: Store<T>): [T, Store<T>["setState"]] {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return [state, store.setState];
}

export { createStore, useStore };
