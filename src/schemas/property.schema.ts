import { z } from "zod";

export const propertyStatusSchema = z.enum(["For Sale", "For Rent", "Sold"]);

export const propertySchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  location: z.string().min(1),
  price: z.number().nonnegative(),
  beds: z.number().int().nonnegative(),
  area: z.string(),
  status: propertyStatusSchema,
  type: z.string(),
  gradient: z.string(),
});

export const propertyFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.union([propertyStatusSchema, z.literal("all")]).optional(),
  type: z.string().optional(),
  country: z.string().optional(),
});

export const createPropertySchema = z.object({
  title: z.string().min(3, "Title is required"),
  location: z.string().min(3, "Location is required"),
  price: z.coerce.number().positive("Price must be positive"),
  beds: z.coerce.number().int().nonnegative(),
  area: z.string().min(1),
  status: propertyStatusSchema,
  type: z.string().min(1),
});

export type CreatePropertyFormValues = z.infer<typeof createPropertySchema>;
