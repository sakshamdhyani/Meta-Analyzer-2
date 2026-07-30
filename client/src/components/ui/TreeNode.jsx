import { useState } from "react";
import { statusBadgeClass } from "../../lib/utils";

export default function TreeNode({ node, level = 0, selectedId, onSelect }) {
  const labels = { campaign: "Campaign", adset: "Ad Set", ad: "Ad" };
  const icons = {
    campaign: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 15.375v-2.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-8.25zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    adset: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>,
    ad: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  };

  const type = node.type;
  const id = node.campaignId || node.adsetId || node.adId;
  const isSelected = selectedId === id;
  const hasChildren = node.children?.length > 0;
  const [open, setOpen] = useState(hasChildren);
  const spend = node.metrics?.spend;
  const status = node.status || node.effectiveStatus;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected ? "bg-blue-50" : "hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${0.5 + level * 1.25}rem` }}
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          onSelect?.(id, node);
        }}
      >
        <span className="text-slate-300 shrink-0">{icons[type]}</span>
        <span className="flex-1 text-sm text-slate-700 truncate">{node.name || labels[type]}</span>
        {status && <span className={`badge ${statusBadgeClass(status)}`}>{status}</span>}
        {spend != null && <span className="text-xs text-slate-400 tabular-nums">${spend.toFixed(2)}</span>}
        {hasChildren && (
          <svg
            className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.campaignId || child.adsetId || child.adId}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
