import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/common/error-boundary";

type GlobalErrorBoundaryProps = {
  children: ReactNode;
};

function GlobalErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="glass-card max-w-md rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold">Unexpected error</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={() => {
        // Toast hook cannot run in class boundary — errors logged in ErrorBoundary
      }}
      fallback={(error, reset) => <GlobalErrorFallback error={error} reset={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
}
