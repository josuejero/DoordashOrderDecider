// src/lib/profile.ts
export type VehicleType = "car" | "bike" | "scooter" | "other";

export type ProfilePersisted = {
  driverName?: string;
  vehicleType?: VehicleType;
};

const PROFILE_KEY = "doordash-decider:v1:profile";

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
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function getInitialProfileState(): {
  driverName: string;
  vehicleType: VehicleType;
} {
  if (typeof window === "undefined") {
    return { driverName: "", vehicleType: "car" };
  }
  const persisted = loadProfileFromStorage();
  return {
    driverName: persisted.driverName ?? "",
    vehicleType: persisted.vehicleType ?? "car",
  };
}
