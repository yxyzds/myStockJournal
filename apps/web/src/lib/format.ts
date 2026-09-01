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
