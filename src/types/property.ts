export type PropertyStatus = "FOR_SALE" | "FOR_RENT" | "SOLD";

export type Property = {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  state: string;
  address: string;
  propertyType: string;
  bhk: number;
  bathrooms: number;
  area: string;
  amenities: string[];
  images: string[];
  status: PropertyStatus;
  availability?: "Available" | "Not Available";
  listedById: string;
  createdAt: string;
  updatedAt: string;
};

export type PropertyFilters = {
  search?: string;
  status?: PropertyStatus | "all";
  type?: string;
  city?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  bhk?: number;
  furnished?: boolean | string;
  readyToMove?: boolean | string;
  availability?: "Available" | "Not Available" | "all";
};
