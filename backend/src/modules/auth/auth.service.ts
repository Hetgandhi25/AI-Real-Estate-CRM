import bcrypt from "bcryptjs";
import { prisma } from "../../prisma/index.js";
import { ApiError } from "../../common/lib/api-error.js";
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from "../../common/utils/jwt.js";
import type { AuthSession, JwtPayload, LoginInput, RegisterInput } from "../../common/types/auth.js";

const SALT_ROUNDS = 10;

function mapUserToAuthUser(user: { id: string; name: string; email: string; role: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as unknown as AuthSession["user"]["role"],
  };
}

async function buildAuthSession(user: { id: string; name: string; email: string; role: string }) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as JwtPayload["role"],
  };

  const rawRefreshToken = generateRefreshToken(payload);
  const refreshTokenHash = hashToken(rawRefreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshTokenHash },
  });

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: rawRefreshToken,
    user: mapUserToAuthUser(user),
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthSession> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "A user with that email already exists.");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: "agent",
    },
  });

  return buildAuthSession(user);
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password.");
  }

  return buildAuthSession(user);
}

export async function refreshUserTokens(refreshToken: string): Promise<AuthSession> {
  verifyRefreshToken(refreshToken);
  const hashedRefreshToken = hashToken(refreshToken);
  const user = await prisma.user.findFirst({ where: { refreshToken: hashedRefreshToken } });
  if (!user) {
    throw new ApiError(401, "Refresh token is invalid or expired.");
  }

  return buildAuthSession(user);
}

export async function logoutUser(refreshToken?: string, userId?: string): Promise<void> {
  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    return;
  }

  if (!refreshToken) {
    return;
  }

  const hashedRefreshToken = hashToken(refreshToken);
  const user = await prisma.user.findFirst({ where: { refreshToken: hashedRefreshToken } });
  if (!user) return;

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
}

export async function updateUserProfile(userId: string, payload: Partial<{ name: string; email: string; password: string }>) {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  if (payload.email && payload.email !== existingUser.email) {
    const conflict = await prisma.user.findUnique({ where: { email: payload.email } });
    if (conflict) {
      throw new ApiError(409, "A user with that email already exists.");
    }
  }

  const data: any = {};
  if (payload.name) data.name = payload.name;
  if (payload.email) data.email = payload.email;
  if (payload.password) data.password = await bcrypt.hash(payload.password, SALT_ROUNDS);

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function loadUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}
