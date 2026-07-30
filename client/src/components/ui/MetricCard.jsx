export default function MetricCard({ label, value, sub, icon }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{value ?? "—"}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {icon && <div className="text-slate-300 mt-0.5">{icon}</div>}
      </div>
    </div>
  );
}
