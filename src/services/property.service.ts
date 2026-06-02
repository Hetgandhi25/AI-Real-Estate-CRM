


import { API_ENDPOINTS, apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { env } from "@/config";
import { properties as mockProperties } from "@/lib/mock-data";
import type { PaginatedResponse, Property, PropertyFilters } from "@/types";

type StatusKey = Property["status"] | "For Sale" | "For Rent" | "Sold";

const statusMap: Record<StatusKey, Property["status"]> = {
  "For Sale": "FOR_SALE",
  "For Rent": "FOR_RENT",
  Sold: "SOLD",
  FOR_SALE: "FOR_SALE",
  FOR_RENT: "FOR_RENT",
  SOLD: "SOLD",
};


export async function getProperties(filters?: PropertyFilters): Promise<Property[]> {
  if (env.VITE_MOCK_AUTH) {
    return filterProperties(mockProperties, filters);
  }

  const raw = await apiGet<PaginatedResponse<Property>>(API_ENDPOINTS.properties.list, {
    params: normalizeFilters(filters),
  });

  return raw.data || [];
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  if (env.VITE_MOCK_AUTH) {
    return mockProperties.find((p) => p.id === id);
  }

  return apiGet<Property>(API_ENDPOINTS.properties.detail(id));
}

function normalizeFilters(filters?: PropertyFilters) {
  if (!filters) return undefined;
  return {
    search: filters.search,
    status: filters.status && filters.status !== "all" ? statusMap[filters.status] ?? filters.status : undefined,
    type: filters.type ? filters.type.toUpperCase().replace(/\s+/g, "_") : undefined,
    city: filters.city,
    location: filters.location,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    bhk: filters.bhk,
    furnished: filters.furnished,
    readyToMove: filters.readyToMove,
  };
}

function filterProperties(list: Property[], filters?: PropertyFilters): Property[] {
  if (!filters) return list;

  return list.filter((p) => {
    if (filters.status && filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.type && p.propertyType.toLowerCase() !== filters.type.toLowerCase()) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${p.title} ${p.city} ${p.state}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}





export async function createProperty(data: Partial<Property>): Promise<Property> {
  return apiPost<Property, Partial<Property>>(API_ENDPOINTS.properties.create, {
    ...data,
    price: Number(data.price ?? 0),
    propertyType: data.propertyType ?? "APARTMENT",
    status: statusMap[(data.status ?? "FOR_SALE") as StatusKey] || "FOR_SALE",
    bhk: Number(data.bhk ?? 1),
    bathrooms: Number(data.bathrooms ?? 1),
    city: data.city ?? "Unknown",
    state: data.state ?? "Unknown",
    address: data.address ?? "Not specified",
    area: data.area ?? "0 sqft",
    description: data.description ?? data.title ?? "Property listing",
    amenities: data.amenities ?? [],
    images: data.images ?? [],
  });
}

export async function updateProperty(id: string, data: Partial<Property>): Promise<Property> {
  return apiPut<Property, Partial<Property>>(API_ENDPOINTS.properties.update(id), {
    ...data,
    price: data.price !== undefined ? Number(data.price) : undefined,
    propertyType: data.propertyType,
    status: data.status ? (statusMap[data.status as StatusKey] || data.status) : undefined,
    bhk: data.bhk !== undefined ? Number(data.bhk) : undefined,
    bathrooms: data.bathrooms !== undefined ? Number(data.bathrooms) : undefined,
    amenities: data.amenities,
    images: data.images,
  });
}

export async function deleteProperty(id: string): Promise<void> {
  return apiDelete<void>(API_ENDPOINTS.properties.delete(id));
}
