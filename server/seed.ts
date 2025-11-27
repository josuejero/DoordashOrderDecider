
// server/seed.ts
// server/seed.ts
import { randomUUID } from "node:crypto";
import { computeDecision } from "../src/lib/decision.js";
import { insertDecision } from "./db/decisions.js";
import { createDriver } from "./db/drivers.js";
import { createOrder } from "./db/orders.js"; // 👈 new import
import { createDbPool } from "./db/pool.js";

async function main() {
  const pool = createDbPool();

  const driver = await createDriver({
    name: "Demo Driver",
    targetRatePerHour: 25,
    vehicleType: "car",
  });

  const decisionInput = {
    targetRatePerHour: 25,
    shiftStartHHMM: "18:00",
    earnedSoFar: 0,
    offerPayout: 20,
    finishHHMM: "19:00",
    miles: 5,
    costPerMile: 0.4,
    bufferMinutes: 5,
  };

  const result = computeDecision(decisionInput);

    const orderId = await createOrder({
    driverId: driver.id,
    payout: decisionInput.offerPayout,
    miles: decisionInput.miles,
    estimatedMinutes: 60, // or null if you don't care
  });

  await insertDecision({
    id: randomUUID(),
    orderId,
    driverId: driver.id,
    accept: result.accept,
    netPayout: result.netPayout,
    requiredDollars: result.requiredDollars,
    projectedGrossPerHour: result.projectedGrossPerHour,
    projectedNetPerHour: result.projectedNetPerHour,
    finishISO: result.finishIso ?? null,
    createdAt: new Date(),
  });

  await pool.end();
}

main().catch((err) => {
   
  console.error(err);
  process.exit(1);
});
