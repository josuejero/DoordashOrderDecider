import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  DecisionEngineRequestSchema,
  callDecisionEngine,
  DecisionEngineUnavailableError,
} from "../clients/decision-engine.js";
import { CORRELATION_HEADER } from "../correlation.js";

const IDEMPOTENCY_HEADER = "idempotency-key";

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function sanitizeKey(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function registerQuoteRoutes(app: FastifyInstance) {
  app.post("/api/quote", async (request, reply) => {
    const parsed = DecisionEngineRequestSchema.parse(request.body);
    const correlationId = request.correlationId;
    const headerKey = sanitizeKey(
      getHeaderValue(request.headers[IDEMPOTENCY_HEADER]),
    );
    const bodyKey = sanitizeKey(parsed.idempotencyKey);
    const idempotencyKey = headerKey ?? bodyKey ?? randomUUID();
    const payload = {
      ...parsed,
      idempotencyKey,
    };
    request.log.info(
      { correlationId, idempotencyKey },
      "forwarding quote request to decision engine",
    );
    try {
      const result = await callDecisionEngine(payload, {
        headers: {
          [IDEMPOTENCY_HEADER]: idempotencyKey,
          [CORRELATION_HEADER]: correlationId,
        },
        idempotencyKey,
      });
      const contentType = result.headers["content-type"];
      if (contentType) {
        reply.header("content-type", contentType);
      }
      reply.code(result.status);
      return result.body;
    } catch (err) {
      if (err instanceof DecisionEngineUnavailableError) {
        reply.code(err.status);
        return {
          code: err.code,
          message: err.message,
          correlationId,
          retryable: err.retryable,
        };
      }
      throw err;
    }
  });
}
