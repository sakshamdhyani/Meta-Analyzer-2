import { useState, useEffect } from "react";
import { fetchTokens, createToken, updateToken, deleteToken } from "../lib/api";
import { useApp } from "../context/AppContext";
import { LoadingSpinner, EmptyState, ErrorMessage, ConfirmDialog } from "../components/ui/Feedback";

export default function Tokens() {
  const { toast$ } = useApp();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editToken, setEditToken] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ accessToken: "", label: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

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

  const openAdd = () => {
    setEditToken(null);
    setForm({ accessToken: "", label: "", note: "" });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditToken(t);
    setForm({ accessToken: t.accessToken, label: t.label || "", note: t.note || "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editToken) {
        await updateToken(editToken._id, form);
        toast$("Token updated successfully");
      } else {
        await createToken(form);
        toast$("Token created successfully");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteToken(id);
      toast$("Token deleted");
      load();
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tokens</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your Facebook access tokens</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Token
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <LoadingSpinner />
      ) : tokens.length === 0 ? (
        <EmptyState message="No tokens yet. Add a Facebook access token to get started." />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Token</th>
                <th>Note</th>
                <th>Accounts</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t._id}>
                  <td className="font-medium">{t.label || "—"}</td>
                  <td><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{t.accessToken?.slice(0, 16)}…</code></td>
                  <td className="max-w-xs truncate">{t.note || "—"}</td>
                  <td><span className="badge badge-blue">{t.adAccounts?.length || 0}</span></td>
                  <td className="text-right">
                    <div className="inline-flex gap-1">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(t)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(t._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">{editToken ? "Edit Token" : "Add Token"}</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Token *</label>
                <input className="input" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Main Account" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                <textarea className="input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Token"
        message="This will also remove all linked ad accounts. Continue?"
        danger
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
