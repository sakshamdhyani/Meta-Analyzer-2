import { useState, useEffect, useCallback } from "react";
import { fetchCampaigns, syncAccount, fetchTokens } from "../lib/api";
import { useApp } from "../context/AppContext";
import TreeNode from "../components/ui/TreeNode";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/ui/Feedback";
import { formatCurrency } from "../lib/utils";
import Detail from "../components/ui/Detail";

export default function Campaigns() {
  const { selectedTokenId, setSelectedTokenId, toast$ } = useApp();
  const [tokens, setTokens] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [adAccountFilter, setAdAccountFilter] = useState("");
  const [syncForm, setSyncForm] = useState({ adAccountId: "", includeAds: true });

  const selectedToken = tokens.find((t) => t._id === selectedTokenId);

  const load = useCallback(async () => {
    if (!selectedTokenId) { setTree([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCampaigns(selectedTokenId, adAccountFilter);
      setTree(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTokenId, adAccountFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (e) => {
    e.preventDefault();
    if (!selectedTokenId || !syncForm.adAccountId) return;
    setSyncing(true);
    try {
      const res = await syncAccount(selectedTokenId, syncForm.adAccountId, syncForm.includeAds);
      toast$(`Synced ${res.data.campaignsSynced} campaigns, ${res.data.adsetsSynced} adsets, ${res.data.adsSynced} ads`);
      load();
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchTokens().then(({ data }) => setTokens(data)).catch(() => {});
  }, []);

  const handleSelect = (id, node) => {
    setSelectedId(id);
    setSelectedNode(node);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sync and browse campaigns, ad sets, and ads</p>
        </div>
        <div className="flex gap-2">
          <select className="input max-w-xs" value={selectedTokenId || ""} onChange={(e) => { setSelectedTokenId(e.target.value); setAdAccountFilter(""); }}>
            <option value="">Select a token…</option>
            {tokens.map((t) => (
              <option key={t._id} value={t._id}>{t.label || t.accessToken?.slice(0, 20)}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={load} disabled={!selectedTokenId}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348c4.077.324 4.077 6.324 0 6.648M16.023 9.348C16.023 3.348 7.977 3.348 7.977 9.348c0 3.807 2.547 5.807 4.977 6.402M7.977 9.348C7.977 3.348 3.348 3.348 3.348 9.348c0 3.807 2.547 5.807 4.977 6.402" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Sync form */}
      {selectedTokenId && (
        <form onSubmit={handleSync} className="card">
          <h3 className="text-sm font-medium text-slate-700">Sync from Facebook</h3>
          <div className="flex flex-wrap gap-3 mt-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-slate-500 mb-1">Ad Account ID</label>
              <input className="input" placeholder="e.g. 1234567890" value={syncForm.adAccountId} onChange={(e) => setSyncForm({ ...syncForm, adAccountId: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 pb-2">
              <input type="checkbox" checked={syncForm.includeAds} onChange={(e) => setSyncForm({ ...syncForm, includeAds: e.target.checked })} />
              Include Ads
            </label>
            <button type="submit" className="btn btn-primary" disabled={syncing || !syncForm.adAccountId}>
              {syncing ? <span className="spinner" /> : "Sync"}
            </button>
          </div>
        </form>
      )}

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <LoadingSpinner />
      ) : !selectedTokenId ? (
        <EmptyState message="Select a token and sync campaigns to get started." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tree */}
          <div className="lg:col-span-2">
            <div className="card !p-2">
              {tree.length === 0 ? (
                <EmptyState message="No campaigns found. Sync first." />
              ) : (
                tree.map((campaign) => (
                  <TreeNode key={campaign.campaignId} node={campaign} selectedId={selectedId} onSelect={handleSelect} />
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div>
            {selectedNode ? (
              <div className="card space-y-3">
                <h3 className="font-medium text-slate-900">{selectedNode.name}</h3>
                <div className="space-y-1.5">
                  <Detail label="Type" value={selectedNode.type} />
                  <Detail label="ID" value={selectedNode.campaignId || selectedNode.adsetId || selectedNode.adId} mono />
                  <Detail label="Status" value={selectedNode.status} />
                  <Detail label="Effective" value={selectedNode.effectiveStatus} />
                  {selectedNode.dailyBudget && <Detail label="Daily Budget" value={formatCurrency(selectedNode.dailyBudget / 100)} />}
                  {selectedNode.lifetimeBudget && <Detail label="Lifetime Budget" value={formatCurrency(selectedNode.lifetimeBudget / 100)} />}
                  {selectedNode.objective && <Detail label="Objective" value={selectedNode.objective} />}
                  {selectedNode.billingEvent && <Detail label="Billing" value={selectedNode.billingEvent} />}
                  {selectedNode.optimizationGoal && <Detail label="Optimization" value={selectedNode.optimizationGoal} />}
                  {selectedNode.startTime && <Detail label="Start" value={new Date(selectedNode.startTime).toLocaleDateString()} />}
                  {selectedNode.stopTime && <Detail label="End" value={new Date(selectedNode.stopTime).toLocaleDateString()} />}
                  {selectedNode.updatedTime && <Detail label="Updated" value={new Date(selectedNode.updatedTime).toLocaleString()} />}
                  {selectedNode.callToAction && <Detail label="CTA" value={selectedNode.callToAction} />}
                  {selectedNode.linkUrl && <Detail label="Link" value={<a href={selectedNode.linkUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline break-all">{selectedNode.linkUrl}</a>} />}
                </div>
              </div>
            ) : (
              <div className="card text-center text-sm text-slate-400">Click an item to view details</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
