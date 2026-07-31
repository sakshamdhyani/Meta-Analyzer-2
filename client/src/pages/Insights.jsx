import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchTokens } from "../lib/api";
import { fetchInsights } from "../lib/api";
import { useApp } from "../context/AppContext";
import MetricsGrid from "../components/ui/MetricsGrid";
import CampaignTable from "../components/ui/CampaignTable";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/ui/Feedback";
import { formatCurrency } from "../lib/utils";

export default function Insights() {
  const { selectedTokenId, setSelectedTokenId, toast$ } = useApp();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);

  const selectedToken = tokens.find((t) => t._id === selectedTokenId);
  const accounts = selectedToken?.adAccounts || [];

  const load = useCallback(async () => {
    if (!selectedTokenId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchInsights(selectedTokenId, {
        accountIds: selectedAccountIds.join(",") || undefined,
        since: since || undefined,
        until: until || undefined,
      });
      setData(d.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTokenId, selectedAccountIds, since, until]);

  useEffect(() => {
    fetchTokens().then(({ data }) => setTokens(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    setSince(from.toISOString().slice(0, 10));
    setUntil(today.toISOString().slice(0, 10));
  }, []);

  const toggleAccount = (id) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Build a map of adAccountId → currency from the selected token's linked accounts
  const currencyMap = useMemo(() => {
    const map = {};
    accounts.forEach((a) => {
      if (a.currency) map[a.adAccountId] = a.currency;
    });
    return map;
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Insights</h1>
        <p className="text-sm text-slate-500 mt-0.5">Performance metrics across your ad accounts</p>
      </div>

      {/* Controls */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Token</label>
            <select className="input max-w-xs" value={selectedTokenId || ""} onChange={(e) => setSelectedTokenId(e.target.value)}>
              <option value="">Select a token…</option>
              {tokens.map((t) => (
                <option key={t._id} value={t._id}>{t.label || t.accessToken?.slice(0, 20)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" className="input" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" className="input" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={!selectedTokenId}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348c4.077.324 4.077 6.324 0 6.648M16.023 9.348C16.023 3.348 7.977 3.348 7.977 9.348c0 3.807 2.547 5.807 4.977 6.402M7.977 9.348C7.977 3.348 3.348 3.348 3.348 9.348c0 3.807 2.547 5.807 4.977 6.402" /></svg>
            Refresh
          </button>
        </div>

        {accounts.length > 1 && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filter Accounts</label>
            <div className="flex flex-wrap gap-1.5">
              {accounts.map((a) => {
                const active = selectedAccountIds.includes(a.adAccountId);
                return (
                  <button
                    key={a._id}
                    className={`badge cursor-pointer transition-colors ${active ? "badge-blue" : "badge-slate"}`}
                    onClick={() => toggleAccount(a.adAccountId)}
                  >
                    {a.name || a.adAccountId}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <LoadingSpinner />
      ) : !data ? (
        <EmptyState message="Select a token, date range, and click Refresh to load insights." />
      ) : (
        <div className="space-y-6">
          {/* Combined */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              Combined Performance
              <span className="text-xs text-slate-400 ml-2">{data?.combined?.since} → {data?.combined?.until}</span>
            </h3>
            <MetricsGrid metrics={data?.combined} currency={data?.accounts?.[0]?.currency || "USD"} />
          </div>

          {/* Per-account */}
          {data?.accounts?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-medium text-slate-700 mb-3">By Ad Account</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Spend</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                      <th>CPC</th>
                      <th>Conversions</th>
                      <th>ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((acc) => (
                      <tr key={acc._id}>
                        <td className="font-medium">{acc.name || acc.adAccountId}</td>
                        <td>{formatCurrency(acc.spend, acc.currency)}</td>
                        <td>{acc.impressions.toLocaleString()}</td>
                        <td>{acc.clicks.toLocaleString()}</td>
                        <td>{acc.ctr.toFixed(2)}%</td>
                        <td>{formatCurrency(acc.cpc, acc.currency)}</td>
                        <td>{acc.conversions.toLocaleString()}</td>
                        <td>{acc.roas.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hierarchy with metrics */}
          {data?.hierarchy?.length > 0 && (
            <CampaignTable tree={data.hierarchy} currencyMap={currencyMap} />
          )}
        </div>
      )}
    </div>
  );
}
