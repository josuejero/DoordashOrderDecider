export type VehicleType = "car" | "bike" | "scooter" | "other";
export type DecisionMode = "heuristic" | "hybrid_ml";
export interface DriverProfile {
  driverName: string;
  vehicleType: VehicleType;
  targetRatePerHour: number;
  costPerMile: number;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
}
export type ProfilePersisted = {
  driverName?: string;
  vehicleType?: VehicleType;
  decisionMode?: DecisionMode;
  preferredZones?: string[];
  preferredTimeBuckets?: string[];
};
const PROFILE_KEY = "doordash-decider:v1:profile";
function normalizeList(list?: string[]): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => item.trim()).filter(Boolean);
}
export function loadProfileFromStorage(): ProfilePersisted {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ProfilePersisted) : {};
  } catch {
    return {};
  }
}
export function saveProfileToStorage(profile: ProfilePersisted) {
  if (typeof window === "undefined") return;
  try {
    const normalized: ProfilePersisted = {
      ...profile,
      preferredZones: normalizeList(profile.preferredZones),
      preferredTimeBuckets: normalizeList(profile.preferredTimeBuckets),
    };
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  } catch { /* empty */ }
}
export function getInitialProfileState(): {
  driverName: string;
  vehicleType: VehicleType;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
} {
  if (typeof window === "undefined") {
    return {
      driverName: "",
      vehicleType: "car",
      decisionMode: "heuristic",
      preferredZones: [],
      preferredTimeBuckets: [],
    };
  }
  const persisted = loadProfileFromStorage();
  return {
    driverName: persisted.driverName ?? "",
    vehicleType: persisted.vehicleType ?? "car",
    decisionMode: persisted.decisionMode ?? "heuristic",
    preferredZones: normalizeList(persisted.preferredZones),
    preferredTimeBuckets: normalizeList(persisted.preferredTimeBuckets),
  };
}
