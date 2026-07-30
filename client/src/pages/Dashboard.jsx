import { useState, useEffect, useMemo } from "react";
import { fetchTokens, createToken, updateToken, deleteToken } from "../lib/api";
import { useApp } from "../context/AppContext";
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/ui/Feedback";
import { ConfirmDialog } from "../components/ui/Feedback";
import TokenModal from "./TokenModal";

export default function Dashboard() {
  const { selectedTokenId, setSelectedTokenId } = useApp();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editToken, setEditToken] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchTokens();
      setTokens(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalAccounts = tokens.reduce((s, t) => s + (t.adAccounts?.length || 0), 0);
  const selected = tokens.find((t) => t._id === selectedTokenId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your FB ad accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditToken(null); setModalOpen(true); }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Token
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Tokens</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{tokens.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Ad Accounts</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{totalAccounts}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Selected Token</p>
          <p className="text-sm font-medium text-slate-700 mt-1.5 truncate">{selected?.label || selected?.accessToken?.slice(0, 12) + "…" || "None"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Accounts Linked</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{selected?.adAccounts?.length || 0}</p>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <LoadingSpinner />
      ) : tokens.length === 0 ? (
        <EmptyState message="No tokens yet. Add a Facebook access token to get started." />
      ) : (
        <div className="grid gap-3">
          {tokens.map((t) => (
            <div
              key={t._id}
              className={`card cursor-pointer transition-all ${selectedTokenId === t._id ? "ring-2 ring-blue-500" : "hover:border-slate-300"}`}
              onClick={() => setSelectedTokenId(t._id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{t.label || "Untitled Token"}</span>
                    <span className="badge badge-slate">{t.adAccounts?.length || 0} accounts</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{t.accessToken?.slice(0, 20)}…</p>
                  {t.note && <p className="text-xs text-slate-400 mt-1">{t.note}</p>}
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); setEditToken(t); setModalOpen(true); }}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); setDeleteId(t._id); }}>
                    Delete
                  </button>
                </div>
              </div>
              {t.adAccounts?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.adAccounts.map((a) => (
                    <span key={a._id} className="badge badge-blue">{a.name || a.adAccountId}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <TokenModal token={editToken} onClose={() => setModalOpen(false)} onSaved={(t) => { load(); setSelectedTokenId(t._id); }} />
      )}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Token"
        message="This will also remove all linked ad accounts. Continue?"
        danger
        onConfirm={async () => {
          await deleteToken(deleteId);
          setDeleteId(null);
          if (selectedTokenId === deleteId) setSelectedTokenId(null);
          load();
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
