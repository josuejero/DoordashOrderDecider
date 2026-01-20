import type { DecisionInput, DecisionResult } from "./decision";
import { computeDecision } from "./decision";

const CACHE_STORAGE_KEY = "dd:quote:cache:v1";
const CACHE_LIMIT = 12;
const DEFAULT_RULESET_KEY =
  (import.meta.env.VITE_RULESET_KEY as string | undefined) ?? "default";

type QuoteCacheEntry = {
  savedAt: string;
  quote: QuoteDisplayState;
};

const quoteCache: Record<string, QuoteCacheEntry> = loadQuoteCache();

export type QuoteSource = "online" | "offline";

export type QuoteExplanationNode = {
  title: string;
  value: string | number | boolean | null;
  children: QuoteExplanationNode[];
};

export type QuoteDisplayState = {
  decision: DecisionResult;
  recommendation: "ACCEPT" | "REJECT";
  source: QuoteSource;
  isEstimate: boolean;
  updatedAt: string;
  netRange: {
    min: number;
    max: number;
  };
  confidence: number;
  ruleVersion: string | null;
  correlationId: string | null;
  quoteId: string | null;
  rulesetKey: string | null;
  explanationTree: QuoteExplanationNode[];
};

export type QuoteRequestOptions = {
  input: DecisionInput;
  driverId?: string | null;
  isOnline: boolean;
};

export async function resolveQuote(
  options: QuoteRequestOptions,
): Promise<QuoteDisplayState> {
  const { input, driverId, isOnline } = options;
  const offlineQuote = buildOfflineQuote(input);
  if (!isOnline || !driverId || !canCallQuoteApi(input)) {
    return offlineQuote;
  }
  const fingerprint = buildOfferFingerprint(input, driverId);
  const cached = getCachedQuote(fingerprint);
  if (cached) {
    return cached;
  }
  const onlineQuote = await fetchOnlineQuote({
    driverId,
    input,
  });
  if (onlineQuote) {
    storeCachedQuote(fingerprint, onlineQuote);
    return onlineQuote;
  }
  return offlineQuote;
}

export function buildOfflineQuote(input: DecisionInput): QuoteDisplayState {
  const decision = computeDecision(input);
  const range = buildNetRange(decision);
  const { hours } = computeWindowDetails(input);
  const requiredRate = hours > 0 ? decision.requiredDollars / hours : 0;
  return {
    decision,
    recommendation: decision.accept ? "ACCEPT" : "REJECT",
    source: "offline",
    isEstimate: true,
    updatedAt: new Date().toISOString(),
    netRange: range,
    confidence: computeConfidence(decision.projectedNetPerHour, requiredRate),
    ruleVersion: null,
    correlationId: null,
    quoteId: null,
    rulesetKey: null,
    explanationTree: buildOfflineTree(input, decision, hours),
  };
}

function canCallQuoteApi(input: DecisionInput): boolean {
  return Boolean(
    input.offerPayout > 0 &&
      input.shiftStartHHMM &&
      input.finishHHMM &&
      input.targetRatePerHour > 0,
  );
}

function buildNetRange(decision: DecisionResult) {
  return {
    min: decision.projectedNetPerHour,
    max: decision.projectedGrossPerHour,
  };
}

function fetchOnlineQuote(options: {
  driverId: string;
  input: DecisionInput;
}): Promise<QuoteDisplayState | null> {
  const payload = buildQuotePayload(options.input, options.driverId);
  if (!payload) {
    return Promise.resolve(null);
  }
  return callQuoteApi(payload, options.input);
}

type QuotePayload = Awaited<ReturnType<typeof buildQuotePayload>>;

