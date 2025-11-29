// src/components/HistoryView.tsx
import { useMemo } from "react";
import {
  loadHistoryFromStorage,
  type HistoryItem,
} from "../lib/decisionHistory";

export function HistoryView() {
  const history: HistoryItem[] = useMemo(
    () => loadHistoryFromStorage(),
    [],
  );

  if (!history.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-white/5">
        <h2 className="mb-2 text-sm font-semibold opacity-80">
          History
        </h2>
        <p className="text-[11px] opacity-70">
          No decisions logged yet. Log an offer from the Decider tab to
          see it here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-slate-800 dark:bg-white/5">
      <h2 className="mb-3 text-sm font-semibold opacity-80">History</h2>
      <div className="max-h-80 overflow-auto text-sm">
        <table className="w-full border-collapse text-left">
          <thead className="text-[11px] uppercase tracking-wide opacity-60">
            <tr>
              <th className="py-1 pr-2">When</th>
              <th className="py-1 pr-2">Decision</th>
              <th className="py-1 pr-2">Payout</th>
              <th className="py-1 pr-2">Net</th>
              <th className="py-1 pr-2">$/hr (net)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="border-t border-slate-200/70 dark:border-slate-800/70">
                <td className="py-1 pr-2 text-[11px] opacity-70">
                  {new Date(item.decidedAtIso).toLocaleString()}
                </td>
                <td className="py-1 pr-2">
                  {item.accept ? "ACCEPT" : "REJECT"}
                </td>
                <td className="py-1 pr-2">
                  ${item.payout.toFixed(2)}
                </td>
                <td className="py-1 pr-2">
                  ${item.netPayout.toFixed(2)}
                </td>
                <td className="py-1 pr-2">
                  ${item.projectedNetPerHour.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] opacity-60">
        History is stored locally in your browser. Clearing site data will
        reset it.
      </p>
    </section>
  );
}
