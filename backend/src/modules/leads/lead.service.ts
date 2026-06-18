import { prisma } from "../../prisma/index.js";
import { mapPropertyToDTO } from "../properties/property.mapper.js";

const STRICT_LEAD_PROPERTY_SELECT = { id: true, title: true, city: true, status: true, state: true, location: { select: { name: true, city: { select: { name: true, state: { select: { name: true } } } } } } };

type ListParams = {
  page: number;
  pageSize: number;
  status?: string;
  agentId?: string;
  search?: string;
};

export async function createLead(payload: {
  customerId: string;
  propertyId: string;
  source: string;
  notes?: string;
  assignedAgentId?: string;
}) {
  if (payload.assignedAgentId) {
    const userExists = await prisma.user.findUnique({
      where: { id: payload.assignedAgentId },
    });
    if (!userExists) {
      console.error(`[Lead Create] Agent user ID not found: ${payload.assignedAgentId}`);
      throw new Error(
        `Agent not found: ${payload.assignedAgentId}. Make sure to use the User ID, not Agent ID.`
      );
    }
  }

  const lead = await prisma.lead.create({
    data: payload as any,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      property: { select: STRICT_LEAD_PROPERTY_SELECT },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });
  return { ...lead, property: mapPropertyToDTO(lead.property) };
}

export async function updateLead(
  id: string,
  payload: Partial<{ status: string; notes: string; assignedAgentId: string }>
) {
  return prisma.lead.update({
    where: { id },
    data: payload as any,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      property: { select: STRICT_LEAD_PROPERTY_SELECT },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  }).then(lead => ({ ...lead, property: mapPropertyToDTO(lead.property) }));
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      property: { select: STRICT_LEAD_PROPERTY_SELECT },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  }).then(lead => lead ? { ...lead, property: mapPropertyToDTO(lead.property) } : null);
}

export async function listLeads(params: ListParams) {
  const { page, pageSize, status, agentId, search } = params;
  const where: any = {};

  if (status) where.status = status;
  if (agentId) where.assignedAgentId = agentId;

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { status: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      {
        customer: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        },
      },
      {
        property: {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { location: { city: { name: { contains: search, mode: "insensitive" } } } },
          ],
        },
      },
      {
        assignedAgent: {
          name: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const total = await prisma.lead.count({ where });
  const items = await prisma.lead.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      property: { select: STRICT_LEAD_PROPERTY_SELECT },
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    data: items.map(lead => ({ ...lead, property: mapPropertyToDTO(lead.property) })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}
