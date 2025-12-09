import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { insertFactShift } from "../db/analytics/factShifts.js";
import { createDbPool, getDbPool } from "../db/pool.js";
import type { Driver } from "../domain/model.js";
beforeAll(() => {
  createDbPool();
});
describe("fact_shifts helper", () => {
  it("inserts shift facts idempotently", async () => {
    const pool = getDbPool();
    const driver: Driver = {
      id: randomUUID(),
      name: "Shift Driver",
      targetRatePerHour: 30,
      vehicleType: "car",
      fuelCostPerUnit: 3,
      maintenanceCostPerMile: 0.2,
      decisionMode: "heuristic",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const shiftId = randomUUID();
    let nullShiftId: string | undefined;
    try {
      await insertFactShift({
        shiftId,
        driver,
        startedAt: new Date("2025-01-01T10:00:00Z"),
        endedAt: new Date("2025-01-01T11:00:00Z"),
        totalMiles: 12,
        deadMiles: 2,
        totalEarnings: 40,
      });
      await insertFactShift({
        shiftId,
        driver,
        startedAt: new Date("2025-01-01T10:00:00Z"),
        endedAt: new Date("2025-01-01T11:00:00Z"),
        totalMiles: 12,
        deadMiles: 2,
        totalEarnings: 40,
      });
      const { rows } = await pool.query(
        `
          SELECT shift_id, total_miles, dead_miles, total_earnings
          FROM fact_shifts
          WHERE shift_id = $1
        `,
        [shiftId],
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].total_miles)).toBe(12);
      expect(Number(rows[0].dead_miles)).toBe(2);
      expect(Number(rows[0].total_earnings)).toBe(40);
      nullShiftId = randomUUID();
      await insertFactShift({
        shiftId: nullShiftId!,
        driver,
        startedAt: new Date("2025-01-02T10:00:00Z"),
        endedAt: null,
        totalMiles: null,
        deadMiles: null,
        totalEarnings: null,
      });
      const nullRows = await pool.query(
        `SELECT total_miles, dead_miles, total_earnings FROM fact_shifts WHERE shift_id = $1`,
        [nullShiftId],
      );
      expect(nullRows.rows).toHaveLength(1);
      expect(Number(nullRows.rows[0].total_miles)).toBe(0);
      expect(Number(nullRows.rows[0].dead_miles)).toBe(0);
      expect(Number(nullRows.rows[0].total_earnings)).toBe(0);
    } finally {
      const ids = [shiftId, nullShiftId].filter(Boolean);
      if (ids.length) {
        await pool.query(
          `DELETE FROM fact_shifts WHERE shift_id = ANY($1::uuid[])`,
          [ids],
        );
      }
    }
  });
});
