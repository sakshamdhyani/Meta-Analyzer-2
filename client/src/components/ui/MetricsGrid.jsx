import { formatPercent, formatNumber } from "../../lib/utils";

const metrics = [
  { key: "spend", label: "Spend" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "ctr", label: "CTR", format: formatPercent },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "conversions", label: "Conversions" },
  { key: "costPerConversion", label: "Cost / Conv." },
  { key: "revenue", label: "Revenue" },
  { key: "roas", label: "ROAS" },
  { key: "reach", label: "Reach" },
  { key: "frequency", label: "Freq." },
];

export default function MetricsGrid({ metrics: m, compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
      {metrics.map(({ key, label, format }) => (
        <div key={key} className="card !p-3">
          <p className="text-[0.7rem] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            {format ? format(m?.[key]) : formatNumber(m?.[key])}
          </p>
        </div>
      ))}
    </div>
  );
}
