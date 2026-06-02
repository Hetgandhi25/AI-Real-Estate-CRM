import { env } from "@/config";
import { MOCK_SESSION } from "@/constants";
import type { AuthSession } from "@/types";

/** Synchronous session seed — identical on server and client when mock auth is enabled. */
export function getInitialAuthState(): { session: AuthSession | null; isLoading: boolean } {
  if (env.VITE_MOCK_AUTH) {
    return {
      session: {
        accessToken: MOCK_SESSION.accessToken,
        refreshToken: MOCK_SESSION.refreshToken,
        user: { ...MOCK_SESSION.user },
      },
      isLoading: false,
    };
  }

  return { session: null, isLoading: true };
}
