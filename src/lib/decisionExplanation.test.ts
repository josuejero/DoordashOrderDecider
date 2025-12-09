import { describe, expect, test } from "vitest";
import { computeDecision, type DecisionInput } from "../lib/decision";
import { buildExplanation } from "../lib/decisionExplanation";

function makeInput(partial: Partial<DecisionInput> = {}): DecisionInput {
  return {
    targetRatePerHour: 25,
    shiftStartHHMM: "18:00",
    earnedSoFar: 0,
    offerPayout: 30, // base case for a "good" order
    finishHHMM: "19:00",
    miles: undefined,
    costPerMile: undefined,
    ...partial,
  };
}

describe("buildExplanation", () => {
  test("describes ACCEPT with miles and costPerMile", () => {
    const input = makeInput({ miles: 10, costPerMile: 0.5 });
    const result = computeDecision(input);

    // sanity check: we really are in an ACCEPT case
    expect(result.accept).toBe(true);

    const explanation = buildExplanation(input, result);

    expect(Array.isArray(explanation)).toBe(true);
    expect(explanation).toHaveLength(2);
    expect(explanation[0]).toContain("ACCEPT because net");
    expect(explanation[0]).toContain("10.0 mi @ $0.50/mi");
    expect(explanation[1]).toMatch(/Projected (net|average):/);
  });

  test("falls back to explanation without mileage when miles/cpm missing", () => {
    // No miles/costPerMile ⇒ projected net == projected gross
    const input = makeInput({ miles: undefined, costPerMile: undefined });
    const result = computeDecision(input);

    expect(result.accept).toBe(true);

    const explanation = buildExplanation(input, result);

    expect(Array.isArray(explanation)).toBe(true);
    expect(explanation).toHaveLength(2);
    expect(explanation[0]).toContain("ACCEPT because net");
    expect(explanation[1]).toContain("Projected average:");
  });
});
