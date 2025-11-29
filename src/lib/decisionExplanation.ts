// src/lib/decisionExplanation.ts
import type { DecisionInput, DecisionResult } from "./decision";

export function buildExplanation(
  input: DecisionInput,
  result: DecisionResult,
): string {
  const action = result.accept ? "ACCEPT" : "REJECT";
  const comparison = result.accept ? "≥" : "<";

  const netStr = result.netPayout.toFixed(2);
  const reqStr = result.requiredDollars.toFixed(2);
  const targetStr = input.targetRatePerHour.toFixed(2);

  const miles = input.miles ?? 0;
  const cpm = input.costPerMile ?? 0;

  let base: string;
  if (miles > 0 && cpm > 0) {
    base = `${action} because net $${netStr} after ${miles.toFixed(
      1,
    )} mi @ $${cpm.toFixed(
      2,
    )}/mi ${comparison} required $${reqStr} to stay on pace for $${targetStr}/hr.`;
  } else {
    base = `${action} because net $${netStr} ${comparison} required $${reqStr} to stay on pace for $${targetStr}/hr.`;
  }

  const projected =
    result.projectedNetPerHour !== result.projectedGrossPerHour
      ? `Projected net: $${result.projectedNetPerHour.toFixed(
          2,
        )}/hr (gross: $${result.projectedGrossPerHour.toFixed(2)}/hr).`
      : `Projected average: $${result.projectedGrossPerHour.toFixed(2)}/hr.`;

  return `${base} ${projected}`;
}
