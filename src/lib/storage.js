// Local persistence of basic settings. Tolerant of empty/malformed data.
const KEY = "doordash-decider:v1:settings";
export function loadSettings() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
export function saveSettings(s) {
    try {
        localStorage.setItem(KEY, JSON.stringify(s));
    }
    catch {
        // ignore
    }
}
