export function LoadingSpinner() {
  return <div className="flex items-center justify-center py-12"><div className="spinner" /></div>;
}

export function EmptyState({ message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      {icon && <div className="mb-2">{icon}</div>}
      <p className="text-sm">{message || "Nothing here yet."}</p>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-sm">
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-sm btn-secondary">Retry</button>
      )}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">{message}</p>
        <div className="flex gap-2 mt-5 justify-end">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
