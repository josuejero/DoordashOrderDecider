import type { ReactNode } from "react";
import { TABS, type TabId } from "../lib/tabs";

type AppLayoutProps = {
  children: ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isOnline: boolean;
};

export function AppLayout({
  children,
  activeTab,
  onTabChange,
  isOnline,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-tight">
                DoorDash Order Decider
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isOnline
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-rose-500/10 text-rose-300"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <nav className="mt-3">
            <div className="flex space-x-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <footer className="border-t border-slate-800/60 bg-slate-900/40 py-4">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-slate-500">
          <p>
            DoorDash Order Decider • Decision tool for delivery drivers •{" "}
            {isOnline ? "Syncing with cloud" : "Working offline"}
          </p>
        </div>
      </footer>
    </div>
  );
}
