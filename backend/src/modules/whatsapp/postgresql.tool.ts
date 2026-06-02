import { prisma } from "../../prisma/index.js";

// ─────────────────────────────────────────────────────────────
// CITY → LOCALITY MAP
// ─────────────────────────────────────────────────────────────
const CITY_TO_LOCALITIES: Record<string, string[]> = {
  ahmedabad: [
    "gota", "satellite", "vastral", "chandkheda", "bopal",
    "maninagar", "navrangpura", "prahlad nagar", "sg highway",
    "thaltej", "vejalpur", "naranpura", "nikol", "naroda", "isanpur"
  ],
  mumbai: [
    "andheri", "bandra", "borivali", "dadar", "goregaon",
    "kandivali", "malad", "thane", "powai", "worli"
  ],
  delhi: [
    "dwarka", "rohini", "saket", "vasant kunj", "janakpuri",
    "lajpat nagar", "hauz khas"
  ],
  gurgaon: [
    "dlf phase 1", "dlf phase 2", "dlf phase 5",
    "sector 56", "sector 57", "sohna road", "golf course road"
  ],
  pune: [
    "baner", "hinjewadi", "kothrud", "viman nagar",
    "wakad", "aundh", "pimple"
  ]
};

// ─────────────────────────────────────────────────────────────
// COMPLETE TYPE MAP
// ─────────────────────────────────────────────────────────────
const TYPE_MAP: Record<string, string> = {
  apartment: "flat",
  flat: "flat",
  flats: "flat",
  apartments: "flat",
  house: "villa",
  villa: "villa",
  villas: "villa",
  bungalow: "villa",
  bungalows: "villa",
  independent: "villa",
  plot: "plot",
  plots: "plot",
  land: "plot",
  lands: "plot",
  rowhouse: "rowhouse",
  "row house": "rowhouse",
  "row-house": "rowhouse",
  townhouse: "rowhouse",
  "town house": "rowhouse",
  penthouse: "penthouse",
  penthouses: "penthouse",
  studio: "studio",
  duplex: "duplex",
  farmhouse: "farmhouse",
  "farm house": "farmhouse",
  office: "__unknown__",
  shop: "__unknown__",
  commercial: "__unknown__",
  warehouse: "__unknown__",
  showroom: "__unknown__",
  godown: "__unknown__",
  shed: "__unknown__"
};

// ─────────────────────────────────────────────────────────────
// INTENT SIGNAL WORDS
// ─────────────────────────────────────────────────────────────
const INTENT_WORDS = new Set([
  "flat", "apartment", "villa", "house", "bungalow", "plot", "land",
  "rowhouse", "row", "penthouse", "studio", "duplex", "farmhouse",
  "property", "properties", "home", "homes", "residence",
  "show", "find", "search", "looking", "need", "want", "get",
  "list", "available", "buy", "purchase", "invest", "investment",
  "lakh", "lac", "crore", "cr", "price", "budget", "cost", "affordable",
  "cheap", "expensive", "rate",
  "bhk", "bedroom", "sqft", "sqfeet", "sq", "feet", "area",
  "in", "at", "near", "location", "locality", "area",
  "above", "below", "under", "over", "between", "upto", "max", "min",
  "more", "less", "greater", "ready", "move"
]);

interface SearchFilters {
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  type: string | null;
  locations: string[];
  availableOnly: boolean;
}

interface PropertyRow {
  Property_ID: string;
  Location: string;
  Size_sqft: number;
  Type: string;
  Price_Lakh: number;
  Bedrooms: number;
  Available: string;
  originalProperty?: any;
}

// ─────────────────────────────────────────────────────────────
// INTENT GATE
// ─────────────────────────────────────────────────────────────
function hasPropertyIntent(query: string, filters: SearchFilters): boolean {
  if (
    filters.bedrooms !== null ||
    filters.type !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.locations.length > 0
  ) {
    return true;
  }
  const words = query.toLowerCase().split(/\s+/);
  const matchCount = words.filter(w => INTENT_WORDS.has(w)).length;
  return matchCount >= 1;
}

// ─────────────────────────────────────────────────────────────
// LEVENSHTEIN DISTANCE
// ─────────────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(a: string, b: string): boolean {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  const threshold = Math.floor(Math.max(a.length, b.length) / 4);
  return levenshtein(a, b) <= threshold;
}

