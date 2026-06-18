import bcrypt from "bcryptjs";
import { prisma } from "../../prisma/index.js";
import { ApiError } from "../../common/lib/api-error.js";
import type { AuthUser } from "../../common/types/auth.js";

const SALT_ROUNDS = 10;

type AgentPayload = {
  name?: string;
  email?: string;
  password?: string;
  experience?: number;
  specialization?: string;
  performanceScore?: number;
};

type AgentResponse = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  experience: number;
  specialization: string | null;
  performanceScore: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAgents(params?: { search?: string }): Promise<AgentResponse[]> {
  const where: any = {};
  if (params?.search) {
    const q = params.search;
    where.OR = [
      { specialization: { contains: q, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const agents = await prisma.agent.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return agents.map((agent) => ({
    id: agent.id,
    userId: agent.userId,
    name: agent.user.name,
    email: agent.user.email,
    role: agent.user.role,
    experience: agent.experience,
    specialization: agent.specialization,
    performanceScore: agent.performanceScore,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  }));
}

export async function getAgentById(id: string): Promise<AgentResponse | null> {
  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } });
  if (!agent) return null;

  return {
    id: agent.id,
    userId: agent.userId,
    name: agent.user.name,
    email: agent.user.email,
    role: agent.user.role,
    experience: agent.experience,
    specialization: agent.specialization,
    performanceScore: agent.performanceScore,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export async function createAgent(payload: AgentPayload): Promise<AgentResponse> {
  if (!payload.name || !payload.email || !payload.password) {
    throw new ApiError(400, "Agent name, email, and password are required.");
  }

  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw new ApiError(409, "A user with that email already exists.");
  }

  const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const agent = await prisma.agent.create({
    data: {
      experience: payload.experience ?? 0,
      specialization: payload.specialization ?? null,
      performanceScore: payload.performanceScore ?? 0,
      user: {
        create: {
          name: payload.name,
          email: payload.email,
          password: hashedPassword,
          role: "agent",
        },
      },
    },
    include: { user: true },
  });

  return {
    id: agent.id,
    userId: agent.user.id,
    name: agent.user.name,
    email: agent.user.email,
    role: agent.user.role,
    experience: agent.experience,
    specialization: agent.specialization,
    performanceScore: agent.performanceScore,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export async function updateAgent(id: string, payload: AgentPayload): Promise<AgentResponse> {
  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } });
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  const userData: Partial<AuthUser> & { password?: string } = {};
  if (payload.name) userData.name = payload.name;
  if (payload.email) userData.email = payload.email;
  if (payload.password) userData.password = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const updatedAgent = await prisma.agent.update({
    where: { id },
    data: {
      experience: payload.experience ?? agent.experience,
      specialization: payload.specialization ?? agent.specialization,
      performanceScore: payload.performanceScore ?? agent.performanceScore,
      user: {
        update: userData,
      },
    },
    include: { user: true },
  });

  return {
    id: updatedAgent.id,
    userId: updatedAgent.user.id,
    name: updatedAgent.user.name,
    email: updatedAgent.user.email,
    role: updatedAgent.user.role,
    experience: updatedAgent.experience,
    specialization: updatedAgent.specialization,
    performanceScore: updatedAgent.performanceScore,
    createdAt: updatedAgent.createdAt,
    updatedAt: updatedAgent.updatedAt,
  };
}

export async function deleteAgent(id: string): Promise<void> {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  await prisma.user.delete({ where: { id: agent.userId } });
}
