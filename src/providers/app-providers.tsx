import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { GlobalErrorBoundary } from "@/components/common/global-error-boundary";
import { AuthProvider } from "@/providers/auth-provider";
import { ClientUiLayer } from "@/providers/client-ui-layer";

type AppProvidersProps = {
  children: React.ReactNode;
  queryClient: QueryClient;
};

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalErrorBoundary>
          {children}
          <ClientUiLayer />
        </GlobalErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
