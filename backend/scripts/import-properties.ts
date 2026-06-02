import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

const cityMap: Record<string, { city: string; state: string }> = {
  gota: { city: "Ahmedabad", state: "Gujarat" },
  satellite: { city: "Ahmedabad", state: "Gujarat" },
  vastral: { city: "Ahmedabad", state: "Gujarat" },
  chandkheda: { city: "Ahmedabad", state: "Gujarat" },
  bopal: { city: "Ahmedabad", state: "Gujarat" },
  maninagar: { city: "Ahmedabad", state: "Gujarat" },
  navrangpura: { city: "Ahmedabad", state: "Gujarat" },
  "prahlad nagar": { city: "Ahmedabad", state: "Gujarat" },
  "sg highway": { city: "Ahmedabad", state: "Gujarat" },
  thaltej: { city: "Ahmedabad", state: "Gujarat" },
  vejalpur: { city: "Ahmedabad", state: "Gujarat" },
  naranpura: { city: "Ahmedabad", state: "Gujarat" },
  nikol: { city: "Ahmedabad", state: "Gujarat" },
  naroda: { city: "Ahmedabad", state: "Gujarat" },
  isanpur: { city: "Ahmedabad", state: "Gujarat" },
  andheri: { city: "Mumbai", state: "Maharashtra" },
  bandra: { city: "Mumbai", state: "Maharashtra" },
  borivali: { city: "Mumbai", state: "Maharashtra" },
  dadar: { city: "Mumbai", state: "Maharashtra" },
  goregaon: { city: "Mumbai", state: "Maharashtra" },
  kandivali: { city: "Mumbai", state: "Maharashtra" },
  malad: { city: "Mumbai", state: "Maharashtra" },
  thane: { city: "Mumbai", state: "Maharashtra" },
  powai: { city: "Mumbai", state: "Maharashtra" },
  worli: { city: "Mumbai", state: "Maharashtra" },
  dwarka: { city: "Delhi", state: "Delhi" },
  rohini: { city: "Delhi", state: "Delhi" },
  saket: { city: "Delhi", state: "Delhi" },
  "vasant kunj": { city: "Delhi", state: "Delhi" },
  janakpuri: { city: "Delhi", state: "Delhi" },
  "lajpat nagar": { city: "Delhi", state: "Delhi" },
  "hauz khas": { city: "Delhi", state: "Delhi" },
  "dlf phase 1": { city: "Gurgaon", state: "Haryana" },
  "dlf phase 2": { city: "Gurgaon", state: "Haryana" },
  "dlf phase 5": { city: "Gurgaon", state: "Haryana" },
  "sector 56": { city: "Gurgaon", state: "Haryana" },
  "sector 57": { city: "Gurgaon", state: "Haryana" },
  "sohna road": { city: "Gurgaon", state: "Haryana" },
  "golf course road": { city: "Gurgaon", state: "Haryana" },
  baner: { city: "Pune", state: "Maharashtra" },
  hinjewadi: { city: "Pune", state: "Maharashtra" },
  kothrud: { city: "Pune", state: "Maharashtra" },
  "viman nagar": { city: "Pune", state: "Maharashtra" },
  wakad: { city: "Pune", state: "Maharashtra" },
  aundh: { city: "Pune", state: "Maharashtra" }
};

interface ExcelPropertyRow {
  Property_ID: string;
  Location: string;
  Size_sqft: number;
  Type: string;
  Price_Lakh: number;
  Bedrooms: number;
  Available: string;
}

async function main() {
  console.log("🚀 Starting property import from Excel to PostgreSQL...");

  // 1. Get default Agent
  const agentUser = await prisma.user.findFirst({
    where: { email: "agent@yandoxcrm.com" }
  });

  if (!agentUser) {
    console.error("❌ Could not find agent user (agent@yandoxcrm.com) to list properties under!");
    process.exit(1);
  }

  console.log(`👤 Mapped listing agent: ${agentUser.name} (${agentUser.id})`);

  // 2. Read the Excel File
  const excelPath = "D:/openclaw-system/data/property_inventory.xlsx";
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelPropertyRow>(sheet);

  console.log(`📊 Found ${rows.length} property rows in Excel sheet.`);

  let importedCount = 0;
  for (const row of rows) {
    const locLower = String(row.Location).toLowerCase().trim();
    const mapping = cityMap[locLower] || { city: "Ahmedabad", state: "Gujarat" };

    // Standardize type to uppercase (e.g. flat -> FLAT, townhouse -> TOWNHOUSE)
    let dbType = String(row.Type).toUpperCase().trim();
    if (dbType === "FLAT") dbType = "APARTMENT"; // Align with CRM schema types

    // Mapped properties
    const title = `${row.Bedrooms} BHK ${row.Type} in ${row.Location}`;
    const description = `A beautiful and spacious ${row.Bedrooms} BHK ${row.Type} located in the prime locality of ${row.Location}, ${mapping.city}. Features include modern design and easy accessibility.`;
    const price = row.Price_Lakh * 100000; // Lakhs to absolute INR
    const area = `${row.Size_sqft} sqft`;
    const status = row.Available.trim() === "Yes" ? "FOR_SALE" : "SOLD";

    // Upsert by title and location combination to avoid duplicates
    await prisma.property.create({
      data: {
        title,
        description,
        price,
        city: mapping.city,
        state: mapping.state,
        address: row.Location.trim(), // Local address = Location (e.g. Gota)
        propertyType: dbType,
        bhk: Number(row.Bedrooms) || 0,
        bathrooms: Math.max(1, Number(row.Bedrooms) - 1 || 1), // Heuristic bathrooms
        area,
        amenities: JSON.stringify(["Parking", "Security", "Water Supply", "Lift"]),
        images: JSON.stringify([]),
        status,
        featured: Math.random() > 0.8, // Mark some as featured randomly
        listedById: agentUser.id
      }
    });

    importedCount++;
  }

  console.log(`✅ Successfully imported ${importedCount} properties to PostgreSQL database.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
