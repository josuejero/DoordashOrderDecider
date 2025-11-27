// server/services/driver.ts
import { ensureDimDriver } from "../db/analytics";
// import { Driver } from "../models/Driver"; // or your actual type

type CreateDriverInput = {
  name: string;
  city: string | null;
  // other fields...
};

export async function createDriver(input: CreateDriverInput) {
  // Phase 1: existing behavior – insert into drivers table
  const driver = await createDriverInDb(input); // your existing function

  // Phase 2: analytics dim_driver
  await ensureDimDriver(driver.id, {
    name: driver.name,
    city: driver.city ?? null,
  });

  return driver;
}
