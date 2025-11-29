// src/lib/tabs.ts
export type TabId = "decider" | "history" | "analytics" | "profile";

export const TABS: { id: TabId; label: string }[] = [
  { id: "decider", label: "Decider" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
  { id: "profile", label: "Profile" },
];
