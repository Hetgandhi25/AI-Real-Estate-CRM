import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const properties = await prisma.property.findMany();
  
  const report = {
    totalProperties: properties.length,
    statesCreated: 0,
    citiesCreated: 0,
    areasCreated: 0,
    failedRecords: 0,
    duplicateMerges: 0,
    unmappedProperties: 0,
    errors: [] as string[]
  };

  const stateMap = new Map<string, string>();
  const cityMap = new Map<string, string>();
  const areaMap = new Map<string, string>();
  
  const topAreasCounts: Record<string, number> = {};

  console.log(`🚀 Starting Migration ETL... | Dry Run Mode: ${isDryRun ? "ENABLED" : "DISABLED"}`);

  try {
    // Wrap entire migration in an ACID compliant transaction
    await prisma.$transaction(async (tx) => {
      for (const p of properties) {
        
        // 1. Strict Validation (No Defaults Allowed)
        if (!p.state || p.state.trim() === "") {
          report.failedRecords++;
          report.errors.push(`[FATAL] Property ${p.id} missing State.`);
          continue;
        }
        if (!p.city || p.city.trim() === "") {
          report.failedRecords++;
          report.errors.push(`[FATAL] Property ${p.id} missing City.`);
          continue;
        }

        const stateName = p.state.trim();
        const cityName = p.city.trim();
        const rawAreaName = extractArea(p.address, cityName);

        // 2. Strict Extraction Validation (No "General Area" fallback)
        if (!rawAreaName) {
          report.failedRecords++;
          report.errors.push(`[FATAL] Property ${p.id} failed to extract Area from address: ${p.address}`);
          continue;
        }

        const areaName = rawAreaName.charAt(0).toUpperCase() + rawAreaName.slice(1);
        
        topAreasCounts[areaName] = (topAreasCounts[areaName] || 0) + 1;

        if (isDryRun) {
           // Simulate Database State
           if (!stateMap.has(stateName.toLowerCase())) {
               stateMap.set(stateName.toLowerCase(), 'mock-state');
               report.statesCreated++;
           } else { report.duplicateMerges++; }

           const cityKey = `${cityName.toLowerCase()}-${stateName.toLowerCase()}`;
           if (!cityMap.has(cityKey)) {
               cityMap.set(cityKey, 'mock-city');
               report.citiesCreated++;
           } else { report.duplicateMerges++; }

           const areaKey = `${areaName.toLowerCase()}-${cityKey}`;
           if (!areaMap.has(areaKey)) {
               areaMap.set(areaKey, 'mock-area');
               report.areasCreated++;
           } else { report.duplicateMerges++; }
           
        } else {
           // Live Database Execution
           let state = await tx.state.findUnique({ where: { name: stateName } });
           if (!state) {
               state = await tx.state.create({ data: { name: stateName } });
               report.statesCreated++;
           } else { report.duplicateMerges++; }

           let city = await tx.city.findFirst({ where: { name: cityName, stateId: state.id } });
           if (!city) {
               city = await tx.city.create({ data: { name: cityName, stateId: state.id } });
               report.citiesCreated++;
           } else { report.duplicateMerges++; }

           let area = await tx.area.findFirst({ where: { name: areaName, cityId: city.id } });
           if (!area) {
               area = await tx.area.create({ data: { name: areaName, cityId: city.id } });
               report.areasCreated++;
           } else { report.duplicateMerges++; }

           await tx.property.update({
               where: { id: p.id },
               data: { locationId: area.id }
           });
        }
      }

      // If dry-run, explicitly throw to discard the transaction
      if (isDryRun) throw new Error("DRY_RUN_ROLLBACK");

    }, { timeout: 60000 }); // 60s timeout for transaction safety

  } catch (error: any) {
    if (error.message === "DRY_RUN_ROLLBACK") {
      console.log("\n🛡️  Dry run complete. Transaction safely discarded from PostgreSQL.");
    } else {
      console.error("\n❌ CRITICAL MIGRATION FAILURE. Transaction rolled back.", error);
      throw error;
    }
  }

  // 3. Post-Execution Unmapped Audit
  if (!isDryRun) {
    report.unmappedProperties = await prisma.property.count({ where: { locationId: null } });
  } else {
    report.unmappedProperties = report.failedRecords;
  }
  
  const sortedTopAreas = Object.entries(topAreasCounts).sort((a,b) => b[1] - a[1]).slice(0,10);

  console.log("\n================ MIGRATION REPORT ================");
  console.log(JSON.stringify({...report, topExtractedAreas: sortedTopAreas.map(a => `${a[0]} (${a[1]})`) }, null, 2));
  console.log("==================================================\n");
}

main().finally(() => prisma.$disconnect());
