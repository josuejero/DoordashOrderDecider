// src/lib/tabs.ts
import { ENABLE_ANALYTICS_UI } from "./config";

export type TabId = "decider" | "history" | "analytics" | "profile";

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: "decider", label: "Decider" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
  { id: "profile", label: "Profile" },
];

export const TABS: { id: TabId; label: string }[] = ENABLE_ANALYTICS_UI
  ? ALL_TABS
  : ALL_TABS.filter((tab) => tab.id !== "analytics");
