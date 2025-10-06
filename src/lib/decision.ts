// Pure math engine: no UI, no IO, no storage.
// Will compute elapsed times, net payout, accept boolean, projected averages.

export type DecisionInput = {
  targetRatePerHour: number // dollars/hr
  shiftStartHHMM: string    // "HH:MM" 24h
  earnedSoFar: number       // dollars
  offerPayout: number       // dollars (gross)
  finishHHMM: string        // "HH:MM" 24h
  miles?: number            // optional
  costPerMile?: number      // dollars/mi
  bufferMinutes?: number    // optional
}

export type DecisionResult = {
  netPayout: number
  accept: boolean
  requiredDollars: number
  projectedGrossPerHour: number
  projectedNetPerHour: number
  finishIso?: string        // when finish crosses midnight, include date
}

export function computeDecision(_input: DecisionInput): DecisionResult {
  // TODO: implement in Step 10+
  return {
    netPayout: 0,
    accept: false,
    requiredDollars: 0,
    projectedGrossPerHour: 0,
    projectedNetPerHour: 0,
    finishIso: undefined,
  }
}
