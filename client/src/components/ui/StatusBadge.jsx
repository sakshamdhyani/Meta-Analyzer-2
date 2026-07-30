import { statusBadgeClass } from "../../lib/utils";

export function StatusBadge({ status }) {
  return <span className={`badge ${statusBadgeClass(status)}`}>{status || "—"}</span>;
}
