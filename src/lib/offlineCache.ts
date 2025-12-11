import type { DriverApiResponse } from "./driverApi";
type CachedProfile = {
  driverId: string;
  profile: DriverApiResponse;
  cachedAt: string;
};
type CachedModelMetadata = {
  driverId: string;
  modelVersion: string | null;
  mode: "heuristic" | "hybrid_ml";
  updatedAt: string;
};
const PROFILE_CACHE_KEY = "dd:profile-cache:v1";
const MODEL_CACHE_KEY = "dd:model-cache:v1";
const PROFILE_CACHE_STORAGE = "dd-profile-cache-v1";
const MODEL_CACHE_STORAGE = "dd-model-cache-v1";
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
async function putJsonInCache(
  cacheName: string,
  url: string,
  data: unknown,
): Promise<void> {
  if (typeof caches === "undefined") return;
  const cache = await caches.open(cacheName);
  const response = new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
  await cache.put(url, response);
}
async function readJsonFromCache<T>(
  cacheName: string,
  url: string,
): Promise<T | null> {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open(cacheName);
  const match = await cache.match(url);
  if (!match) return null;
  try {
    return (await match.json()) as T;
  } catch {
    return null;
  }
}
export async function cacheDriverProfile(profile: DriverApiResponse) {
  if (typeof window === "undefined") return;
  const entry: CachedProfile = {
    driverId: profile.id,
    profile,
    cachedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(entry));
  } catch { /* empty */ }
  await putJsonInCache(
    PROFILE_CACHE_STORAGE,
    `/api/drivers/${profile.id}`,
    profile,
  );
}
export async function cacheModelMetadata(meta: {
  driverId: string;
  modelVersion: string | null;
  mode: "heuristic" | "hybrid_ml";
}) {
  if (typeof window === "undefined") return;
  const entry: CachedModelMetadata = {
    ...meta,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(entry));
  } catch { /* empty */ }
  await putJsonInCache(MODEL_CACHE_STORAGE, "/api/model/metadata", entry);
}
export async function loadCachedDriverProfile(
  driverId: string,
): Promise<DriverApiResponse | null> {
  const local = safeParse<CachedProfile>(
    typeof window !== "undefined"
      ? localStorage.getItem(PROFILE_CACHE_KEY)
      : null,
  );
  if (local && local.driverId === driverId) {
    return local.profile;
  }
  const cached = await readJsonFromCache<DriverApiResponse>(
    PROFILE_CACHE_STORAGE,
    `/api/drivers/${driverId}`,
  );
  return cached ?? null;
}
export async function loadCachedModelMetadata(driverId: string) {
  const local = safeParse<CachedModelMetadata>(
    typeof window !== "undefined"
      ? localStorage.getItem(MODEL_CACHE_KEY)
      : null,
  );
  if (local && local.driverId === driverId) {
    return local;
  }
  return await readJsonFromCache<CachedModelMetadata>(
    MODEL_CACHE_STORAGE,
    "/api/model/metadata",
  );
}
