import { toast } from "sonner";
import { ApiError } from "@/types";

type ToastOptions = {
  title?: string;
  description?: string;
};

export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) =>
      toast.success(options?.title ?? message, { description: options?.description }),
    error: (message: string, options?: ToastOptions) =>
      toast.error(options?.title ?? message, { description: options?.description }),
    info: (message: string, options?: ToastOptions) =>
      toast.info(options?.title ?? message, { description: options?.description }),
    promise: toast.promise,
    fromApiError: (error: unknown, fallback = "Something went wrong") => {
      const message = ApiError.isApiError(error) ? error.message : fallback;
      toast.error(message);
    },
  };
}
