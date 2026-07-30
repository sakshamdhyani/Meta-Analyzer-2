export default function Detail({ label, value, mono }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-800 ${mono ? "font-mono text-xs" : ""} ${typeof value === "string" && value.length > 30 ? "text-right text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}
