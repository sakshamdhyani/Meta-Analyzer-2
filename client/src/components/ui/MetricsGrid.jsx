import { formatPercent, formatNumber, formatCurrency } from "../../lib/utils";

const METRICS = [
  { key: "spend",             label: "Spend",         format: "currency" },
  { key: "impressions",       label: "Impressions" },
  { key: "clicks",            label: "Clicks" },
  { key: "ctr",               label: "CTR",           format: "percent" },
  { key: "cpc",               label: "CPC",           format: "currency" },
  { key: "cpm",               label: "CPM",           format: "currency" },
  { key: "conversions",       label: "Conversions" },
  { key: "costPerConversion", label: "Cost / Conv.",  format: "currency" },
  { key: "revenue",           label: "Revenue",       format: "currency" },
  { key: "roas",              label: "ROAS" },
  { key: "reach",             label: "Reach" },
  { key: "frequency",         label: "Freq." },
];

function fmtValue(val, format, currency) {
  if (val == null || isNaN(val)) return "—";
  if (format === "percent") return formatPercent(val);
  if (format === "currency") return formatCurrency(val, currency);
  return formatNumber(val);
}

export default function MetricsGrid({ metrics: m, compact = false, currency = "USD" }) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
      {METRICS.map(({ key, label, format }) => (
        <div key={key} className="card !p-3">
          <p className="text-[0.7rem] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            {fmtValue(m?.[key], format, currency)}
          </p>
        </div>
      ))}
    </div>
  );
}
