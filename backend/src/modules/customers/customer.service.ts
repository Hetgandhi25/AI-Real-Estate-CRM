import { prisma } from "../../prisma/index.js";

type ListParams = {
  page: number;
  pageSize: number;
  search?: string;
  whatsappOnly?: string | boolean;
  location?: string;
};

import { normalizePhone } from "../../common/lib/phone.utils.js";

export async function createCustomer(payload: { name: string; phone: string; email: string; budget?: number; preferredLocation?: string; notes?: string }) {
  const normalizedPhone = normalizePhone(payload.phone);
  return prisma.customer.create({ data: { ...payload, phone: normalizedPhone } as any });
}

export async function listCustomers(params: ListParams) {
  const { page, pageSize, search, whatsappOnly, location } = params;
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { preferredLocation: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  if (location) {
    where.preferredLocation = { contains: location, mode: "insensitive" };
  }

  if (whatsappOnly === "true" || whatsappOnly === true) {
    where.email = { contains: "@whatsapp.yandox.com", mode: "insensitive" };
  }

  const total = await prisma.customer.count({ where });
  const items = await prisma.customer.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
  });

  return { data: items, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 } };
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}

export async function updateCustomer(id: string, payload: Partial<{ name: string; phone: string; email: string; budget?: number; preferredLocation?: string; notes?: string }>) {
  const data = { ...payload };
  if (data.phone) {
    data.phone = normalizePhone(data.phone);
  }
  return prisma.customer.update({ where: { id }, data: data as any });
}

export async function deleteCustomer(id: string) {
  return prisma.customer.delete({ where: { id } });
}
