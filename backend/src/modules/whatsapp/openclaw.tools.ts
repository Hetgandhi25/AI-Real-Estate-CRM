import { prisma } from "../../prisma/index.js";

// Thread-safe in-memory mutex to serialize user operations
const locks = new Map<string, Promise<any>>();

export async function acquireLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = locks.get(key);
  const nextPromise = (existing || Promise.resolve()).catch(() => {}).then(fn);
  locks.set(key, nextPromise);
  
  try {
    return await nextPromise;
  } finally {
    if (locks.get(key) === nextPromise) {
      locks.delete(key);
    }
  }
}

// UUID validation helper to prevent SQL parameter errors in PostgreSQL
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Tool 1: Search properties based on budget, city, location, type, BHK, and amenities.
 */
export async function searchProperties(params: {
  budget?: number;
  city?: string;
  location?: string;
  propertyType?: string;
  BHK?: number;
  amenities?: string;
  status?: string;
}) {
  const { budget, city, location, propertyType, BHK, amenities, status } = params;

  // budget is usually Lakhs (e.g. 80 Lakhs)
  const maxPrice = budget ? (budget < 10000 ? budget * 100000 : budget) : undefined;

  let typeFilter: any = undefined;
  if (propertyType) {
    const lowerType = propertyType.toLowerCase();
    if (lowerType === "flat" || lowerType === "apartment") {
      typeFilter = { in: ["apartment", "flat", "Apartment", "Flat", "APARTMENT", "FLAT"] };
    } else if (lowerType === "villa" || lowerType === "bungalow" || lowerType === "house") {
      typeFilter = { in: ["villa", "bungalow", "house", "Villa", "Bungalow", "House", "VILLA", "BUNGALOW", "HOUSE"] };
    } else if (lowerType === "plot" || lowerType === "land") {
      typeFilter = { in: ["plot", "land", "Plot", "Land", "PLOT", "LAND"] };
    } else {
      typeFilter = { contains: propertyType, mode: "insensitive" };
    }
  }


  const properties = await prisma.property.findMany({
    where: {
      status: status || { in: ["FOR_SALE", "FOR_RENT"] },
      price: maxPrice ? { lte: maxPrice } : undefined,
      city: city ? { contains: city, mode: "insensitive" } : undefined,
      address: location ? { contains: location, mode: "insensitive" } : undefined,
      propertyType: typeFilter,
      bhk: BHK ? BHK : undefined,
      amenities: amenities ? { contains: amenities, mode: "insensitive" } : undefined,
    },
    take: 5,
  });

  return properties.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    city: p.city,
    state: p.state,
    address: p.address,
    propertyType: p.propertyType,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    area: p.area,
    amenities: p.amenities,
    images: p.images,
    status: p.status,
  }));
}

/**
 * Tool 2: Get details of a specific property.
 */
export async function getPropertyDetails(params: { propertyId: string }) {
  const { propertyId } = params;
  if (!propertyId || !isValidUUID(propertyId)) {
    return null;
  }
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    city: p.city,
    state: p.state,
    address: p.address,
    propertyType: p.propertyType,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    area: p.area,
    amenities: p.amenities,
    images: p.images,
    status: p.status,
  };
}

/**
 * Tool 3: Register a Customer and create a Lead linked to a property.
 */
export async function createLead(params: {
  name: string;
  phone: string;
  email?: string;
  budget?: number;
  location?: string;
  propertyType?: string;
  propertyId: string;
  notes?: string;
}) {
  const { name, phone, email, budget, location, propertyType, propertyId, notes } = params;

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const cleanEmail = email || `${cleanPhone}@whatsapp.yandox.com`;
  const budgetVal = budget ? (budget < 10000 ? budget * 100000 : budget) : null;

  if (!propertyId || !isValidUUID(propertyId)) {
    throw new Error("Invalid propertyId format. Must be a valid UUID.");
  }

  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  // Find or Create Customer
  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: { endsWith: last10 } },
        { email: cleanEmail },
      ],
    },
  });

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: name || customer.name,
        budget: budgetVal || customer.budget,
        preferredLocation: location || customer.preferredLocation,
        notes: notes ? `${customer.notes || ""}\n${notes}`.trim() : customer.notes,
      },
    });
  } else {
    try {
      customer = await prisma.customer.create({
        data: {
          name: name || `WhatsApp User ${cleanPhone}`,
          phone: cleanPhone,
          email: cleanEmail,
          budget: budgetVal,
          preferredLocation: location || null,
          notes: notes || "Created automatically via WhatsApp PropertyBot.",
        },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        customer = await prisma.customer.findUnique({
          where: { email: cleanEmail },
        });
        if (!customer) throw error;
      } else {
        throw error;
      }
    }
  }

  // Check if lead already exists for this customer and property to prevent duplicates
  const existingLead = await prisma.lead.findFirst({
    where: {
      customerId: customer.id,
      propertyId,
      status: { notIn: ["LOST", "WON"] },
    },
  });

  if (existingLead) {
    const updatedLead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        notes: notes ? `${existingLead.notes || ""}\n${notes}`.trim() : existingLead.notes,
      },
      include: {
        customer: true,
        property: true,
      },
    });
    return updatedLead;
  }

  // Create Lead if it doesn't already exist
  const lead = await prisma.lead.create({
    data: {
      customerId: customer.id,
      propertyId,
      status: "NEW",
      source: "WhatsApp AI Bot",
      notes: notes || `Interested in property: ${propertyId}`,
    },
    include: {
      customer: true,
      property: true,
    },
  });

  return lead;
}

