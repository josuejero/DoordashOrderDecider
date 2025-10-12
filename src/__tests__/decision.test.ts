import { describe, expect, test } from "vitest";
import { computeDecision } from "../lib/decision";

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
    expect(r.netPayout).toBe(8); // 12 - 4
    expect(r.requiredDollars).toBe(20); // 1 hr * $20
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
});
