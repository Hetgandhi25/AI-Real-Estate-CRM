export type UserRole = "admin" | "manager" | "agent";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarInitials?: string;
  title?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = AuthTokens & {
  user: AuthUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
