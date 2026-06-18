import { prisma } from "../../prisma/index.js";
import type { Prisma } from "@prisma/client";

function extractArea(address: string, city: string): string | null {
  if (!address) return null;
  const parts = address.split(",").map(p => p.trim());
  
  if (parts.length === 1) {
      if (parts[0].toLowerCase() === city.toLowerCase() || parts[0].length < 3) return null;
      return parts[0];
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].toLowerCase();
    if (part !== city.toLowerCase() && part !== "india" && part !== "gujarat" && part !== "maharashtra") {
        if (part.length > 3 && !part.match(/^[0-9]+$/)) {
            return parts[i];
        }
    }
  }
  return null;
}

export async function ensureLocationHierarchy(city?: string, state?: string, address?: string, tx: Prisma.TransactionClient = prisma): Promise<{ id: string, cityName: string, stateName: string }> {
  if (!city || !city.trim()) throw new Error("Validation Error: City is required");
  if (!state || !state.trim()) throw new Error("Validation Error: State is required");
  if (!address || !address.trim()) throw new Error("Validation Error: Address is required");

  const stateName = state.trim();
  const cityName = city.trim();
  
  // Extract exact locality
  let rawAreaName = extractArea(address, cityName);
  if (!rawAreaName) {
    throw new Error(`Validation Error: Could not extract Area from address: ${address}`);
  }
  const areaName = rawAreaName.charAt(0).toUpperCase() + rawAreaName.slice(1);

  let stateRec = await tx.state.findUnique({ where: { name: stateName } }) 
    || await tx.state.create({ data: { name: stateName } });

  let cityRec = await tx.city.findFirst({ where: { name: cityName, stateId: stateRec.id } })
    || await tx.city.create({ data: { name: cityName, stateId: stateRec.id } });

  let areaRec = await tx.area.findFirst({ where: { name: areaName, cityId: cityRec.id } })
    || await tx.area.create({ data: { name: areaName, cityId: cityRec.id } });

  return { id: areaRec.id, cityName, stateName };
}
