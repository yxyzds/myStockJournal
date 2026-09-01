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
