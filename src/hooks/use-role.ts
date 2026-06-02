import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types";

const ROLE_RANK: Record<UserRole, number> = {
  agent: 1,
  manager: 2,
  admin: 3,
};

export function useRole() {
  const { user } = useAuth();
  const role = user?.role;

  const hasRole = (required: UserRole | UserRole[]) => {
    if (!role) return false;
    const requiredRoles = Array.isArray(required) ? required : [required];
    return requiredRoles.includes(role);
  };

  const hasMinimumRole = (minimum: UserRole) => {
    if (!role) return false;
    return ROLE_RANK[role] >= ROLE_RANK[minimum];
  };

  return { role, hasRole, hasMinimumRole };
}
