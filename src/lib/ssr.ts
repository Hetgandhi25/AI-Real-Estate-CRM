/** True when running in a browser (not SSR Worker/Node). */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** True when DOM APIs are available. */
export function canUseDOM(): boolean {
  return typeof document !== "undefined";
}
