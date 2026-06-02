import { prisma } from "../../prisma/index.js";
import type { Prisma } from "@prisma/client";

type ListParams = {
  page: number;
  pageSize: number;
  filters?: Record<string, string>;
};

function serializePropertyPayload(payload: any) {
  return {
    ...payload,
    price: payload.price != null ? Number(payload.price) : undefined,
    amenities: payload.amenities ? JSON.stringify(payload.amenities) : JSON.stringify([]),
    images: payload.images ? JSON.stringify(payload.images) : JSON.stringify([]),
  };
}

function parsePropertyRecord(record: any) {
  if (!record) return record;
  return {
    ...record,
    amenities: typeof record.amenities === "string" ? JSON.parse(record.amenities) : record.amenities,
    images: typeof record.images === "string" ? JSON.parse(record.images) : record.images,
  };
}

export async function listProperties(params: ListParams) {
  const { page, pageSize, filters } = params;
  const where: Prisma.PropertyWhereInput = {};

  if (filters) {
    if (filters.status && filters.status !== "all") {
      where.status = filters.status as any;
    }
    if (filters.type) {
      where.propertyType = filters.type as any;
    }
    if (filters.availability && filters.availability !== "all") {
      where.availability = filters.availability;
    }
    if (filters.search) {
      const q = String(filters.search);
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }
    if (filters.city) where.city = { contains: String(filters.city), mode: "insensitive" } as any;
    if (filters.state) where.state = { contains: String(filters.state), mode: "insensitive" } as any;
    if (filters.location) {
      const loc = String(filters.location);
      where.OR = [
        { city: { contains: loc, mode: "insensitive" } },
        { state: { contains: loc, mode: "insensitive" } },
        { address: { contains: loc, mode: "insensitive" } },
      ];
    }
    if (filters.bhk) {
      where.bhk = Number(filters.bhk);
    }
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = Number(filters.minPrice);
      if (filters.maxPrice) where.price.lte = Number(filters.maxPrice);
    }
    if (filters.furnished === "true") {
      where.OR = [
        { description: { contains: "furnished", mode: "insensitive" } },
        { amenities: { contains: "furnished", mode: "insensitive" } },
      ];
    }
    if (filters.readyToMove === "true") {
      where.OR = [
        { status: "FOR_SALE" },
        { description: { contains: "ready to move", mode: "insensitive" } },
        { description: { contains: "ready-to-move", mode: "insensitive" } },
      ];
    }
  }

  const total = await prisma.property.count({ where });
  const items = await prisma.property.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
  });

  return {
    data: items.map(parsePropertyRecord),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getPropertyById(id: string) {
  const record = await prisma.property.findUnique({ where: { id } });
  return parsePropertyRecord(record);
}

export async function createProperty(payload: any, userId: string) {
  const data = serializePropertyPayload(payload);
  return prisma.property.create({
    data: {
      ...data,
      listedBy: {
        connect: {
          id: userId,
        },
      },
    },
  }).then(parsePropertyRecord);
}

export async function updateProperty(id: string, payload: Prisma.PropertyUpdateInput) {
  const data = serializePropertyPayload(payload);
  return prisma.property.update({ where: { id }, data: data as any }).then(parsePropertyRecord);
}

export async function deleteProperty(id: string) {
  return prisma.property.delete({ where: { id } });
}
