import {
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { buildApp } from "../app.js";

const app = buildApp();
await app.ready();

describe("quote routes contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("forwards payload to the decision engine and mirrors the response", async () => {
    const payload = {
      rulesetKey: "default",
      driverId: "11111111-1111-4111-8111-111111111111",
      targetRatePerHour: 25,
      shiftStartHHMM: "09:00",
      finishHHMM: "10:00",
      earnedSoFar: 0,
      offerPayout: 30,
      idempotencyKey: "contract-key",
    };
    const engineBody = { quoteId: "quote-123" };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(engineBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.inject({
      method: "POST",
      url: "/api/quote",
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(engineBody);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBe(payload.idempotencyKey);
    expect(init.headers["X-Correlation-Id"]).toBeDefined();
    const body = JSON.parse(init.body as string);
    expect(body.rulesetKey).toBe(payload.rulesetKey);
  });

  it("returns 503 + retryable when the decision engine is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.inject({
      method: "POST",
      url: "/api/quote",
      payload: {
        rulesetKey: "default",
        driverId: "22222222-2222-4222-8222-222222222222",
        targetRatePerHour: 20,
        shiftStartHHMM: "08:00",
        finishHHMM: "09:00",
        earnedSoFar: 0,
        offerPayout: 25,
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: "dependency_unavailable",
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("bubbles a timeout when the decision engine becomes slow", async () => {
    const originalTimeout = process.env.DECISION_ENGINE_TIMEOUT_MS;
    const originalRetries = process.env.DECISION_ENGINE_MAX_RETRIES;
    process.env.DECISION_ENGINE_TIMEOUT_MS = "10";
    process.env.DECISION_ENGINE_MAX_RETRIES = "0";
    try {
      const createAbortError = () => {
        if (typeof DOMException !== "undefined") {
          return new DOMException("Aborted", "AbortError");
        }
        const error = new Error("Aborted");
        error.name = "AbortError";
        return error;
      };
      const fetchMock = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(createAbortError()));
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const response = await app.inject({
        method: "POST",
        url: "/api/quote",
        payload: {
          rulesetKey: "default",
          driverId: "33333333-3333-4333-8333-333333333333",
          targetRatePerHour: 20,
          shiftStartHHMM: "08:00",
          finishHHMM: "09:00",
          earnedSoFar: 0,
          offerPayout: 25,
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        code: "dependency_unavailable",
        retryable: true,
      });
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      process.env.DECISION_ENGINE_TIMEOUT_MS = originalTimeout;
      process.env.DECISION_ENGINE_MAX_RETRIES = originalRetries;
    }
  });
});