// ─────────────────────────────────────────────────────────────
// LOCATION RESOLVER
// ─────────────────────────────────────────────────────────────
function resolveLocations(queryLocation: string, inventoryLocations: string[]): string[] {
  const q = queryLocation.toLowerCase().trim();
  const resolved = new Set<string>();

  if (CITY_TO_LOCALITIES[q]) {
    CITY_TO_LOCALITIES[q].forEach(loc => resolved.add(loc));
    resolved.add(q);
    return Array.from(resolved);
  }

  inventoryLocations.forEach(loc => {
    if (loc === q) resolved.add(loc);
    if (fuzzyMatch(q, loc)) resolved.add(loc);
    if (loc.includes(q) || q.includes(loc)) resolved.add(loc);
  });

  inventoryLocations.forEach(loc => {
    const locWords = loc.split(" ");
    const queryWords = q.split(" ");
    const allMatch = queryWords.every(qw => locWords.some(lw => fuzzyMatch(qw, lw)));
    if (allMatch) resolved.add(loc);
  });

  if (resolved.size === 0) resolved.add(q);
  return Array.from(resolved);
}

// ─────────────────────────────────────────────────────────────
// FILTER EXTRACTOR
// ─────────────────────────────────────────────────────────────
function extractFilters(query: string, inventoryLocations: string[]): SearchFilters {
  const q = query.toLowerCase();

  const filters: SearchFilters = {
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    type: null,
    locations: [],
    availableOnly: true
  };

  // ── BHK ──────────────────────────────────────────────────
  const bhkMatch = q.match(/(\d+)\s*bhk/);
  if (bhkMatch) filters.bedrooms = parseInt(bhkMatch[1]);

  // ── PRICE PARSING ─────────────────────────────────────────
  const underRx = /(under|below|less\s+than|upto|up\s+to|max(?:imum)?|within)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|cr(?:ore)?|l)\b/i;
  const aboveRx = /(above|more\s+than|greater\s+than|over|min(?:imum)?|atleast|at\s+least)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|cr(?:ore)?|l)\b/i;
  const standalonePriceRx = /(?:^|[\s,])(\d+(?:\.\d+)?)\s*(lakh|lac|cr(?:ore)?)\b/gi;
  const rangeRx = /between\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|cr(?:ore)?|l)?/i;

  const underMatch = q.match(underRx);
  const aboveMatch = q.match(aboveRx);
  const rangeMatch = q.match(rangeRx);

  function toLakh(val: number, unit: string) {
    const u = (unit || "").toLowerCase().replace(/\s+/g, "");
    if (u === "cr" || u === "crore") return val * 100;
    return val;
  }

  if (rangeMatch) {
    let lo = parseFloat(rangeMatch[1]);
    let hi = parseFloat(rangeMatch[2]);
    const unit = rangeMatch[3] || "";
    lo = toLakh(lo, unit);
    hi = toLakh(hi, unit);
    filters.minPrice = lo - 1;
    filters.maxPrice = hi + 1;
  } else {
    if (underMatch) filters.maxPrice = toLakh(parseFloat(underMatch[2]), underMatch[3]);
    if (aboveMatch) filters.minPrice = toLakh(parseFloat(aboveMatch[2]), aboveMatch[3]);
  }

  if (filters.minPrice === null && filters.maxPrice === null) {
    let standaloneMatch;
    const candidates = [];
    while ((standaloneMatch = standalonePriceRx.exec(q)) !== null) {
      candidates.push({
        val: toLakh(parseFloat(standaloneMatch[1]), standaloneMatch[2]),
        raw: standaloneMatch[0].trim()
      });
    }
    if (candidates.length === 1) {
      const target = candidates[0].val;
      filters.minPrice = target * 0.70 - 1;
      filters.maxPrice = target * 1.30 + 1;
    } else if (candidates.length >= 2) {
      const lo = Math.min(...candidates.map(c => c.val));
      const hi = Math.max(...candidates.map(c => c.val));
      filters.minPrice = lo - 1;
      filters.maxPrice = hi + 1;
    }
  }

  // ── PROPERTY TYPE ─────────────────────────────────────────
  const sortedTypeKeys = Object.keys(TYPE_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedTypeKeys) {
    if (q.includes(keyword)) {
      filters.type = TYPE_MAP[keyword];
      break;
    }
  }

  // ── LOCATION ──────────────────────────────────────────────
  const sortedInventoryLocations = [...inventoryLocations].sort(
    (a, b) => b.length - a.length
  );

  let detectedLocation = null;

  for (const loc of sortedInventoryLocations) {
    if (q.includes(loc)) { detectedLocation = loc; break; }
  }

  if (!detectedLocation) {
    const queryWords = q.split(/\s+/);
    outer: for (const qw of queryWords) {
      if (qw.length < 3) continue;
      for (const loc of sortedInventoryLocations) {
        if (fuzzyMatch(qw, loc)) { detectedLocation = qw; break outer; }
      }
    }
  }

  if (!detectedLocation) {
    for (const city of Object.keys(CITY_TO_LOCALITIES)) {
      if (q.includes(city)) { detectedLocation = city; break; }
    }
  }

  if (detectedLocation) {
    filters.locations = resolveLocations(detectedLocation, inventoryLocations);
  }

  return filters;
}

