export interface Settings {
  driverId: string | null;
  driverNickname: string | null;
}
const KEY = "dd_settings_v1";
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { driverId: null, driverNickname: null };
    }
    return JSON.parse(raw);
  } catch {
    return { driverId: null, driverNickname: null };
  }
}
export function saveSettings(settings: Settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
