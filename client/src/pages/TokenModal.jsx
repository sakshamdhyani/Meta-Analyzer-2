import { useApp } from "../context/AppContext";
import { useState } from "react";
import { createToken, updateToken } from "../lib/api";

export default function TokenModal({ token, onClose, onSaved }) {
  const { toast$ } = useApp();
  const [form, setForm] = useState({
    accessToken: token?.accessToken || "",
    label: token?.label || "",
    note: token?.note || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let data;
      if (token) {
        data = (await updateToken(token._id, form)).data;
      } else {
        data = (await createToken(form)).data;
      }
      onSaved(data);
    } catch (e) {
      toast$(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900">{token ? "Edit Token" : "Add Token"}</h3>
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
