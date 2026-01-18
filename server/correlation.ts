import { randomUUID } from "node:crypto";

export const CORRELATION_HEADER = "x-correlation-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function sanitize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveCorrelationId(value: string | string[] | undefined): string {
  const candidate = sanitize(getHeaderValue(value));
  if (candidate && UUID_PATTERN.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}
