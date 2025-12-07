import "dotenv/config";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ensureDimDriverWithClient,
  ensureDimTimeWithClient,
  ensureDimZoneWithClient,
  type DimZoneAttrs,
} from "../db/analytics/dimensions.js";
import { createDbPool, getDbPool } from "../db/pool.js";
import type { DriverId } from "../domain/model.js";

beforeAll(() => {
  // Ensure the pool is initialized before we start using it
  createDbPool();
});

describe("analytics dimension helpers", () => {
  it("ensureDimDriverWithClient performs an idempotent upsert on dim_driver", async () => {
    const pool = getDbPool();
    const client = await pool.connect();

    const driverId = randomUUID() as DriverId;

    try {
      await client.query("BEGIN");

      await ensureDimDriverWithClient(client, driverId, {
        alias: "Test Driver v1",
        vehicleType: "car",
        targetHourlyRate: 25,
        fuelCostPerUnit: 3.5,
        maintenanceCostPerMile: 0.2,
      });

      // Second call with changed attributes should update the same row
      await ensureDimDriverWithClient(client, driverId, {
        alias: "Test Driver v2",
        vehicleType: "car",
        targetHourlyRate: 30,
        fuelCostPerUnit: 3.5,
        maintenanceCostPerMile: 0.2,
      });

      // Removing TRUNCATE here because it can fail if dim_zone is referenced by other tables.
      // If you need to reset dim_zone for isolation, consider test-specific schemas or explicit cleanup
      // with CASCADE in a controlled manner.
      // await client.query("TRUNCATE dim_zone RESTART IDENTITY");

      const { rows } = await client.query(
        `
          SELECT driver_id, alias, target_hourly_rate
          FROM dim_driver
          WHERE driver_id = $1
        `,
        [driverId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].alias).toBe("Test Driver v2");
      expect(Number(rows[0].target_hourly_rate)).toBe(30);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("ensureDimZoneWithClient reuses existing dim_zone rows for the same attributes", async () => {
    const pool = getDbPool();
    const client = await pool.connect();

    const attrs: DimZoneAttrs = {
      zoneName: "Analytics Test Zone",
      city: "Test City",
      region: "Test Region",
    };

    try {
      await client.query("BEGIN");

      const zoneId1 = await ensureDimZoneWithClient(client, attrs);
      const zoneId2 = await ensureDimZoneWithClient(client, attrs);

      expect(zoneId1).toBe(zoneId2);

      const { rows } = await client.query(
        `
          SELECT zone_id
          FROM dim_zone
          WHERE zone_name = $1
            AND city   IS NOT DISTINCT FROM $2
            AND region IS NOT DISTINCT FROM $3
        `,
        [attrs.zoneName, attrs.city, attrs.region],
      );

      expect(rows).toHaveLength(1);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("ensureDimTimeWithClient derives the correct time_of_day_bucket", async () => {
    const pool = getDbPool();
    const client = await pool.connect();

    // Mapping comes from the populate_dim_time_derived_fields() function:
    // - 05:00-11:59 -> morning
    // - 12:00-16:59 -> afternoon
    // - 17:00-21:59 -> evening
    // - else        -> night

    const mkTs = (hourUtc: number) =>
      new Date(Date.UTC(2024, 0, 1, hourUtc, 0, 0)); // 2024-01-01T{hour}:00:00Z

    try {
      await client.query("BEGIN");

      const morningId = await ensureDimTimeWithClient(client, mkTs(6));
      const afternoonId = await ensureDimTimeWithClient(client, mkTs(13));
      const eveningId = await ensureDimTimeWithClient(client, mkTs(18));
      const nightId = await ensureDimTimeWithClient(client, mkTs(2));

      const { rows } = await client.query(
        `
          SELECT time_id, time_of_day_bucket
          FROM dim_time
          WHERE time_id = ANY($1::int[])
        `,
        [[morningId, afternoonId, eveningId, nightId]],
      );

      const byId = new Map<number, string>();
      for (const row of rows) {
        byId.set(Number(row.time_id), row.time_of_day_bucket as string);
      }

      expect(byId.get(morningId)).toBe("morning");
      expect(byId.get(afternoonId)).toBe("afternoon");
      expect(byId.get(eveningId)).toBe("evening");
      expect(byId.get(nightId)).toBe("night");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
