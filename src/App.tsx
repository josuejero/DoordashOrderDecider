import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { AppLayout } from "./components/AppLayout";
import { DeciderOfferSection } from "./components/DeciderOfferSection";
import { DeciderShiftSection } from "./components/DeciderShiftSection";
import { HistoryView } from "./components/HistoryView";
import { ProfileTab } from "./components/ProfileTab";
import { useAppPersistence } from "./hooks/useAppPersistence";
import { useBackForwardCache } from "./hooks/useBackForwardCache";
import { useDecisionLogger } from "./hooks/useDecisionLogger";
import { useOfferUrlSync } from "./hooks/useOfferUrlSync";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import type { DecisionInput } from "./lib/decision";
import { buildExplanation } from "./lib/decisionExplanation";
import {
  fetchDriverProfile,
  syncDriverProfile,
  type DriverApiResponse,
} from "./lib/driverApi";
import { getInitialInputs } from "./lib/initialInputs";
import {
  cacheModelMetadata,
  loadCachedDriverProfile,
  loadCachedModelMetadata,
} from "./lib/offlineCache";
import {
  getInitialProfileState,
  saveProfileToStorage,
  type DecisionMode,
  type VehicleType,
} from "./lib/profile";
import { loadSettings } from "./lib/storage";
import type { TabId } from "./lib/tabs";
import {
  buildOfflineQuote,
  resolveQuote,
  type QuoteDisplayState,
} from "./lib/quoteApi";
export default function App() {
  const init = getInitialInputs();
  const profileInit = getInitialProfileState();
  const [decisionMode, setDecisionMode] = useState<DecisionMode>(
    () => profileInit.decisionMode,
  );
  const [preferredZones, setPreferredZones] = useState<string[]>(
    () => profileInit.preferredZones,
  );
  const [preferredTimeBuckets, setPreferredTimeBuckets] = useState<string[]>(
    () => profileInit.preferredTimeBuckets,
  );
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [profileSyncStatus, setProfileSyncStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [profileSyncMessage, setProfileSyncMessage] = useState<string | null>(
    null,
  );
  const [modelMetadata, setModelMetadata] = useState<{
    version: string | null;
    mode: DecisionMode | null;
    updatedAt?: string;
  } | null>(null);
  const hasHydratedProfile = useRef(false);
  const [settings] = useState(() => loadSettings());
  const [targetRatePerHour, setTargetRatePerHour] = useState(
    () => init.targetRatePerHour,
  );
  const [shiftStartHHMM, setShiftStartHHMM] = useState(
    () => init.shiftStartHHMM,
  );
  const [earnedSoFar, setEarnedSoFar] = useState(() => init.earnedSoFar);
  const [offerPayout, setOfferPayout] = useState(() => init.offerPayout);
  const [finishHHMM, setFinishHHMM] = useState(() => init.finishHHMM);
  const [miles, setMiles] = useState(() => init.miles);
  const [costPerMile, setCostPerMile] = useState(() => init.costPerMile);
  const [bufferMinutes, setBufferMinutes] = useState(() => init.bufferMinutes);
  const [pickupStoreType, setPickupStoreType] = useState(
    () => init.pickupStoreType,
  );
  const [pickupLocation, setPickupLocation] = useState(
    () => init.pickupLocation,
  );
  const [dropoffZone, setDropoffZone] = useState(() => init.dropoffZone);
  const [driverName, setDriverName] = useState(() => profileInit.driverName);
  const [driverId, setDriverId] = useState(() => settings?.driverId ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    () => profileInit.vehicleType,
  );
  const [activeTab, setActiveTab] = useState<TabId>("decider");
  const applyProfileFromBackend = (profile: DriverApiResponse) => {
    setDriverName(profile.name ?? "");
    setVehicleType(profile.vehicleType ?? "car");
    setDecisionMode(profile.decisionMode ?? "heuristic");
    setPreferredZones(profile.preferredZones ?? []);
    setPreferredTimeBuckets(profile.preferredTimeBuckets ?? []);
    if (typeof profile.targetRatePerHour === "number") {
      setTargetRatePerHour(profile.targetRatePerHour);
    }
    if (typeof profile.maintenanceCostPerMile === "number") {
      setCostPerMile(profile.maintenanceCostPerMile ?? 0);
    }
  };
  useEffect(() => {
    hasHydratedProfile.current = false;
  }, [driverId]);
  const decisionInput = useMemo<DecisionInput>(
    () => ({
      targetRatePerHour,
      shiftStartHHMM,
      earnedSoFar,
      offerPayout,
      finishHHMM,
      miles,
      costPerMile,
      bufferMinutes,
    }),
    [
      targetRatePerHour,
      shiftStartHHMM,
      earnedSoFar,
      offerPayout,
      finishHHMM,
      miles,
      costPerMile,
      bufferMinutes,
    ],
  );
  const isOnline = useOnlineStatus();
  const [quote, setQuote] = useState<QuoteDisplayState>(() =>
    buildOfflineQuote(decisionInput),
  );
  useEffect(() => {
    let cancelled = false;
    const offlineQuote = buildOfflineQuote(decisionInput);
    setQuote(offlineQuote);
    void (async () => {
      const fetched = await resolveQuote({
        input: decisionInput,
        driverId,
        isOnline,
      });
      if (!cancelled) {
        setQuote(fetched);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decisionInput, driverId, isOnline]);
  const result = quote.decision;
  const explanation = buildExplanation(decisionInput, result);
  useEffect(() => {
    if (!driverId) {
      return;
    }
    let cancelled = false;
    const hydrateProfile = async () => {
      const cached = await loadCachedDriverProfile(driverId);
      if (cancelled) return;
      if (cached && !hasHydratedProfile.current) {
        applyProfileFromBackend(cached);
        hasHydratedProfile.current = true;
        setProfileSyncMessage("Loaded cached profile for offline mode.");
      }
      if (!isOnline) return;
      try {
        const remote = await fetchDriverProfile(driverId);
        if (cancelled) return;
        applyProfileFromBackend(remote);
        hasHydratedProfile.current = true;
        setProfileSyncStatus("success");
        setProfileSyncMessage("Profile hydrated from backend.");
      } catch (err) {
        if (cancelled) return;
        setProfileSyncStatus("error");
        setProfileSyncMessage(
          err instanceof Error
            ? err.message
            : "Failed to load profile from backend",
        );
      }
    };
    void hydrateProfile();
    return () => {
      cancelled = true;
    };
  }, [driverId, isOnline]);
  useEffect(() => {
    if (!driverId) {
      setModelMetadata(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const cached = await loadCachedModelMetadata(driverId);
      if (cancelled || !cached) return;
      setModelMetadata({
        version: cached.modelVersion,
        mode: cached.mode,
        updatedAt: cached.updatedAt,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);
  useEffect(() => {
    if (!driverId || !isOnline) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/model/metadata");
        if (!res.ok) return;
        const json = (await res.json()) as {
          modelVersion?: string | null;
          trainedAt?: string | null;
        };
        if (cancelled) return;
        const version = json.modelVersion ?? null;
        const updatedAt = json.trainedAt ?? new Date().toISOString();
        setModelMetadata({
          version,
          mode: decisionMode,
          updatedAt,
        });
        await cacheModelMetadata({
          driverId,
          modelVersion: version,
          mode: decisionMode,
        });
      } catch { /* empty */ }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, isOnline, decisionMode]);
  const handleModelMetadata = useCallback(
    (meta: {
      version: string | null;
      mode: "heuristic" | "hybrid_ml" | null;
    }) => {
      setModelMetadata({
        version: meta.version,
        mode: meta.mode ?? "heuristic",
        updatedAt: new Date().toISOString(),
      });
    },
    [],
  );
  const resetOffer = () => {
    setOfferPayout(0);
    setMiles(0);
    setBufferMinutes(0);
    setPickupStoreType("");
    setPickupLocation("");
    setDropoffZone("");
  };
  const decisionLogger = useDecisionLogger({
    driverId,
    setDriverId,
    driverName,
    vehicleType,
    decisionMode,
    preferredZones,
    preferredTimeBuckets,
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
    pickupStoreType,
    pickupLocation,
    dropoffZone,
    result,
    explanation: explanation.join("\n"),
    isOnline,
    onAccept: () => {
      setEarnedSoFar((prev) => prev + result.netPayout);
      resetOffer();
    },
    onModelMetadata: handleModelMetadata,
  });
  const canLogDecision = decisionLogger?.canLogDecision ?? false;
  const handleLogDecision = decisionLogger?.handleLogDecision ?? (() => {});
  const pendingQueueCount = decisionLogger?.pendingQueueCount ?? 0;
  useAppPersistence({
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    costPerMile,
    driverId,
    driverName,
    vehicleType,
    decisionMode,
    preferredZones,
    preferredTimeBuckets,
    offerDraft: {
      offerPayout,
      finishHHMM,
      miles,
      bufferMinutes,
      pickupStoreType,
      pickupLocation,
      dropoffZone,
    },
  });
  useEffect(() => {
    saveProfileToStorage({
      driverName: driverName || undefined,
      vehicleType,
      decisionMode,
      preferredZones,
      preferredTimeBuckets,
    });
  }, [
    decisionMode,
    driverName,
    preferredTimeBuckets,
    preferredZones,
    vehicleType,
  ]);
  useOfferUrlSync({
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
  });
  useBackForwardCache();
  const finishLocal =
    result.finishIso &&
    new Date(result.finishIso).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  const handleSyncProfile = async () => {
    setIsSyncingProfile(true);
    setProfileSyncMessage(null);
    setProfileSyncStatus("idle");
    try {
      const driver = await syncDriverProfile({
        driverId,
        profile: {
          driverName,
          vehicleType,
          targetRatePerHour,
          costPerMile,
          decisionMode,
          preferredZones,
          preferredTimeBuckets,
        },
      });
      setDriverId(driver.id);
      applyProfileFromBackend(driver);
      hasHydratedProfile.current = true;
      setProfileSyncStatus("success");
      setProfileSyncMessage(
        "Profile saved to backend and cached for offline use.",
      );
    } catch (err) {
      setProfileSyncStatus("error");
      setProfileSyncMessage(
        err instanceof Error ? err.message : "Failed to sync profile",
      );
    } finally {
      setIsSyncingProfile(false);
    }
  };
  const deciderContent = (
    <div className="space-y-6">
      <DeciderShiftSection
        driverName={driverName}
        vehicleType={vehicleType}
        targetRatePerHour={targetRatePerHour}
        setTargetRatePerHour={setTargetRatePerHour}
        shiftStartHHMM={shiftStartHHMM}
        setShiftStartHHMM={setShiftStartHHMM}
        earnedSoFar={earnedSoFar}
        setEarnedSoFar={setEarnedSoFar}
        decisionMode={decisionMode}
      />

      <DeciderOfferSection
        offerPayout={offerPayout}
        setOfferPayout={setOfferPayout}
        finishHHMM={finishHHMM}
        setFinishHHMM={setFinishHHMM}
        miles={miles}
        setMiles={setMiles}
        costPerMile={costPerMile}
        setCostPerMile={setCostPerMile}
        bufferMinutes={bufferMinutes}
        setBufferMinutes={setBufferMinutes}
        pickupStoreType={pickupStoreType}
        setPickupStoreType={setPickupStoreType}
        pickupLocation={pickupLocation}
        setPickupLocation={setPickupLocation}
        dropoffZone={dropoffZone}
        setDropoffZone={setDropoffZone}
        result={result}
        explanation={explanation}
        quote={quote}
        finishLocal={finishLocal ?? null}
        canLogDecision={canLogDecision}
        onLogDecision={handleLogDecision}
        onResetOffer={resetOffer}
      />

      {pendingQueueCount > 0 ? (
        <p className="text-xs text-amber-400">
          {pendingQueueCount} decision
          {pendingQueueCount === 1 ? "" : "s"} pending sync.
        </p>
      ) : null}
    </div>
  );
  const profileContent = (
    <ProfileTab
      driverName={driverName}
      setDriverName={setDriverName}
      vehicleType={vehicleType}
      setVehicleType={setVehicleType}
      preferredZones={preferredZones}
      setPreferredZones={setPreferredZones}
      preferredTimeBuckets={preferredTimeBuckets}
      setPreferredTimeBuckets={setPreferredTimeBuckets}
      targetRatePerHour={targetRatePerHour}
      setTargetRatePerHour={setTargetRatePerHour}
      costPerMile={costPerMile}
      setCostPerMile={setCostPerMile}
      earnedSoFar={earnedSoFar}
      setEarnedSoFar={setEarnedSoFar}
      decisionMode={decisionMode}
      setDecisionMode={setDecisionMode}
      onSyncProfile={handleSyncProfile}
      isSyncingProfile={isSyncingProfile}
      syncStatus={profileSyncStatus}
      syncMessage={profileSyncMessage}
      modelMetadata={modelMetadata}
    />
  );
  const historyContent = (
    <HistoryView driverId={driverId || null} isOnline={isOnline} />
  );
  const analyticsContent = <AnalyticsDashboard driverId={driverId || null} />;
  const activeContent =
    activeTab === "history"
      ? historyContent
      : activeTab === "analytics"
        ? analyticsContent
        : activeTab === "profile"
          ? profileContent
          : deciderContent;
  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isOnline={isOnline}
    >
      {activeContent}
    </AppLayout>
  );
}
