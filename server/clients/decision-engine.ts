import { z } from "zod";
import { loadEnv } from "../config/env.js";

export const DecisionEngineRequestSchema = z.object({
  rulesetKey: z.string().min(1),
  driverId: z.string().uuid(),
  platform: z.enum(["doordash"]).default("doordash"),
  targetRatePerHour: z.number().positive(),
  shiftStartHHMM: z.string().min(1),
  finishHHMM: z.string().min(1),
  earnedSoFar: z.number().nonnegative(),
  offerPayout: z.number().nonnegative(),
  miles: z.number().nonnegative().optional(),
  costPerMile: z.number().nonnegative().optional(),
  bufferMinutes: z.number().nonnegative().optional(),
  pickupStoreType: z.string().min(1).optional(),
  pickupLocation: z.string().min(1).optional(),
  dropoffZone: z.string().min(1).optional(),
  zoneName: z.string().min(1).optional(),
  zoneCity: z.string().min(1).optional(),
  zoneRegion: z.string().min(1).optional(),
  finalDecision: z.enum(["ACCEPT", "REJECT"]).optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export type DecisionEngineRequest = z.infer<typeof DecisionEngineRequestSchema>;

export type DecisionEngineResult = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export type DecisionEngineCallOptions = {
  headers?: Record<string, string | undefined | null>;
  idempotencyKey?: string;
};

const BASE_HEADERS: Record<string, string> = {
  accept: "application/json",
  "content-type": "application/json",
};

function getEnv() {
  return loadEnv();
}

export class DecisionEngineUnavailableError extends Error {
  readonly status = 503;
  readonly code = "dependency_unavailable";
  readonly retryable = true;
  public cause?: Error;

  constructor(message = "Decision engine is temporarily unavailable", cause?: unknown) {
    super(message);
    this.name = "DecisionEngineUnavailableError";
    Object.setPrototypeOf(this, DecisionEngineUnavailableError.prototype);
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

function buildQuoteUrl(base: string): string {
  try {
    return new URL("quote", base).toString();
  } catch {
    return `${base.replace(/\/$/, "")}/quote`;
  }
}

function buildHeaders(custom?: Record<string, string | undefined | null>): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_HEADERS };
  if (!custom) {
    return headers;
  }
  for (const [key, value] of Object.entries(custom)) {
    if (typeof value === "string" && value.length > 0) {
      headers[key] = value;
    }
  }
  return headers;
}

function shouldRetry(status: number): boolean {
  return status >= 500 && status < 600;
}

async function pause(ms: number) {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractHeaders(response: Response): Record<string, string> {
  const values: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (value.length) {
      values[key.toLowerCase()] = value;
    }
  });
  return values;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function callDecisionEngine(
  payload: DecisionEngineRequest,
  opts: DecisionEngineCallOptions = {},
): Promise<DecisionEngineResult> {
  const env = getEnv();
  const url = buildQuoteUrl(env.DECISION_ENGINE_URL);
  const requestHeaders = buildHeaders(opts.headers);
  const maxAttempts = Math.max(1, env.DECISION_ENGINE_MAX_RETRIES + 1);
  const canRetry = Boolean(opts.idempotencyKey);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      timeoutId = setTimeout(
        () => controller.abort(),
        env.DECISION_ENGINE_TIMEOUT_MS,
      );
      const response = await fetch(url, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (attempt < maxAttempts && canRetry && shouldRetry(response.status)) {
        await pause(env.DECISION_ENGINE_RETRY_DELAY_MS);
        continue;
      }
      const body = await parseResponseBody(response);
      const responseHeaders = extractHeaders(response);
      return {
        status: response.status,
        headers: responseHeaders,
        body,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= maxAttempts || !canRetry) {
        break;
      }
      await pause(env.DECISION_ENGINE_RETRY_DELAY_MS);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw new DecisionEngineUnavailableError(
    "Decision engine is temporarily unavailable",
    lastError ?? undefined,
  );
}