/**
 * Tool 4: Schedule a site visit appointment for a customer.
 */
export async function scheduleSiteVisit(params: {
  phone: string;
  propertyId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  notes?: string;
}) {
  const { phone, propertyId, date, time, notes } = params;
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const cleanEmail = `${cleanPhone}@whatsapp.yandox.com`;

  if (propertyId && !isValidUUID(propertyId)) {
    throw new Error("Invalid propertyId format. Must be a valid UUID.");
  }

  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  let customer = await prisma.customer.findFirst({
    where: { phone: { endsWith: last10 } },
  });

  if (!customer) {
    try {
      customer = await prisma.customer.create({
        data: {
          name: `WhatsApp User ${cleanPhone}`,
          phone: cleanPhone,
          email: cleanEmail,
          notes: "Created automatically for site visit scheduling.",
        },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        customer = await prisma.customer.findUnique({
          where: { email: cleanEmail },
        });
        if (!customer) throw error;
      } else {
        throw error;
      }
    }
  }

  let scheduledAt = new Date();
  try {
    scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      scheduledAt = new Date(`${date} ${time}`);
    }
    if (isNaN(scheduledAt.getTime())) {
      scheduledAt = new Date();
    }
  } catch (e) {
    scheduledAt = new Date();
  }
  // Set seconds and milliseconds to zero to prevent millisecond race condition duplicates
  scheduledAt.setSeconds(0, 0);

  // Check if appointment already exists for this slot to prevent duplicates
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      customerId: customer.id,
      propertyId,
      scheduledAt,
    },
  });

  if (existingAppointment) {
    const updatedAppointment = await prisma.appointment.update({
      where: { id: existingAppointment.id },
      data: {
        notes: notes ? `${existingAppointment.notes || ""}\n${notes}`.trim() : existingAppointment.notes,
      },
      include: {
        customer: true,
        property: true,
      },
    });
    return updatedAppointment;
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      propertyId,
      scheduledAt,
      status: "SCHEDULED",
      notes: notes || "Site visit scheduled via WhatsApp bot tool.",
    },
    include: {
      customer: true,
      property: true,
    },
  });

  return appointment;
}

/**
 * Tool 5: Append new messages and update AI summary in PostgreSQL.
 */
export async function saveConversation(params: {
  phone: string;
  pushName?: string;
  messages: Array<{ from: string; text: string; timestamp?: string }>;
}) {
  const { phone, pushName, messages } = params;
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const cleanEmail = `${cleanPhone}@whatsapp.yandox.com`;

  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  // Get or Create Customer
  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: { endsWith: last10 } },
        { email: cleanEmail },
      ],
    },
  });

  if (!customer) {
    try {
      customer = await prisma.customer.create({
        data: {
          name: pushName || `WhatsApp User ${cleanPhone}`,
          phone: cleanPhone,
          email: cleanEmail,
          notes: "Created automatically via WhatsApp bot.",
        },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        customer = await prisma.customer.findUnique({
          where: { email: cleanEmail },
        });
        if (!customer) throw error;
      } else {
        throw error;
      }
    }
  }

  // Get or Create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: { customerId: customer.id },
  });

  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          messages: JSON.stringify([]),
          aiSummary: "Conversation started via WhatsApp.",
        },
      });
    } catch (error: any) {
      // Fallback check if another parallel thread created the conversation
      conversation = await prisma.conversation.findFirst({
        where: { customerId: customer.id },
      });
      if (!conversation) throw error;
    }
  }

  let existing: any[] = [];
  try {
    existing = JSON.parse(conversation.messages);
    if (!Array.isArray(existing)) existing = [];
  } catch (e) {
    existing = [];
  }

  const newMessages = messages.map((m) => ({
    from: m.from,
    text: m.text,
    timestamp: m.timestamp || new Date().toISOString(),
  }));

  const updatedMessages = [...existing, ...newMessages];

  const lastUserMsg = [...updatedMessages].reverse().find((m) => m.from === "customer");
  const aiSummary = lastUserMsg
    ? `Latest: "${lastUserMsg.text.slice(0, 80)}${lastUserMsg.text.length > 80 ? "..." : ""}"`
    : conversation.aiSummary;

  const updatedConv = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: JSON.stringify(updatedMessages),
      aiSummary,
    },
  });

  // Save individual message records to SQL Message table for granular analytics
  for (const msg of newMessages) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        from: msg.from,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
      },
    });
  }

  return updatedConv;
}
