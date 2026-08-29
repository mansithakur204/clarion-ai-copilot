// Safe date parsing, validation, and formatting helper functions

const MONTH_MAP: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12"
};

/**
 * Checks whether a given string or Date is valid.
 */
export function isValidDate(value?: string | Date | null): boolean {
  if (!value) return false;
  if (typeof value === "string" && !value.trim()) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * Normalizes any text date (e.g. "September 20, 2026", "09/20/2026", "2026-09-20") into "YYYY-MM-DD".
 * If invalid or missing, returns undefined.
 */
export function normalizeDateToYYYYMMDD(value?: string | Date | null): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    const valTrim = value.trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(valTrim)) {
      return valTrim;
    }

    // Try Month DD, YYYY (e.g. "September 20, 2026" or "Sep 20, 2026")
    const monthMatch = valTrim.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i
    );
    if (monthMatch) {
      const monthStr = MONTH_MAP[monthMatch[1].toLowerCase()];
      const dayStr = monthMatch[2].padStart(2, "0");
      const yearStr = monthMatch[3];
      if (monthStr) {
        return `${yearStr}-${monthStr}-${dayStr}`;
      }
    }

    // Try MM/DD/YYYY
    const slashMatch = valTrim.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const monthStr = slashMatch[1].padStart(2, "0");
      const dayStr = slashMatch[2].padStart(2, "0");
      const yearStr = slashMatch[3];
      return `${yearStr}-${monthStr}-${dayStr}`;
    }
  }

  // Fallback to Date object parsing
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Normalizes any date into ISO string format (e.g. "2026-09-20T00:00:00.000Z").
 * If invalid or missing, returns undefined without throwing.
 */
export function normalizeDateToISO(value?: string | Date | null): string | undefined {
  const ymd = normalizeDateToYYYYMMDD(value);
  if (!ymd) return undefined;
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString();
  }
  return undefined;
}

/**
 * Formats a date for HTML5 <input type="date"> (strictly "YYYY-MM-DD").
 * Returns "" if invalid or missing.
 */
export function formatDateToYYYYMMDD(value?: string | Date | null): string {
  return normalizeDateToYYYYMMDD(value) || "";
}

/**
 * Formats a date for human display (e.g. "Sep 20, 2026").
 * Returns fallback (default "No deadline") if invalid or missing.
 */
export function formatDateForDisplay(
  value?: string | Date | null,
  fallback = "No deadline"
): string {
  const ymd = normalizeDateToYYYYMMDD(value);
  if (!ymd) return fallback;
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}
