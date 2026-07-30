/**
 * Formatting helpers used across the UI.
 */

export function formatCurrency(n, currency = "USD") {
  if (n == null || isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

export function formatNumber(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPercent(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

export function statusBadgeClass(status) {
  const s = (status || "").toUpperCase();
  if (["ACTIVE", "ENABLED"].includes(s)) return "badge-green";
  if (["PAUSED", "PAUSED", "ARCHIVED"].includes(s)) return "badge-amber";
  if (["DELETED", "DISABLED"].includes(s)) return "badge-rose";
  return "badge-slate";
}

export function truncate(str, max = 40) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}
