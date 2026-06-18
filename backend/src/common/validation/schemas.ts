import { z } from "zod";

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

// Customer Schemas
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email("Invalid email format"),
  budget: z.number().optional(),
  preferredLocation: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional(),
  budget: z.number().optional(),
  preferredLocation: z.string().optional(),
  notes: z.string().optional(),
});

// Property Schemas
export const createPropertySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  address: z.string().min(1, "Address is required"),
  propertyType: z.string().min(1, "Property type is required"),
  bhk: z.number().min(0, "BHK must be 0 or more"),
  bathrooms: z.number().min(0, "Bathrooms must be 0 or more"),
  area: z.string().min(1, "Area is required"),
  amenities: z.any().optional(),
  images: z.any().optional(),
  status: z.string().min(1, "Status is required"),
  featured: z.boolean().optional(),
  availability: z.string().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// Lead Schemas
export const createLeadSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  propertyId: z.string().uuid("Invalid property ID"),
  source: z.string().min(1, "Source is required"),
  notes: z.string().optional(),
  assignedAgentId: z.string().uuid("Invalid agent ID").optional().nullable(),
  status: z.string().optional(),
});

export const updateLeadSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  assignedAgentId: z.string().uuid().optional().nullable(),
});

// Appointment Schemas
export const createAppointmentSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  propertyId: z.string().uuid("Invalid property ID").optional().nullable(),
  assignedAgentId: z.string().uuid("Invalid agent ID").optional().nullable(),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date string",
  }),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();
