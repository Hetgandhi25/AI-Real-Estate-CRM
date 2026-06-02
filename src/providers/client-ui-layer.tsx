import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ClientOnly } from "@/components/common/client-only";
import { QueryDevtools } from "@/providers/query-devtools";

/**
 * Radix portals, Sonner, and devtools — client-only to prevent SSR attribute/id mismatches.
 */
export function ClientUiLayer() {
  return (
    <ClientOnly>
      <TooltipProvider delayDuration={0}>
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
      <QueryDevtools />
    </ClientOnly>
  );
}
