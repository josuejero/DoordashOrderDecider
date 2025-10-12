export type Settings = {
  targetRatePerHour?: number;
  shiftStartHHMM?: string;
  earnedSoFar?: number;
  costPerMile?: number;
};

const KEY = "doordash-decider:v1:settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Settings) : {};
  } catch {
    return {};
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    void 0;
  }
}
