import { useState, useEffect, useCallback } from "react";
import { fetchTokens, fetchFbAdAccounts, linkAdAccounts, addSingleAdAccount, deleteAdAccount } from "../lib/api";
import { useApp } from "../context/AppContext";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/ui/Feedback";

export default function AdAccounts() {
  const { selectedTokenId, setSelectedTokenId, toast$ } = useApp();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [fbAccounts, setFbAccounts] = useState([]);
  const [showFbModal, setShowFbModal] = useState(false);
  const [fbToken, setFbToken] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [selectedFb, setSelectedFb] = useState([]);

  const selectedToken = tokens.find((t) => t._id === selectedTokenId);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const fetchFb = async () => {
    setFbLoading(true);
    try {
      const res = await fetchFbAdAccounts(fbToken);
      setFbAccounts(res.data);
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setFbLoading(false);
    }
  };

  const linkSelected = async () => {
    if (!selectedTokenId || selectedFb.length === 0) return;
    setSyncing(true);
    try {
      await linkAdAccounts(selectedTokenId, selectedFb.map((a) => ({ adAccountId: a.id })));
      toast$(`${selectedFb.length} account(s) linked`);
      setShowFbModal(false);
      setSelectedFb([]);
      setFbAccounts([]);
      setFbToken("");
      load();
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdAccount(id);
      toast$("Account removed");
      load();
    } catch (e) {
      toast$(e.message, "error");
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!selectedTokenId || !fbToken.trim()) return;
    setSyncing(true);
    try {
      await addSingleAdAccount(selectedTokenId, { adAccountId: fbToken.trim() });
      toast$("Account linked");
      setFbToken("");
      load();
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ad Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage linked Facebook ad accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedFb([]); setFbToken(""); setFbAccounts([]); setShowFbModal(true); }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Link Account
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <LoadingSpinner />
      ) : !selectedTokenId ? (
        <EmptyState message="Select a token first to view ad accounts." />
      ) : (
        <div className="space-y-4">
          {/* Token selector */}
          <select
            className="input max-w-xs"
            value={selectedTokenId}
            onChange={(e) => setSelectedTokenId(e.target.value)}
          >
            <option value="">Select a token…</option>
            {tokens.map((t) => (
              <option key={t._id} value={t._id}>{t.label || t.accessToken?.slice(0, 20)}</option>
            ))}
          </select>

          {/* Manual add */}
          <form onSubmit={handleManualAdd} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Add by Ad Account ID</label>
              <input className="input" placeholder="e.g. 1234567890" value={fbToken} onChange={(e) => setFbToken(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={syncing || !fbToken.trim()}>
              {syncing ? <span className="spinner" /> : "Add"}
            </button>
          </form>

          {/* Accounts table */}
          {selectedToken?.adAccounts?.length > 0 ? (
            <div className="card overflow-x-auto !p-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Currency</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedToken.adAccounts.map((a) => (
                    <tr key={a._id}>
                      <td className="font-mono text-xs">{a.adAccountId}</td>
                      <td>{a.name || "—"}</td>
                      <td><span className="badge badge-slate">{a.currency || "—"}</span></td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a._id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No ad accounts linked to this token yet." />
          )}
        </div>
      )}

      {/* FB Accounts Modal */}
      {showFbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !fbLoading && setShowFbModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">Link Ad Accounts from Facebook</h3>

            {!fbAccounts.length ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Facebook Access Token</label>
                  <input className="input" value={fbToken} onChange={(e) => setFbToken(e.target.value)} placeholder="Enter FB access token" />
                </div>
                <button className="btn btn-primary" onClick={fetchFb} disabled={!fbToken.trim()}>Fetch Accounts</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mt-3">Select accounts to link:</p>
                <div className="mt-2 flex-1 overflow-auto space-y-2">
                  {fbAccounts.map((acc) => (
                    <label key={acc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedFb.some((s) => s.id === acc.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedFb([...selectedFb, acc]);
                          else setSelectedFb(selectedFb.filter((s) => s.id !== acc.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{acc.name}</p>
                        <p className="text-xs text-slate-400">{acc.id} · {acc.currency} · {acc.status}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button className="btn btn-secondary" onClick={() => setShowFbModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={linkSelected} disabled={selectedFb.length === 0 || syncing}>
                    {syncing ? <span className="spinner" /> : `Link ${selectedFb.length}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
