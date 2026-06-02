import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * React-recommended hydration gate: false during SSR and the hydration pass,
 * true after the client has committed (via useSyncExternalStore).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
