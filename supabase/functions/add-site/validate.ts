// Validation for the add-site request. Pure TypeScript with no imports so the Edge Function (Deno),
// the web form and the vitest suite can all share it.

export const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "NZ", "FJ"] as const;
export type State = (typeof STATES)[number];

export type NewSite = {
  id: string;
  name: string;
  state: State;
  lat: number;
  lon: number;
  acceptance: { fromYear: number; toYear: number; tonnesPerYear: number }[];
  k: number;
  L0: number;
  existingCapture: number;
  illustrative: true;
  notes: string;
  sources: string[];
};

export const DEFAULTS = { k: 0.05, L0: 100, existingCapture: 0 };

// Below this a landfill is too small to show up against satellite noise or to be worth modelling.
export const MIN_TONNES_PER_YEAR = 100;
const MAX_GAP_YEARS = 20;

// Rough bounding boxes (lat/lon). They reject obviously wrong pins, not borders.
const AU = { minLat: -44, maxLat: -10, minLon: 112, maxLon: 154 };
const NZ = { minLat: -48, maxLat: -34, minLon: 166, maxLon: 179 };
// Viti Levu and Vanua Levu; the Lau group east of 180° is outside the table's longitude range.
const FJ = { minLat: -21, maxLat: -15.5, minLon: 176.5, maxLon: 179 };
const inBox = (b: typeof AU, lat: number, lon: number) =>
  lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Great-circle distance in km. */
export function distanceKm(lat0: number, lon0: number, lat1: number, lon1: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat1 - lat0) * rad) / 2) ** 2 +
    Math.cos(lat0 * rad) * Math.cos(lat1 * rad) * Math.sin(((lon1 - lon0) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export type Validated = { ok: true; site: NewSite } | { ok: false; errors: string[] };

export function validateNewSite(input: unknown): Validated {
  const errors: string[] = [];
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (name.length < 3 || name.length > 80) errors.push("Name must be 3 to 80 characters.");
  const id = slugify(name);
  if (name && id.length < 3) errors.push("Name must contain at least 3 letters or numbers.");

  const state = o.state as State;
  if (!STATES.includes(state)) errors.push("Pick a state or territory.");

  const { lat, lon } = o;
  if (!isNum(lat) || !isNum(lon)) {
    errors.push("Latitude and longitude must be numbers.");
  } else if (lat === 0 && lon === 0) {
    errors.push("Coordinates are 0, 0. Enter the landfill's real latitude and longitude.");
  } else if (STATES.includes(state) && lat > 0 && lon < 0) {
    errors.push("Latitude and longitude look swapped. Latitude is negative in this region (about -10 to -48) and longitude is positive (about 112 to 179).");
  } else if (STATES.includes(state)) {
    const box = state === "NZ" ? NZ : state === "FJ" ? FJ : AU;
    const place = state === "NZ" ? "New Zealand" : state === "FJ" ? "Fiji" : "Australia";
    if (!inBox(box, lat, lon)) errors.push(`Coordinates are not inside ${place}.`);
  }

  const acc = o.acceptance;
  const acceptance: NewSite["acceptance"] = [];
  if (!Array.isArray(acc) || acc.length < 1 || acc.length > 6) {
    errors.push("Give 1 to 6 waste acceptance periods.");
  } else {
    acc.forEach((p, i) => {
      const { fromYear, toYear, tonnesPerYear } = (p ?? {}) as Record<string, unknown>;
      const good =
        isNum(fromYear) && isNum(toYear) && isNum(tonnesPerYear) &&
        Number.isInteger(fromYear) && Number.isInteger(toYear) &&
        fromYear >= 1900 && toYear <= 2100 && toYear >= fromYear &&
        tonnesPerYear >= MIN_TONNES_PER_YEAR && tonnesPerYear <= 1e8;
      if (good) acceptance.push({ fromYear, toYear, tonnesPerYear });
      else errors.push(`Acceptance period ${i + 1}: years 1900 to 2100 (end not before start) and ${MIN_TONNES_PER_YEAR} to 100,000,000 tonnes per year.`);
    });
    // Overlaps double-count waste and large gaps usually mean a missing period; both skew the model.
    if (acceptance.length === acc.length && acceptance.length > 1) {
      const sorted = [...acceptance].sort((a, b) => a.fromYear - b.fromYear);
      // Compare with the period that ends latest so far, so a long period hides no later overlap or gap.
      let prev = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i];
        if (cur.fromYear <= prev.toYear) {
          errors.push(`Acceptance periods ${prev.fromYear}-${prev.toYear} and ${cur.fromYear}-${cur.toYear} overlap. Each year should appear in one period only.`);
        } else if (cur.fromYear - prev.toYear - 1 > MAX_GAP_YEARS) {
          errors.push(`There is a gap of more than ${MAX_GAP_YEARS} years between ${prev.toYear} and ${cur.fromYear}. Add the missing period or confirm the site was closed.`);
        }
        if (cur.toYear > prev.toYear) prev = cur;
      }
    }
  }

  const k = o.k ?? DEFAULTS.k;
  if (!isNum(k) || k <= 0 || k >= 1) errors.push("k must be between 0 and 1.");
  const L0 = o.L0 ?? DEFAULTS.L0;
  if (!isNum(L0) || L0 <= 0 || L0 > 300) errors.push("L0 must be between 0 and 300 m3 CH4 per tonne.");
  const existingCapture = o.existingCapture ?? DEFAULTS.existingCapture;
  if (!isNum(existingCapture) || existingCapture < 0 || existingCapture > 1) errors.push("Existing capture must be between 0 and 1.");

  const extra = typeof o.notes === "string" ? o.notes.trim().slice(0, 500) : "";
  const source = typeof o.source === "string" ? o.source.trim().slice(0, 300) : "";

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    site: {
      id,
      name,
      state,
      lat: lat as number,
      lon: lon as number,
      acceptance,
      k: k as number,
      L0: L0 as number,
      existingCapture: existingCapture as number,
      illustrative: true,
      notes: ["User-added site: waste history, k, L0 and existing capture are user-entered or default proxies.", extra]
        .filter(Boolean)
        .join(" "),
      sources: source ? [source] : [],
    },
  };
}
