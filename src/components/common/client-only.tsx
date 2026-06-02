import type { ReactNode } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

type ClientOnlyProps = {
  children: ReactNode;
  /** Rendered on server and before mount — must match dimensions to avoid layout shift. */
  fallback?: ReactNode;
};

/**
 * Renders children only after client mount. Server and first client pass render `fallback`.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <>{fallback}</>;
  return <>{children}</>;
}
