import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callDecisionEngine, DecisionEngineRequestSchema } from "../clients/decision-engine.js";

const ENV_KEYS = [
  "DECISION_ENGINE_URL",
  "DECISION_ENGINE_TIMEOUT_MS",
  "DECISION_ENGINE_MAX_RETRIES",
  "DECISION_ENGINE_RETRY_DELAY_MS",
] as const;

describe("decision-engine client", () => {
  const snapshot: Record<typeof ENV_KEYS[number], string | undefined> = {
    DECISION_ENGINE_URL: undefined,
    DECISION_ENGINE_TIMEOUT_MS: undefined,
    DECISION_ENGINE_MAX_RETRIES: undefined,
    DECISION_ENGINE_RETRY_DELAY_MS: undefined,
  };

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      snapshot[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = snapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.restoreAllMocks();
  });

  it("forwards headers and returns the parsed payload", async () => {
    process.env.DECISION_ENGINE_URL = "http://mock.decision";
    process.env.DECISION_ENGINE_MAX_RETRIES = "1";
    process.env.DECISION_ENGINE_TIMEOUT_MS = "1000";
    process.env.DECISION_ENGINE_RETRY_DELAY_MS = "0";
    const payload = DecisionEngineRequestSchema.parse({
      rulesetKey: "sf-urban",
      driverId: "c4b2e4a5-2bf0-4f43-90ef-dce0f4f551d1",
      targetRatePerHour: 45,
      shiftStartHHMM: "08:00",
      finishHHMM: "12:00",
      earnedSoFar: 120,
      offerPayout: 28,
    });
    const responseBody = { quoteId: "abc-123" };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDecisionEngine(payload, {
      headers: {
        "Idempotency-Key": "idem-key",
        "X-Correlation-Id": "corr-id",
      },
      idempotencyKey: "idem-key",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://mock.decision/quote", {
      method: "POST",
      headers: expect.objectContaining({
        accept: "application/json",
        "content-type": "application/json",
        "Idempotency-Key": "idem-key",
        "X-Correlation-Id": "corr-id",
      }),
      body: JSON.stringify(payload),
      signal: expect.any(Object),
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual(responseBody);
    expect(result.headers["content-type"]).toBe("application/json");
  });

  it("retries once when a 5xx response and idempotency key are present", async () => {
    process.env.DECISION_ENGINE_URL = "http://mock.fail";
    process.env.DECISION_ENGINE_MAX_RETRIES = "1";
    process.env.DECISION_ENGINE_TIMEOUT_MS = "1000";
    process.env.DECISION_ENGINE_RETRY_DELAY_MS = "0";
    const payload = DecisionEngineRequestSchema.parse({
      rulesetKey: "cluster",
      driverId: "a4b2e4a5-2bf0-4f43-90ef-dce0f4f551d1",
      targetRatePerHour: 30,
      shiftStartHHMM: "09:00",
      finishHHMM: "10:00",
      earnedSoFar: 0,
      offerPayout: 20,
    });
    const first = new Response(JSON.stringify({ error: "retry" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
    const second = new Response(JSON.stringify({ quoteId: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDecisionEngine(payload, {
      headers: {
        "Idempotency-Key": "safe-key",
      },
      idempotencyKey: "safe-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ quoteId: "ok" });
  });

  it("does not retry when no idempotency key is supplied", async () => {
    process.env.DECISION_ENGINE_URL = "http://mock.noretry";
    process.env.DECISION_ENGINE_MAX_RETRIES = "2";
    process.env.DECISION_ENGINE_TIMEOUT_MS = "1000";
    process.env.DECISION_ENGINE_RETRY_DELAY_MS = "0";
    const payload = DecisionEngineRequestSchema.parse({
      rulesetKey: "west",
      driverId: "d4b2e4a5-2bf0-4f43-90ef-dce0f4f551d1",
      targetRatePerHour: 22,
      shiftStartHHMM: "13:00",
      finishHHMM: "14:00",
      earnedSoFar: 15,
      offerPayout: 18,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "die" }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDecisionEngine(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(504);
    expect(result.body).toEqual({ error: "die" });
  });
});