// ─────────────────────────────────────────────────────────────
// RELEVANCE SCORER
// ─────────────────────────────────────────────────────────────
function scoreRow(row: PropertyRow, filters: SearchFilters, queryHint: string | null): number {
  let score = 0;
  const price = Number(row.Price_Lakh);
  const bedrooms = Number(row.Bedrooms);
  const rowLoc = String(row.Location).toLowerCase().trim();
  const rowType = String(row.Type).toLowerCase().trim();

  if (filters.bedrooms && bedrooms === filters.bedrooms) score += 30;
  if (filters.type && filters.type !== "__unknown__" && rowType === filters.type) score += 25;

  if (filters.locations.length > 0) {
    const exact = filters.locations.some(loc => rowLoc === loc);
    const fuzzy = filters.locations.some(loc => rowLoc.includes(loc) || loc.includes(rowLoc));
    if (exact) score += 20;
    else if (fuzzy) score += 10;
  }

  if (filters.maxPrice && price < filters.maxPrice) {
    const gap = filters.maxPrice - price;
    if (gap <= filters.maxPrice * 0.1) score += 15;
    else if (gap <= filters.maxPrice * 0.25) score += 8;
    else score += 3;
  }
  if (filters.minPrice && price > filters.minPrice) {
    const gap = price - filters.minPrice;
    if (gap <= filters.minPrice * 0.1) score += 15;
    else if (gap <= filters.minPrice * 0.25) score += 8;
    else score += 3;
  }

  if (queryHint) {
    const ignoreWords = new Set([
      "i", "need", "want", "looking", "for", "a", "in", "under", "above", "greater",
      "than", "less", "more", "property", "properties", "show", "me", "find", "the",
      "of", "and", "or", "bhk", "lakh", "lac", "spacious", "affordable", "good",
      "nice", "family", "investment", "budget", "cheap", "best", "new", "my",
      "please", "get", "available", "ready", "move"
    ]);
    const combinedText = [row.Location, row.Type, row.Bedrooms, row.Price_Lakh].join(" ").toLowerCase();
    queryHint.toLowerCase().split(/\s+/)
      .filter(w => !ignoreWords.has(w) && w.length > 2)
      .forEach(word => { if (combinedText.includes(word)) score += 2; });
  }

  return score;
}