function buildQuotePayload(
  input: DecisionInput,
  driverId: string,
): QuotePayload | null {
  try {
    const { totalMinutes } = computeWindowDetails(input);
    const distanceMiles = Math.max(0.1, Number(input.miles ?? 0.1));
    const bufferMinutes = Math.max(
      0,
      Math.floor(Number(input.bufferMinutes ?? 0)),
    );
    const payload: {
      offerId: string;
      rulesetKey: string;
      driverId: string;
      payout: number;
      distanceMiles: number;
      estimatedMinutes: number;
      targetHourlyRate: number;
      availableMinutes: number;
      shiftStartHHMM: string;
      finishHHMM: string;
      earnedSoFar: number;
      bufferMinutes?: number;
      costPerMile?: number;
      idempotencyKey: string;
      platform: "doordash";
    } = {
      offerId: buildOfferId(input, driverId),
      rulesetKey: DEFAULT_RULESET_KEY,
      driverId,
      payout: input.offerPayout,
      distanceMiles,
      estimatedMinutes: Math.max(1, Math.floor(totalMinutes)),
      targetHourlyRate: input.targetRatePerHour,
      availableMinutes: Math.max(1, Math.floor(totalMinutes)),
      shiftStartHHMM: input.shiftStartHHMM,
      finishHHMM: input.finishHHMM,
      earnedSoFar: input.earnedSoFar,
      idempotencyKey: buildOfferFingerprint(input, driverId),
      platform: "doordash",
    };
    if (bufferMinutes > 0) {
      payload.bufferMinutes = bufferMinutes;
    }
    const costPerMile = Number(input.costPerMile ?? 0);
    if (Number.isFinite(costPerMile) && costPerMile > 0) {
      payload.costPerMile = costPerMile;
    }
    return payload;
  } catch {
    return null;
  }
}

function buildOfferId(input: DecisionInput, driverId: string) {
  const fingerprint = buildOfferFingerprint(input, driverId);
  return `offer-${fingerprint.replace(/\|/g, "-")}`;
}

function buildOfferFingerprint(input: DecisionInput, driverId: string) {
  const values = [
    driverId,
    input.targetRatePerHour,
    input.shiftStartHHMM,
    input.finishHHMM,
    input.offerPayout,
    input.earnedSoFar,
    input.miles ?? "",
    input.costPerMile ?? "",
    input.bufferMinutes ?? "",
  ];
  return values.join("|");
}

async function callQuoteApi(
  payload: QuotePayload,
  input: DecisionInput,
): Promise<QuoteDisplayState | null> {
  try {
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": payload.idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      quoteId?: string;
      rulesetKey?: string;
      ruleVersion?: { version: string };
      decision?: "ACCEPT" | "REJECT";
      quoteDecision?: {
        netPayout: number;
        requiredDollars: number;
        projectedGrossPerHour: number;
        projectedNetPerHour: number;
        finishIso?: string | null;
      };
      evaluatedAt?: string;
      explanations?: QuoteExplanationNode[];
      correlationId?: string;
    };
    const decisionPayload = json.quoteDecision;
    if (!decisionPayload) {
      return null;
    }
    const decision: DecisionResult = {
      netPayout: Number(decisionPayload.netPayout ?? 0),
      accept: (json.decision ?? "REJECT") === "ACCEPT",
      requiredDollars: Number(decisionPayload.requiredDollars ?? 0),
      projectedGrossPerHour: Number(
        decisionPayload.projectedGrossPerHour ?? 0,
      ),
      projectedNetPerHour: Number(decisionPayload.projectedNetPerHour ?? 0),
      finishIso: decisionPayload.finishIso ?? undefined,
    };
  const { hours } = computeWindowDetails(input);
    const requiredRate = hours > 0 ? decision.requiredDollars / hours : 0;
    return {
      decision,
      recommendation: json.decision ?? (decision.accept ? "ACCEPT" : "REJECT"),
      source: "online",
      isEstimate: false,
      updatedAt: json.evaluatedAt ?? new Date().toISOString(),
      netRange: buildNetRange(decision),
      confidence: computeConfidence(decision.projectedNetPerHour, requiredRate),
      ruleVersion: json.ruleVersion?.version ?? null,
      correlationId: json.correlationId ?? null,
      quoteId: json.quoteId ?? null,
      rulesetKey: json.rulesetKey ?? null,
      explanationTree: Array.isArray(json.explanations)
        ? parseExplanationNodes(json.explanations)
        : [],
    };
  } catch {
    return null;
  }
}

function parseExplanationNodes(nodes: QuoteExplanationNode[]): QuoteExplanationNode[] {
  return nodes.map((node) => ({
    title: node.title,
    value: node.value ?? null,
    children: node.children ? parseExplanationNodes(node.children) : [],
  }));
}

