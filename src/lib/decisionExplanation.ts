import type { DecisionInput, DecisionResult } from "./decision";

export function buildExplanation(
  input: DecisionInput,
  result: DecisionResult,
): string[] {
  const action = result.accept ? "ACCEPT" : "REJECT";
  const comparison = result.accept ? "≥" : "<";

  const netStr = result.netPayout.toFixed(2);
  const reqStr = result.requiredDollars.toFixed(2);
  const targetStr = input.targetRatePerHour.toFixed(2);

  const miles = input.miles ?? 0;
  const cpm = input.costPerMile ?? 0;

  const explanations: string[] = [];

  if (miles > 0 && cpm > 0) {
    explanations.push(
      `${action} because net $${netStr} after ${miles.toFixed(
        1,
      )} mi @ $${cpm.toFixed(2)}/mi ${comparison} required $${reqStr} to stay on pace for $${targetStr}/hr.`,
    );
  } else {
    explanations.push(
      `${action} because net $${netStr} ${comparison} required $${reqStr} to stay on pace for $${targetStr}/hr.`,
    );
  }

  if (result.projectedNetPerHour !== result.projectedGrossPerHour) {
    explanations.push(
      `Projected net: $${result.projectedNetPerHour.toFixed(
        2,
      )}/hr (gross: $${result.projectedGrossPerHour.toFixed(2)}/hr).`,
    );
  } else {
    explanations.push(
      `Projected average: $${result.projectedGrossPerHour.toFixed(2)}/hr.`,
    );
  }

  return explanations;
}
