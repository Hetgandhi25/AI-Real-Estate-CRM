import { ApiError } from "@/types";

type QueryErrorFallbackProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
};

export function QueryErrorFallback({
  error,
  title = "Unable to load data",
  onRetry,
}: QueryErrorFallbackProps) {
  const message = ApiError.isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : "Something went wrong";

  return (
    <div className="glass-card rounded-2xl p-8 text-center" role="alert">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
