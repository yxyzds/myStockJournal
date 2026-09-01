export function formatPrice(value: number | null, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null, digits = 2) {
  if (value == null) return "—";
  return `${Math.abs(value).toFixed(digits)}%`;
}

/** Calendar date for journal / trade records, e.g. "Aug 27, 2026". */
export function formatEntryDate(isoDate: string) {
  const date = isoDate.length === 10 ? new Date(`${isoDate}T12:00:00`) : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** YYYY-MM-DD in US Eastern. */
export function todayNyDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function isCalendarDate(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month, day] = isoDate.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

/** Quote as-of clock in US Eastern, e.g. "Sep 1, 8:40 AM EDT". */
export function formatQuoteAsOf(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
