const SESSION_TTL_MS = 10 * 60 * 1000;

export interface FieldDefinition {
  key: string;
  required: boolean;
  question: string;
  parse: (text: string) => any;
}

export const FIELDS: FieldDefinition[] = [
  {
    key: "type",
    required: true,
    question: "🏢 What type of property are you looking for?\n\n• Flat / Apartment\n• Villa / House / Bungalow\n• Plot / Land\n• Row House\n• Penthouse\n• Duplex\n• Studio\n\nJust type the property type.",
    parse: parseType
  },
  {
    key: "location",
    required: true,
    question: "📍 Which city or locality are you interested in?\n\nFor example: *Ahmedabad*, *Gota*, *Satellite*, *Mumbai*, *Pune*",
    parse: parseLocation
  },
  {
    key: "bedrooms",
    required: false,
    question: "🛏️ How many bedrooms (BHK) do you need?\n\nFor example: *1 BHK*, *2 BHK*, *3 BHK*\n\nOr reply *any* / *skip* to see all configurations.",
    parse: parseBedrooms
  },
  {
    key: "budget",
    required: false,
    question: "💰 What is your budget?\n\nYou can say things like:\n• *under 70 lakhs*\n• *above 1 crore*\n• *between 40 and 80 lakhs*\n• *50 lakhs*\n• *1.5 crores*\n\nOr reply *any* / *skip* for no budget filter.",
    parse: parseBudget
  }
];

// ─────────────────────────────────────────────────────────────
// TYPE PARSER
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
  rowhouse: "rowhouse",
  "row house": "rowhouse",
  "row-house": "rowhouse",
  townhouse: "rowhouse",
  penthouse: "penthouse",
  penthouses: "penthouse",
  studio: "studio",
  duplex: "duplex",
  farmhouse: "farmhouse",
  "farm house": "farmhouse"
};

