import { lazy, Suspense } from "react";
import { env } from "@/config";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

/** Rendered inside ClientUiLayer — never SSR. */
export function QueryDevtools() {
  if (!import.meta.env.DEV || !env.VITE_ENABLE_QUERY_DEVTOOLS) return null;

  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  );
}
