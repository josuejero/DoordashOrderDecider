// src/lib/driverApi.ts
import type { DecisionMode, VehicleType } from "./profile";
import { cacheDriverProfile } from "./offlineCache";

export type DriverProfilePayload = {
  driverName: string;
  vehicleType: VehicleType;
  targetRatePerHour: number;
  costPerMile: number;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
};

export type DriverApiResponse = {
  id: string;
  name: string;
  targetRatePerHour: number;
  maintenanceCostPerMile: number | null;
  vehicleType: VehicleType;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
};

export async function syncDriverProfile(options: {
  driverId?: string | null;
  profile: DriverProfilePayload;
}): Promise<DriverApiResponse> {
  const { driverId, profile } = options;

  const payload = {
    name: profile.driverName || "Unnamed driver",
    targetRatePerHour: profile.targetRatePerHour,
    vehicleType: profile.vehicleType,
    fuelCostPerUnit: null,
    maintenanceCostPerMile: profile.costPerMile ?? null,
    decisionMode: profile.decisionMode,
    preferredZones: profile.preferredZones ?? [],
    preferredTimeBuckets: profile.preferredTimeBuckets ?? [],
  };

  try {
    const res = await fetch(
      driverId ? `/api/drivers/${driverId}` : "/api/drivers",
      {
        method: driverId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Failed to sync profile (${res.status} ${res.statusText})`,
      );
    }

    const json = (await res.json()) as DriverApiResponse;
    await cacheDriverProfile(json);
    return json;
  } catch (err) {
    const queuedOffline =
      typeof navigator !== "undefined" &&
      navigator.onLine === false &&
      !!navigator.serviceWorker?.controller;

    if (queuedOffline) {
      throw new Error(
        "Offline: profile update queued and will sync once you are online.",
      );
    }

    if (err instanceof Error) {
      throw err;
    }

    throw new Error("Failed to sync profile");
  }
}

export async function fetchDriverProfile(
  driverId: string,
): Promise<DriverApiResponse> {
  const res = await fetch(`/api/drivers/${driverId}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to load profile (${res.status} ${res.statusText})`,
    );
  }

  const json = (await res.json()) as DriverApiResponse;
  await cacheDriverProfile(json);
  return json;
}