function parseType(text: string) {
  const q = text.toLowerCase().trim();
  const sortedKeys = Object.keys(TYPE_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (q.includes(keyword)) {
      return { value: TYPE_MAP[keyword], confidence: "high" };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// LOCATION PARSER
// ─────────────────────────────────────────────────────────────
import { prisma } from "../../prisma/index.js";

let KNOWN_CITIES = [
  "ahmedabad", "mumbai", "delhi", "pune", "gurgaon", "bangalore",
  "hyderabad", "chennai", "kolkata", "surat", "vadodara"
];

// Async IIFE to fetch cities dynamically without blocking exports
(async () => {
  try {
    const cities = await prisma.city.findMany({ select: { name: true } });
    if (cities && cities.length > 0) {
      KNOWN_CITIES = cities.map(c => c.name.toLowerCase());
    }
  } catch (e) {
    // ignore
  }
})();

const KNOWN_LOCALITIES = [
  "gota", "satellite", "vastral", "chandkheda", "bopal", "maninagar",
  "navrangpura", "prahlad nagar", "sg highway", "thaltej", "vejalpur",
  "naranpura", "nikol", "naroda", "isanpur", "shela", "shilaj", "ghuma",
  "andheri", "bandra", "borivali", "dadar", "goregaon",
  "kandivali", "malad", "thane", "powai", "worli",
  "dwarka", "rohini", "saket", "vasant kunj", "janakpuri",
  "baner", "hinjewadi", "kothrud", "viman nagar", "wakad", "aundh"
];

const LOCATION_DISQUALIFY_TOKENS = new Set([
  "flat", "flats", "apartment", "apartments", "villa", "villas",
  "bungalow", "bungalows", "plot", "plots", "land", "house",
  "rowhouse", "row", "penthouse", "studio", "duplex", "farmhouse",
  "property", "properties", "home", "homes",
  "bhk", "bedroom", "bedrooms", "br",
  "lakh", "lakhs", "lac", "lacs", "crore", "crores", "cr",
  "under", "below", "above", "over", "between", "upto", "within",
  "budget", "price", "cost", "affordable", "cheap", "max", "min",
  "rs", "inr",
  "want", "need", "looking", "find", "search", "buy", "invest",
  "show", "get", "give", "tell",
  "i", "me", "my", "a", "an", "the", "for", "is", "are",
  "please", "hi", "hello", "hey"
]);

function isCleanLocationPhrase(text: string): boolean {
  const tokens = text.toLowerCase().trim().split(/[\s,]+/);
  for (const t of tokens) {
    if (t.length === 0) continue;
    if (/^\d+$/.test(t)) return false;
    if (/^\d+(\.\d+)?$/.test(t)) return false;
    if (LOCATION_DISQUALIFY_TOKENS.has(t)) return false;
  }
  const meaningful = tokens.filter(
    t => t.length >= 3 && !LOCATION_DISQUALIFY_TOKENS.has(t)
  );
  return meaningful.length > 0;
}

function parseLocation(text: string) {
  const q = text.toLowerCase().trim();
  const cleaned = q
    .replace(/^(in|at|near|around|i\s+want\s+in|looking\s+in|looking\s+for\s+in)\s+/i, "")
    .trim();

  // 1. Try known localities
  const sortedLocalities = [...KNOWN_LOCALITIES].sort((a, b) => b.length - a.length);
  for (const loc of sortedLocalities) {
    if (cleaned.includes(loc) || q.includes(loc)) {
      return { value: loc, confidence: "high" };
    }
  }

  // 2. Try known cities
  for (const city of KNOWN_CITIES) {
    if (cleaned.includes(city) || q.includes(city)) {
      return { value: city, confidence: "high" };
    }
  }

  // 3. Fuzzy match
  const words = cleaned.split(/[\s,]+/).filter(w => w.length >= 3);
  for (const word of words) {
    for (const loc of sortedLocalities) {
      if (fuzzyLocationMatch(word, loc)) {
        return { value: loc, confidence: "medium" };
      }
    }
    for (const city of KNOWN_CITIES) {
      if (fuzzyLocationMatch(word, city)) {
        return { value: city, confidence: "medium" };
      }
    }
  }

  // 4. GENERAL FALLBACK — Strategy A: word(s) after preposition
  const afterPrepMatch = q.match(
    /\b(?:in|at|near|around)\s+([a-z][a-z\s]{1,30})(?:\s+(?:under|below|above|over|between|upto|bhk|lakh|lac|crore|cr|rs|inr|below|budget)|$)/i
  );
  if (afterPrepMatch) {
    const candidate = afterPrepMatch[1].trim();
    const candidateWords = candidate.split(/\s+/).filter(w => w.length >= 2);
    const allClean = candidateWords.length > 0 &&
      candidateWords.every(w => !LOCATION_DISQUALIFY_TOKENS.has(w) && !/^\d/.test(w));
    if (allClean) {
      return { value: candidate, confidence: "low" };
    }
  }

  // 4b. Strategy A (simpler regex fallback)
  const simplePrepMatch = q.match(/\b(?:in|at|near|around)\s+([a-z][a-z\s]{1,25})$/i);
  if (simplePrepMatch) {
    const candidate = simplePrepMatch[1].trim();
    const candidateWords = candidate.split(/\s+/).filter(w => w.length >= 2);
    const allClean = candidateWords.length > 0 &&
      candidateWords.every(w => !LOCATION_DISQUALIFY_TOKENS.has(w) && !/^\d/.test(w));
    if (allClean) {
      return { value: candidate, confidence: "low" };
    }
  }

  // 4c. Strategy B: last clean word in sentence
  const cleanWords = words.filter(
    w => !LOCATION_DISQUALIFY_TOKENS.has(w) && !/^\d+(\.\d+)?$/.test(w) && w.length >= 3
  );
  if (cleanWords.length > 0) {
    return { value: cleanWords[cleanWords.length - 1], confidence: "low" };
  }

  return null;
}

function fuzzyLocationMatch(a: string, b: string): boolean {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  const threshold = Math.floor(Math.max(a.length, b.length) / 4);
  return levenshteinDistance(a, b) <= threshold;
}

function levenshteinDistance(a: string, b: string): number {
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

// ─────────────────────────────────────────────────────────────
// BEDROOMS PARSER
// ─────────────────────────────────────────────────────────────
function parseBedrooms(text: string) {
  const q = text.toLowerCase().trim();
  if (/^(any|skip|no\s+preference|doesn'?t?\s+matter|all)$/i.test(q)) {
    return { value: null, skipped: true };
  }
  const match = q.match(/(\d+)\s*(?:bhk|bedroom|bed|br)?/);
  if (match) {
    const n = parseInt(match[1]);
    if (n >= 1 && n <= 10) return { value: n, confidence: "high" };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// BUDGET PARSER
// ─────────────────────────────────────────────────────────────
function parseBudget(text: string) {
  const q = text.toLowerCase().trim();

  if (/^(any|skip|no|none|all|whatever|anything|no\s+budget|no\s+limit|no\s+preference|flexible|open|open\s+budget|doesn'?t?\s+matter|not\s+sure|not\s+fixed|nahi\s+pata|kuch\s+bhi)$/i.test(q)) {
    return { value: { minPrice: null, maxPrice: null }, skipped: true };
  }

  function toLakh(val: number, unit: string) {
    const u = (unit || "").toLowerCase().replace(/\s+/g, "");
    if (u.startsWith("cr")) return val * 100;
    return val;
  }

  const U_REQUIRED = "(lakh(?:s)?|lac(?:s)?|cr(?:ore(?:s)?)?|l)";
  const U_OPTIONAL = "(?:(lakh(?:s)?|lac(?:s)?|cr(?:ore(?:s)?)?|l)\\b)?";

  const rangeRx = new RegExp(
    "between\\s*(\\d+(?:\\.\\d+)?)\\s*" + U_OPTIONAL + "\\s*(?:and|to|-)\\s*(\\d+(?:\\.\\d+)?)\\s*" + U_OPTIONAL,
    "i"
  );
  const rangeMatch = q.match(rangeRx);
  if (rangeMatch) {
    const unit = rangeMatch[4] || rangeMatch[2] || "lakh";
    const lo = toLakh(parseFloat(rangeMatch[1]), unit);
    const hi = toLakh(parseFloat(rangeMatch[3]), unit);
    return { value: { minPrice: lo - 1, maxPrice: hi + 1 }, confidence: "high" };
  }

  const underRx = new RegExp(
    "(under|below|less\\s+than|upto|up\\s+to|max(?:imum)?|within|not\\s+more\\s+than|no\\s+more\\s+than)" +
    "\\s*(?:rs\\.?|inr|₹|rupees?)?\\s*(\\d+(?:\\.\\d+)?)" +
    "(?:\\s*" + U_REQUIRED + ")?",
    "i"
  );
  const underMatch = q.match(underRx);
  if (underMatch) {
    const max = toLakh(parseFloat(underMatch[2]), underMatch[3] || "lakh");
    return { value: { minPrice: null, maxPrice: max }, confidence: "high" };
  }

  const aboveRx = new RegExp(
    "(above|more\\s+than|greater\\s+than|over|min(?:imum)?|atleast|at\\s+least|starting|starting\\s+from|from)" +
    "\\s*(?:rs\\.?|inr|₹|rupees?)?\\s*(\\d+(?:\\.\\d+)?)" +
    "(?:\\s*" + U_REQUIRED + ")?",
    "i"
  );
  const aboveMatch = q.match(aboveRx);
  if (aboveMatch) {
    const min = toLakh(parseFloat(aboveMatch[2]), aboveMatch[3] || "lakh");
    return { value: { minPrice: min, maxPrice: null }, confidence: "high" };
  }

  const bareRx = new RegExp(
    "(?:^|[\\s,])(?:rs\\.?|inr|₹|rupees?)?\\s*(\\d+(?:\\.\\d+)?)\\s*" + U_REQUIRED + "\\b",
    "i"
  );
  const bareMatch = q.match(bareRx);
  if (bareMatch) {
    const target = toLakh(parseFloat(bareMatch[1]), bareMatch[2]);
    return {
      value: { minPrice: target * 0.70 - 1, maxPrice: target * 1.30 + 1 },
      confidence: "medium"
    };
  }

  const justNumberRx = /^(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)$/;
  const justNumberMatch = q.match(justNumberRx);
  if (justNumberMatch) {
    const target = parseFloat(justNumberMatch[1]);
    return {
      value: { minPrice: target * 0.70 - 1, maxPrice: target * 1.30 + 1 },
      confidence: "low"
    };
  }

  return null;
}

export const AD_FIELDS: FieldDefinition[] = [
  {
    key: "ad_name",
    required: true,
    question: "👤 *First, may I know your name?*",
    parse: (text: string) => {
      const val = text.trim();
      if (val.length >= 2) return { value: val, confidence: "high" };
      return null;
    }
  },
  {
    key: "buyRent",
    required: true,
    question: "🔑 *Are you looking to Buy or Rent?*\n\n• Buy\n• Rent",
    parse: (text: string) => {
      const q = text.toLowerCase().trim();
      if (/^(any|skip|both|no preference)$/i.test(q)) {
        return { value: "Buy/Rent", confidence: "high" };
      }
      if (q.includes("buy") || q.includes("purchase") || q.includes("own") || q.includes("kharid")) {
        return { value: "Buy", confidence: "high" };
      }
      if (q.includes("rent") || q.includes("lease") || q.includes("bhad")) {
        return { value: "Rent", confidence: "high" };
      }
      return null;
    }
  },
  {
    key: "type",
    required: true,
    question: "🏢 *What type of property are you looking for?*\n\n• Flat / Apartment\n• Villa / House / Bungalow\n• Plot / Land\n• Row House\n• Penthouse\n• Duplex\n• Studio\n\nJust type the property type.",
    parse: parseType
  },
  {
    key: "location",
    required: true,
    question: "📍 *Which city or locality are you interested in?*\n\nFor example: *Ahmedabad*, *Gota*, *Satellite*, *Mumbai*, *Pune*",
    parse: parseLocation
  },
  {
    key: "budget",
    required: true,
    question: "💰 *What is your budget?*\n\nYou can say things like:\n• *under 70 lakhs*\n• *above 1 crore*\n• *between 40 and 80 lakhs*\n• *50 lakhs*\n\nOr reply *any* / *skip*.",
    parse: parseBudget
  },
  {
    key: "bedrooms",
    required: true,
    question: "🛏️ *How many bedrooms (BHK) do you need?*\n\nFor example: *1 BHK*, *2 BHK*, *3 BHK*\n\nOr reply *any* / *skip*.",
    parse: parseBedrooms
  },
  {
    key: "preferences",
    required: true,
    question: "✨ *Do you have any additional preferences?* (e.g. furnished, garden-facing, high floor)\n\nReply with your preferences or type *none* / *skip*.",
    parse: (text: string) => {
      const q = text.trim();
      if (/^(none|skip|no|nothing|no preference)$/i.test(q)) {
        return { value: "None", confidence: "high" };
      }
      return { value: q, confidence: "high" };
    }
  }
];

// ─────────────────────────────────────────────────────────────
// SESSION CLASS
// ─────────────────────────────────────────────────────────────
export class Session {
  userId: string;
  collected: Record<string, any>;
  pendingField: string | null;
  active: boolean;
  isAdLead: boolean;
  adSource: string | null;
  lastActivity: number;
  lastPropertyIds: string[];
  private _timer: NodeJS.Timeout | null;

  constructor(userId: string) {
    this.userId = userId;
    this.collected = {};
    this.pendingField = null;
    this.active = false;
    this.isAdLead = false;
    this.adSource = null;
    this.lastActivity = Date.now();
    this.lastPropertyIds = [];
    this._timer = null;
  }

  getFields(): FieldDefinition[] {
    return this.isAdLead ? AD_FIELDS : FIELDS;
  }

  reset() {
    this.collected = {};
    this.pendingField = null;
    this.active = false;
    this.isAdLead = false;
    this.adSource = null;
    this.lastPropertyIds = [];
    this._resetTimer();
  }

  ingest(text: string): string {
    this.lastActivity = Date.now();
    this._resetTimer();
    if (!this.pendingField) return "noop";
    const fieldDef = this.getFields().find(f => f.key === this.pendingField);
    if (!fieldDef) return "noop";
    const result = fieldDef.parse(text);
    if (result === null) return "invalid";
    if (result.skipped) {
      this.collected[this.pendingField] = null;
      this.pendingField = null;
      return "skipped";
    }
    this.collected[this.pendingField] = result.value;
    this.pendingField = null;
    return "filled";
  }

  ingestInitialQuery(text: string): string[] {
    this.lastActivity = Date.now();
    this._resetTimer();
    this.active = true;
    const filled: string[] = [];
    for (const fieldDef of this.getFields()) {
      const result = fieldDef.parse(text);
      if (result !== null && !result.skipped) {
        this.collected[fieldDef.key] = result.value;
        filled.push(fieldDef.key);
      } else if (result && result.skipped) {
        this.collected[fieldDef.key] = null;
        filled.push(fieldDef.key);
      }
    }
    return filled;
  }

  nextQuestion() {
    for (const fieldDef of this.getFields()) {
      if (fieldDef.required && !this.collected.hasOwnProperty(fieldDef.key)) {
        this.pendingField = fieldDef.key;
        return { key: fieldDef.key, question: fieldDef.question };
      }
    }
    for (const fieldDef of this.getFields()) {
      if (!fieldDef.required && !this.collected.hasOwnProperty(fieldDef.key)) {
        this.pendingField = fieldDef.key;
        return { key: fieldDef.key, question: fieldDef.question };
      }
    }
    this.pendingField = null;
    return null;
  }

  isReadyToSearch(): boolean {
    for (const fieldDef of this.getFields()) {
      if (fieldDef.required && !this.collected.hasOwnProperty(fieldDef.key)) return false;
    }
    for (const fieldDef of this.getFields()) {
      if (!fieldDef.required && !this.collected.hasOwnProperty(fieldDef.key)) return false;
    }
    return true;
  }

  hasRequiredFields(): boolean {
    for (const fieldDef of this.getFields()) {
      if (fieldDef.required && !this.collected.hasOwnProperty(fieldDef.key)) return false;
    }
    return true;
  }

  buildFilters() {
    const c = this.collected;
    const budget = c.budget || { minPrice: null, maxPrice: null };
    const filters = {
      type: c.type || null,
      bedrooms: c.bedrooms || null,
      locations: c.location ? [c.location] : [],
      minPrice: budget.minPrice,
      maxPrice: budget.maxPrice,
      availableOnly: true
    };
    console.log("[sessionStore] buildFilters:", JSON.stringify(filters));
    return filters;
  }

  buildSearchLabel(): string {
    const c = this.collected;
    const parts = [];
    if (c.type) parts.push(c.type);
    if (c.bedrooms) parts.push(`${c.bedrooms} BHK`);
    if (c.location) parts.push(`in ${c.location}`);
    const b = c.budget;
    if (b) {
      if (b.maxPrice !== null && b.minPrice !== null) {
        parts.push(`between Rs.${Math.round(b.minPrice + 1)} and Rs.${Math.round(b.maxPrice - 1)} Lakh`);
      } else if (b.maxPrice !== null) {
        parts.push(`below Rs.${b.maxPrice} Lakh`);
      } else if (b.minPrice !== null) {
        parts.push(`above Rs.${b.minPrice} Lakh`);
      }
    }
    const label = parts.join(" ");
    console.log(`[sessionStore] searchLabel: "${label}"`);
    return label;
  }

  summary(): string {
    const lines = [];
    if (this.collected.type) lines.push(`Type: ${this.collected.type}`);
    if (this.collected.location) lines.push(`Location: ${this.collected.location}`);
    if (this.collected.bedrooms) lines.push(`BHK: ${this.collected.bedrooms}`);
    if (this.collected.budget) {
      const b = this.collected.budget;
      if (b.maxPrice && b.minPrice) lines.push(`Budget: Rs.${b.minPrice + 1}-${b.maxPrice - 1} Lakh`);
      else if (b.maxPrice) lines.push(`Budget: below Rs.${b.maxPrice} Lakh`);
      else if (b.minPrice) lines.push(`Budget: above Rs.${b.minPrice} Lakh`);
    }
    return lines.join(", ") || "nothing yet";
  }

  private _resetTimer() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      console.log(`[sessionStore] Session timed out for ${this.userId}`);
      this.reset();
    }, SESSION_TTL_MS);
  }
}

export class SessionStore {
  private _sessions = new Map<string, Session>();
  get(userId: string): Session {
    if (!this._sessions.has(userId)) {
      this._sessions.set(userId, new Session(userId));
    }
    return this._sessions.get(userId)!;
  }
  delete(userId: string) { this._sessions.delete(userId); }
}

export const store = new SessionStore();