// ─────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────
function deduplicate(rows: PropertyRow[]): PropertyRow[] {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = [
      String(row.Location).toLowerCase().trim(),
      String(row.Type).toLowerCase().trim(),
      String(row.Bedrooms),
      String(row.Price_Lakh)
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// FETCH ACTIVE PROPERTIES FROM POSTGRESQL & MAP
// ─────────────────────────────────────────────────────────────
async function loadDbProperties(): Promise<{ rows: PropertyRow[]; inventoryLocations: string[] }> {
  // Query all active/for-sale properties from PostgreSQL
  const dbProperties = await prisma.property.findMany({
    where: {
      status: "FOR_SALE"
    }
  });

  const rows: PropertyRow[] = dbProperties.map(prop => ({
    Property_ID: prop.id,
    Location: prop.address ? prop.address.trim() : prop.city.trim(),
    Size_sqft: parseInt(prop.area) || 0,
    Type: (() => {
      const t = prop.propertyType.toLowerCase();
      if (t === "apartment") return "flat";
      if (t === "bungalow" || t === "house") return "villa";
      if (t === "land") return "plot";
      return t;
    })(),
    Price_Lakh: prop.price / 100000,
    Bedrooms: prop.bhk,
    Available: prop.status === "FOR_SALE" ? "Yes" : "No",
    originalProperty: prop
  }));

  const inventoryLocations: string[] = [];
  rows.forEach(row => {
    if (row.Location) {
      const loc = String(row.Location).toLowerCase().trim();
      if (!inventoryLocations.includes(loc)) inventoryLocations.push(loc);
    }
  });

  return { rows, inventoryLocations };
}

// ─────────────────────────────────────────────────────────────
// DEBUG PRINTER
// ─────────────────────────────────────────────────────────────
function debugFilters(label: string, filters: SearchFilters) {
  console.log("\n" + "═".repeat(50));
  console.log("📩 Source    :", label);
  console.log("─".repeat(50));
  console.log("🛏  Bedrooms  :", filters.bedrooms ?? "not specified");
  console.log("🏢 Type      :", filters.type ?? "not specified");
  console.log("💰 Min Price :", filters.minPrice !== null ? `₹${filters.minPrice} Lakh (strict >)` : "not specified");
  console.log("💰 Max Price :", filters.maxPrice !== null ? `₹${filters.maxPrice} Lakh (strict <)` : "not specified");
  console.log("📍 Locations :", filters.locations.length > 0 ? filters.locations.join(", ") : "not specified (search all)");
  console.log("✅ Available :", filters.availableOnly ? "Yes only" : "all");
  console.log("═".repeat(50) + "\n");
}

// ─────────────────────────────────────────────────────────────
// SHARED FILTER EXECUTION CORE
// ─────────────────────────────────────────────────────────────
function _runSearch(
  filters: SearchFilters,
  rows: PropertyRow[],
  inventoryLocations: string[],
  queryHint: string | null
): any[] {
  // Resolve city names in filters.locations that haven't been expanded yet
  if (filters.locations.length > 0) {
    const expanded = new Set<string>();
    for (const loc of filters.locations) {
      const resolved = resolveLocations(loc, inventoryLocations);
      resolved.forEach(r => expanded.add(r));
    }
    filters = { ...filters, locations: Array.from(expanded) };
  }

  debugFilters(queryHint || "filter object", filters);

  // Hard type block — unknown type sentinel → 0 results
  if (filters.type === "__unknown__") {
    console.log("[postgresqlTool] Requested type not in inventory category — returning empty");
    return [];
  }

  const filtered = rows.filter(row => {
    // 1. Availability
    if (filters.availableOnly && row.Available.toLowerCase() !== "yes") return false;

    // 2. BHK exact match
    if (filters.bedrooms !== null && row.Bedrooms !== filters.bedrooms) return false;

    // 3. Type exact match
    if (filters.type !== null && row.Type !== filters.type) return false;

    // 4. Location match (fuzzy, contains, exact)
    if (filters.locations.length > 0) {
      const rowLoc = row.Location.toLowerCase().trim();
      const locationMatched = filters.locations.some(loc =>
        rowLoc === loc ||
        rowLoc.includes(loc) ||
        loc.includes(rowLoc) ||
        fuzzyMatch(rowLoc, loc)
      );
      if (!locationMatched) return false;
    }

    // 5. Max price — STRICT <
    if (filters.maxPrice !== null && row.Price_Lakh >= filters.maxPrice) return false;

    // 6. Min price — STRICT >
    if (filters.minPrice !== null && row.Price_Lakh <= filters.minPrice) return false;

    return true;
  });

  const deduped = deduplicate(filtered);
  const scored = deduped
    .map(row => ({ row, score: scoreRow(row, filters, queryHint) }))
    .sort((a, b) => b.score - a.score);

  // Return the original DB properties rather than in-memory mappings
  return scored.slice(0, 5).map(item => item.row.originalProperty);
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API 1 — searchInventoryByFilters(filters)
// ─────────────────────────────────────────────────────────────
export async function searchInventoryByFilters(filters: any): Promise<any[]> {
  const { rows, inventoryLocations } = await loadDbProperties();
  return _runSearch(filters, rows, inventoryLocations, null);
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API 2 — searchInventory(query)
// ─────────────────────────────────────────────────────────────
export async function searchInventory(query: string): Promise<any[]> {
  const { rows, inventoryLocations } = await loadDbProperties();
  const filters = extractFilters(query, inventoryLocations);

  // Intent gate — gibberish returns empty
  if (!hasPropertyIntent(query, filters)) {
    console.log("[postgresqlTool] Query failed intent gate — returning empty");
    return [];
  }

  return _runSearch(filters, rows, inventoryLocations, query);
}
