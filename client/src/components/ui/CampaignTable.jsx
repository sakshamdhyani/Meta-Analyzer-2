import { useState, useMemo } from "react";

/* ── formatters ──────────────────────────────────────────── */

function fmtBudget(v, currency = "USD") {
  if (v == null) return null;
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  if (isNaN(n)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n / 100);
}

function fmtCurrency(n, currency = "USD") {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function fmtROAS(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(2)}x`;
}

function fmtDate(s) {
  if (!s) return null;
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function statusBadge(status) {
  const s = (status || "").toUpperCase();
  const map = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    ENABLED: "bg-emerald-50 text-emerald-700",
    PAUSED: "bg-amber-50 text-amber-700",
    ARCHIVED: "bg-amber-50 text-amber-700",
    DELETED: "bg-rose-50 text-rose-700",
    DISABLED: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[s] || "bg-slate-100 text-slate-600"}`}>
      {status || "—"}
    </span>
  );
}

const TYPE_CONFIG = {
  campaign: { label: "Campaign", dot: "bg-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: "campaign" },
  adset:   { label: "Ad Set",   dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: "adset" },
  ad:      { label: "Ad",       dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "ad" },
};

const COLS = [
  { key: "type",     label: "Type",        width: "w-28" },
  { key: "name",     label: "Name",        width: "min-w-[200px]" },
  { key: "id",       label: "ID",          width: "w-36" },
  { key: "status",   label: "Status",      width: "w-28" },
  { key: "budget",   label: "Budget",      width: "w-28" },
  { key: "spend",    label: "Spend",       width: "w-28" },
  { key: "impr",     label: "Impressions", width: "w-24" },
  { key: "clicks",   label: "Clicks",      width: "w-20" },
  { key: "ctr",      label: "CTR",         width: "w-20" },
  { key: "convs",    label: "Conv.",       width: "w-20" },
  { key: "roas",     label: "ROAS",        width: "w-20" },
];

const TYPE_ICONS = {
  campaign: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 15.375v-2.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-8.25zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  adset:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>,
  ad:      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

/* ── expanded detail row ────────────────────────────────── */

function ExpandedRow({ node, currency = "USD", onSelectDetail }) {
  const tc = TYPE_CONFIG[node.type];
  const m = node.metrics || {};
  const id = node.campaignId || node.adsetId || node.adId;
  const thumb = node.type === "ad" ? node.thumbnailUrl : null;

  /* build a 2-col key/value list */
  const rows = [
    ["Type", tc.label],
    ["ID", id],
    ["Status", node.status || node.effectiveStatus || "—"],
    ["Effective Status", node.effectiveStatus || "—"],
    ...(node.type === "campaign"
      ? [
          ["Objective", node.objective || "—"],
          ["Daily Budget", node.dailyBudget ? fmtBudget(node.dailyBudget, currency) : "—"],
          ["Lifetime Budget", node.lifetimeBudget ? fmtBudget(node.lifetimeBudget, currency) : "—"],
          ["Buying Type", node.buyingType || "—"],
        ]
      : []),
    ...(node.type === "adset"
      ? [
          ["Daily Budget", node.dailyBudget ? fmtBudget(node.dailyBudget, currency) : "—"],
          ["Lifetime Budget", node.lifetimeBudget ? fmtBudget(node.lifetimeBudget, currency) : "—"],
          ["Billing Event", node.billingEvent || "—"],
          ["Optimization Goal", node.optimizationGoal || "—"],
        ]
      : []),
    ...(node.type === "ad"
      ? [
          ["Creative ID", node.creativeId || "—"],
          ["Call to Action", node.callToAction || "—"],
          ["Link", node.linkUrl ? <a href={node.linkUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline break-all">{node.linkUrl}</a> : "—"],
        ]
      : []),
    ["Start Time", node.startTime ? fmtDate(node.startTime) : "—"],
    ["Stop Time", node.stopTime ? fmtDate(node.stopTime) : "—"],
    ["Updated", node.updatedTime ? fmtDate(node.updatedTime) : "—"],
  ];

  const metricRows = [
    ["Spend", fmtCurrency(m.spend, currency)],
    ["Impressions", fmtNum(m.impressions)],
    ["Clicks", fmtNum(m.clicks)],
    ["CTR", fmtPct(m.ctr)],
    ["CPC", fmtCurrency(m.cpc, currency)],
    ["CPM", fmtCurrency(m.cpm, currency)],
    ["Reach", fmtNum(m.reach)],
    ["Frequency", m.frequency ? m.frequency.toFixed(2) : "—"],
    ["Conversions", fmtNum(m.conversions)],
    ["Cost / Conv.", fmtCurrency(m.costPerConversion, currency)],
    ["Revenue", fmtCurrency(m.revenue, currency)],
    ["ROAS", fmtROAS(m.roas)],
  ];

  return (
    <tr>
      <td colSpan={COLS.length + 1} className="!p-0">
        <div className="bg-blue-50/40 border-t border-blue-100">
          <div className="px-6 py-4">
            {/* Header with thumbnail for ads */}
            <div className="flex items-start gap-4 mb-4">
              {thumb ? (
                <img src={thumb} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <span className={`w-12 h-12 rounded-lg border shrink-0 flex items-center justify-center ${
                  node.type === "campaign" ? "bg-blue-50 border-blue-200 text-blue-500" :
                  node.type === "adset"   ? "bg-amber-50 border-amber-200 text-amber-500" :
                                             "bg-emerald-50 border-emerald-200 text-emerald-500"
                }`}>
                  {TYPE_ICONS[node.type]}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">{node.name || "Unnamed"}</h4>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${tc.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                    {tc.label}
                  </span>
                </div>
                <code className="text-xs text-slate-500 font-mono">{id}</code>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
              <DetailSection title="Details" rows={rows} />
              <DetailSection title="Performance" rows={metricRows} highlight />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function DetailSection({ title, rows, highlight }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
      <div className="space-y-0.5">
        {rows.filter(([, v]) => v && v !== "—").map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm gap-4">
            <span className="text-slate-500 shrink-0">{label}</span>
            <span className={`text-right truncate ${highlight && (label === "Spend" || label === "ROAS") ? "font-semibold text-slate-900" : "text-slate-700"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main table ──────────────────────────────────────────── */

export default function CampaignTable({ tree, currencyMap = {}, onSelect }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [expandedId, setExpandedId] = useState(null);

  const rows = useMemo(() => {
    const out = [];
    const walk = (node, depth) => {
      out.push({ ...node, depth });
      (node.children || []).forEach((c) => walk(c, depth + 1));
    };
    tree.forEach((c) => walk(c, 0));
    return out;
  }, [tree]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      return [r.name, r.campaignId, r.adsetId, r.adId, r.status, r.effectiveStatus, r.objective]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [rows, search, typeFilter]);

  const sorted = useMemo(() => {
    const list = [...visible];
    const d = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const aV = (a[sortKey] ?? "").toString().toLowerCase();
      const bV = (b[sortKey] ?? "").toString().toLowerCase();
      if (aV < bV) return -d;
      if (aV > bV) return d;
      return a.depth - b.depth;
    });
    return list;
  }, [visible, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((p) => (p === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleRowClick = (id, node) => {
    setExpandedId((prev) => (prev === id ? null : id));
    onSelect?.(id, node);
  };

  if (tree.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Search name, ID, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="campaign">Campaigns</option>
          <option value="adset">Ad Sets</option>
          <option value="ad">Ads</option>
        </select>
        <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
          {sorted.length} {sorted.length === 1 ? "row" : "rows"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-10 px-2" />
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className={`${col.width} px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 transition-colors`}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        {sortDir === "asc"
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />}
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15M8.25 9L12 5.25 15.75 9" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row, idx) => {
              const id = row.campaignId || row.adsetId || row.adId;
              const isExpanded = expandedId === id;
              const tc = TYPE_CONFIG[row.type];
              const m = row.metrics || {};
              const currency = currencyMap[row.adAccountId] || "USD";
              const budget = row.type === "campaign" ? fmtBudget(row.lifetimeBudget, currency) : row.type === "adset" ? fmtBudget(row.dailyBudget, currency) : null;
              const thumb = row.type === "ad" ? row.thumbnailUrl : null;
              const isAlt = idx % 2 === 1;

              return (
                <>
                  <tr
                    key={`${id}-${row.depth}`}
                    className={`
                      cursor-pointer transition-colors
                      ${isAlt ? "bg-slate-50/60" : "bg-white"}
                      hover:bg-blue-50/60
                      ${isExpanded ? "bg-blue-50" : ""}
                    `}
                    onClick={() => handleRowClick(id, row)}
                  >
                    {/* Expand chevron */}
                    <td className="px-2 py-2.5 whitespace-nowrap text-center">
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-150 inline-block ${isExpanded ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${tc.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                        {tc.label}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          <span className={`w-9 h-9 rounded-md border shrink-0 flex items-center justify-center ${
                            row.type === "campaign" ? "bg-blue-50 border-blue-200 text-blue-500" :
                            row.type === "adset"   ? "bg-amber-50 border-amber-200 text-amber-500" :
                                                       "bg-emerald-50 border-emerald-200 text-emerald-500"
                          }`}>
                            {TYPE_ICONS[row.type]}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate block">{row.name || "Unnamed"}</span>
                          {row.type === "campaign" && row.objective && (
                            <span className="text-xs text-slate-400">{row.objective}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{id}</code>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 whitespace-nowrap">{statusBadge(row.status || row.effectiveStatus)}</td>

                    {/* Budget */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-slate-600">{budget ?? "—"}</td>

                    {/* Spend */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-right font-semibold text-slate-800">{fmtCurrency(m.spend, currency)}</td>

                    {/* Impressions */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-right text-slate-600">{fmtNum(m.impressions)}</td>

                    {/* Clicks */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-right text-slate-600">{fmtNum(m.clicks)}</td>

                    {/* CTR */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-right">
                      <span className={m.ctr > 0 ? "text-slate-800 font-medium" : "text-slate-400"}>{fmtPct(m.ctr)}</span>
                    </td>

                    {/* Conversions */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-right text-slate-600">
                      {row.type === "campaign" ? fmtNum(m.conversions) : "—"}
                    </td>

                    {/* ROAS */}
                    <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-right">
                      {row.type === "campaign" ? (
                        <span className={m.roas > 0 ? "text-emerald-600 font-medium" : "text-slate-400"}>{fmtROAS(m.roas)}</span>
                      ) : "—"}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <ExpandedRow key={`${id}-detail`} node={row} currency={currency} />
                  )}
                </>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 1} className="text-center text-sm text-slate-400 py-10">
                  No results match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
