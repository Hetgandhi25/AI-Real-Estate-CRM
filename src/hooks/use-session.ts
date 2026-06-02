import { useAuth } from "@/hooks/use-auth";

/** Read-only session accessors for layout and profile UI. */
export function useSession() {
  const { user, isAuthenticated, isLoading, session } = useAuth();

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    displayName: user?.name ?? "Guest",
    initials: user?.avatarInitials ?? "??",
    title: user?.title ?? "",
  };
}
