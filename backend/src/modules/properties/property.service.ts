import { prisma } from "../../prisma/index.js";
import type { Prisma } from "@prisma/client";
import { ensureLocationHierarchy } from "./location.utils.js";
import { mapPropertyToDTO } from "./property.mapper.js";

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
  const dto = mapPropertyToDTO(record);
  return {
    ...dto,
    amenities: typeof dto.amenities === "string" ? JSON.parse(dto.amenities) : dto.amenities,
    images: typeof dto.images === "string" ? JSON.parse(dto.images) : dto.images,
  };
}

const STRICT_PROPERTY_SELECT = {
  id: true, title: true, description: true, price: true, propertyType: true,
  bhk: true, bathrooms: true, amenities: true, images: true, status: true,
  featured: true, availability: true, listedById: true, createdAt: true, updatedAt: true,
  city: true, state: true, address: true, area: true, // Legacy fields
  location: { select: { name: true, city: { select: { name: true, state: { select: { name: true } } } } } }
};

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
        { location: { city: { name: { contains: q, mode: "insensitive" } } } },
        { location: { city: { state: { name: { contains: q, mode: "insensitive" } } } } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }
    if (filters.city) {
      where.location = { city: { name: { contains: String(filters.city), mode: "insensitive" } } };
    }
    if (filters.state) {
      where.location = { ...where.location, city: { ...where.location?.city, state: { name: { contains: String(filters.state), mode: "insensitive" } } } } as any;
    }
    if (filters.location) {
      const loc = String(filters.location);
      where.OR = [
        ...(where.OR || []),
        { location: { city: { name: { contains: loc, mode: "insensitive" } } } },
        { location: { city: { state: { name: { contains: loc, mode: "insensitive" } } } } },
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
        ...(where.OR || []),
        { description: { contains: "furnished", mode: "insensitive" } },
        { amenities: { contains: "furnished", mode: "insensitive" } },
      ];
    }
    if (filters.readyToMove === "true") {
      where.OR = [
        ...(where.OR || []),
        { status: "FOR_SALE" },
        { description: { contains: "ready to move", mode: "insensitive" } },
        { description: { contains: "ready-to-move", mode: "insensitive" } },
      ];
    }
  }

  const total = await prisma.property.count({ where });
  const items = await prisma.property.findMany({
    where,
    select: STRICT_PROPERTY_SELECT,
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
  const record = await prisma.property.findUnique({ 
    where: { id },
    select: STRICT_PROPERTY_SELECT 
  });
  return parsePropertyRecord(record);
}

export async function createProperty(payload: any, userId: string) {
  const data = serializePropertyPayload(payload);
  
  return prisma.$transaction(async (tx) => {
    // Resolve Hierarchy for Dual-Write
    const { id: locationId, cityName: resolvedCity, stateName: resolvedState } = await ensureLocationHierarchy(data.city, data.state, data.address, tx);

    const result = await tx.property.create({
      data: {
        ...data,
        city: resolvedCity,
        state: resolvedState,
        location: {
          connect: { id: locationId }
        },
        listedBy: {
          connect: {
            id: userId,
          },
        },
      },
      select: STRICT_PROPERTY_SELECT
    });
    return parsePropertyRecord(result);
  });
}

export async function updateProperty(id: string, payload: Prisma.PropertyUpdateInput) {
  const data = serializePropertyPayload(payload);
  
  return prisma.$transaction(async (tx) => {
    // Check if we need to update locationId
    let locationId = undefined;
    let resolvedCity = undefined;
    let resolvedState = undefined;
    
    if (data.city !== undefined || data.state !== undefined || data.address !== undefined) {
      const existing = await tx.property.findUnique({ where: { id } });
      if (existing) {
         const res = await ensureLocationHierarchy(
           data.city !== undefined ? String(data.city) : existing.city,
           data.state !== undefined ? String(data.state) : existing.state,
           data.address !== undefined ? String(data.address) : existing.address,
           tx
         );
         locationId = res.id;
         resolvedCity = res.cityName;
         resolvedState = res.stateName;
      }
    }

    const result = await tx.property.update({ 
      where: { id }, 
      data: { 
        ...data,
        ...(locationId ? { location: { connect: { id: locationId } }, city: resolvedCity, state: resolvedState } : {})
      } as any,
      select: STRICT_PROPERTY_SELECT
    });
    return parsePropertyRecord(result);
  });
}

export async function deleteProperty(id: string) {
  return prisma.property.delete({ where: { id } });
}
