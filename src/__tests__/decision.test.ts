import { describe, expect, test } from "vitest";
import { computeDecision, explainDecision } from "../lib/decision";
describe("computeDecision", () => {
  test("basic accept when net >= required", () => {
    const r = computeDecision({
      targetRatePerHour: 25,
      shiftStartHHMM: "18:00",
      earnedSoFar: 0,
      offerPayout: 30,
      finishHHMM: "19:00",
    });
    expect(r.requiredDollars).toBe(25);
    expect(r.netPayout).toBe(30);
    expect(r.accept).toBe(true);
    expect(r.projectedNetPerHour).toBe(30);
  });
  test("uses net (payout - miles*costPerMile)", () => {
    const r = computeDecision({
      targetRatePerHour: 20,
      shiftStartHHMM: "12:00",
      earnedSoFar: 0,
      offerPayout: 12,
      finishHHMM: "13:00",
      miles: 8,
      costPerMile: 0.5,
    });
    expect(r.netPayout).toBe(8);
    expect(r.requiredDollars).toBe(20);
    expect(r.accept).toBe(false);
  });
  test("buffer minutes increase required time cost", () => {
    const r = computeDecision({
      targetRatePerHour: 30,
      shiftStartHHMM: "10:00",
      earnedSoFar: 0,
      offerPayout: 30,
      finishHHMM: "11:00",
      bufferMinutes: 30,
    });
    expect(r.requiredDollars).toBe(45);
    expect(r.accept).toBe(false);
  });
  test("handles midnight crossover and returns finishIso", () => {
    const r = computeDecision({
      targetRatePerHour: 10,
      shiftStartHHMM: "23:30",
      earnedSoFar: 0,
      offerPayout: 10,
      finishHHMM: "00:15",
      bufferMinutes: 15,
    });
    expect(r.finishIso).toBeDefined();
  });
  test("negative inputs are clamped to 0 rather than throwing", () => {
    const r = computeDecision({
      targetRatePerHour: -10,
      shiftStartHHMM: "09:00",
      earnedSoFar: -100,
      offerPayout: 10,
      finishHHMM: "10:00",
      miles: -5,
      costPerMile: -1,
      bufferMinutes: -5,
    });
    expect(r.netPayout).toBe(10);
    expect(r.requiredDollars).toBe(0);
  });
  test("throws on invalid time strings", () => {
    expect(() =>
      computeDecision({
        targetRatePerHour: 20,
        shiftStartHHMM: "25:99",
        earnedSoFar: 0,
        offerPayout: 10,
        finishHHMM: "10:00",
      }),
    ).toThrow(/Invalid time/);
  });
  test("clamps very short durations to a minimum of one minute", () => {
    const r = computeDecision({
      targetRatePerHour: 60,
      shiftStartHHMM: "10:00",
      earnedSoFar: 0,
      offerPayout: 0,
      finishHHMM: "10:00",
    });
    expect(r.requiredDollars).toBeGreaterThan(0);
    expect(r.projectedNetPerHour).toBe(0);
    expect(r.accept).toBe(false);
  });
});
describe("explainDecision", () => {
  test("accept on target", () => {
    const input = {
      targetRatePerHour: 25,
      shiftStartHHMM: "18:00",
      earnedSoFar: 0,
      offerPayout: 25,
      finishHHMM: "19:00",
    };
    const result = computeDecision(input);
    const explanation = explainDecision(input, result);
    expect(explanation.code).toBe("ACCEPT_ON_TARGET");
  });
  test("reject below target", () => {
    const input = {
      targetRatePerHour: 30,
      shiftStartHHMM: "10:00",
      earnedSoFar: 0,
      offerPayout: 10,
      finishHHMM: "11:00",
    };
    const result = computeDecision(input);
    const explanation = explainDecision(input, result);
    expect(explanation.code).toBe("REJECT_BELOW_TARGET");
  });
  test("reports ahead-of-target acceptances", () => {
    const explanation = explainDecision(
      {
        targetRatePerHour: 40,
        shiftStartHHMM: "12:00",
        earnedSoFar: 0,
        offerPayout: 10,
        finishHHMM: "12:30",
      },
      {
        netPayout: 10,
        accept: true,
        requiredDollars: 5,
        projectedGrossPerHour: 20,
        projectedNetPerHour: 20,
        finishIso: undefined,
      },
    );
    expect(explanation.code).toBe("ACCEPT_AHEAD_OF_TARGET");
  });
});