function computeWindowDetails(input: DecisionInput) {
  const parse = (hhmm: string) => {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? "");
    if (!match) {
      throw new Error(`Invalid time: ${hhmm}`);
    }
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const start = parse(input.shiftStartHHMM);
  const finish = parse(input.finishHHMM);
  let adjustedFinish = finish;
  if (finish < start) {
    adjustedFinish += 24 * 60;
  }
  const buffer = Math.max(0, Math.floor(Number(input.bufferMinutes ?? 0)));
  let totalMinutes = adjustedFinish - start + buffer;
  if (totalMinutes < 1) {
    totalMinutes = 1;
  }
  return {
    totalMinutes,
    hours: totalMinutes / 60,
  };
}

function computeConfidence(projectedNet: number, requiredRate: number) {
  if (!Number.isFinite(requiredRate) || requiredRate <= 0) {
    return projectedNet >= 0 ? 1 : 0;
  }
  const margin = projectedNet - requiredRate;
  const ratio = margin / Math.max(requiredRate, 1);
  const clamped = Math.max(-1, Math.min(1, ratio));
  return (clamped + 1) / 2;
}

function buildOfflineTree(
  input: DecisionInput,
  decision: DecisionResult,
  hours: number,
): QuoteExplanationNode[] {
  const miles = Number(input.miles ?? 0);
  const costPerMile = Number(input.costPerMile ?? 0);
  const variableCost = miles * costPerMile;
  const meetsRequired = decision.netPayout >= decision.requiredDollars;
  return [
    {
      title: "Time window",
      value: null,
      children: [
        {
          title: "Shift start",
          value: input.shiftStartHHMM,
          children: [],
        },
        {
          title: "Finish target",
          value: input.finishHHMM,
          children: [],
        },
        {
          title: "Buffer minutes",
          value: Math.max(0, Math.floor(Number(input.bufferMinutes ?? 0))),
          children: [],
        },
        {
          title: "Window hours",
          value: Number(hours.toFixed(2)),
          children: [],
        },
      ],
    },
    {
      title: "Costs",
      value: null,
      children: [
        {
          title: "Offer payout",
          value: input.offerPayout.toFixed(2),
          children: [],
        },
        {
          title: "Distance (miles)",
          value: Number(miles.toFixed(2)),
          children: [],
        },
        {
          title: "Cost per mile",
          value: Number(costPerMile.toFixed(2)),
          children: [],
        },
        {
          title: "Variable cost",
          value: Number(variableCost.toFixed(2)),
          children: [],
        },
        {
          title: "Net payout",
          value: decision.netPayout.toFixed(2),
          children: [],
        },
      ],
    },
    {
      title: "Pacing",
      value: null,
      children: [
        {
          title: "Target rate",
          value: input.targetRatePerHour.toFixed(2),
          children: [],
        },
        {
          title: "Earned so far",
          value: input.earnedSoFar.toFixed(2),
          children: [],
        },
        {
          title: "Required dollars",
          value: decision.requiredDollars.toFixed(2),
          children: [],
        },
        {
          title: "Projected gross/hr",
          value: decision.projectedGrossPerHour.toFixed(2),
          children: [],
        },
        {
          title: "Projected net/hr",
          value: decision.projectedNetPerHour.toFixed(2),
          children: [],
        },
        {
          title: "Net meets required",
          value: meetsRequired,
          children: [],
        },
      ],
    },
  ];
}

function loadQuoteCache(): Record<string, QuoteCacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, QuoteCacheEntry>;
  } catch {
    return {};
  }
}

function persistQuoteCache(cache: Record<string, QuoteCacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    void 0;
  }
}

function getCachedQuote(hash: string): QuoteDisplayState | null {
  const entry = quoteCache[hash];
  if (!entry) return null;
  return entry.quote;
}

function storeCachedQuote(hash: string, quote: QuoteDisplayState) {
  quoteCache[hash] = {
    savedAt: new Date().toISOString(),
    quote,
  };
  pruneCache();
  persistQuoteCache(quoteCache);
}

function pruneCache() {
  const keys = Object.keys(quoteCache);
  if (keys.length <= CACHE_LIMIT) return;
  const sorted = keys.sort((a, b) => {
    const aTime = Date.parse(quoteCache[a]?.savedAt ?? "");
    const bTime = Date.parse(quoteCache[b]?.savedAt ?? "");
    return aTime - bTime;
  });
  while (sorted.length > CACHE_LIMIT) {
    const key = sorted.shift();
    if (key) {
      delete quoteCache[key];
    }
  }
}
