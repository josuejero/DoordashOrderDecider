// Pure math engine: computes accept/reject, projected rates, and finish timestamp when crossing midnight.

export type DecisionInput = {
  targetRatePerHour: number               // dollars/hr
  shiftStartHHMM: string                  // "HH:MM" 24h
  earnedSoFar: number                     // dollars
  offerPayout: number                     // dollars (gross)
  finishHHMM: string                      // "HH:MM" 24h (projected finish for this offer)
  miles?: number                          // optional
  costPerMile?: number                    // dollars/mi
  bufferMinutes?: number                  // optional extra minutes (parking, handoff, etc.)
}

export type DecisionResult = {
  netPayout: number
  accept: boolean
  requiredDollars: number
  projectedGrossPerHour: number
  projectedNetPerHour: number
  finishIso?: string                      // present if finish crosses midnight
}

function parseHHMM(hhmm: string): number {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? '')
  if (!m) throw new Error(`Invalid time: ${hhmm}`)
  return Number(m[1]) * 60 + Number(m[2])
}
function to2(n: number) { return Math.round(n * 100) / 100 }

export function computeDecision(input: DecisionInput): DecisionResult {
  const target = Math.max(0, Number(input.targetRatePerHour) || 0)
  const startM = parseHHMM(input.shiftStartHHMM)
  const finishBaseM = parseHHMM(input.finishHHMM)
  const earned = Math.max(0, Number(input.earnedSoFar) || 0)
  const payout = Math.max(0, Number(input.offerPayout) || 0)
  const miles = Math.max(0, Number(input.miles ?? 0))
  const cpm = Math.max(0, Number(input.costPerMile ?? 0))
  const buffer = Math.max(0, Math.floor(Number(input.bufferMinutes ?? 0)))

  // handle midnight crossover
  let finishM = finishBaseM
  let crossesMidnight = false
  if (finishM < startM) { finishM += 24 * 60; crossesMidnight = true }

  // duration includes buffer; clamp to at least 1 minute so we don't divide by zero
  let totalMinutes = (finishM - startM) + buffer
  if (totalMinutes < 1) totalMinutes = 1
  const hours = totalMinutes / 60

  // variable cost and net payout
  const variableCost = miles * cpm
  const net = Math.max(0, payout - variableCost)

  // dollars required (this offer) to be at target after this run
  const required = Math.max(0, target * hours - earned)

  // acceptance rule: accept when the net of this offer covers what's required
  const accept = net >= required

  // projected rates if you take the offer
  const projectedGrossPerHour = (earned + payout) / hours
  const projectedNetPerHour = (earned + net) / hours

  // include a finish ISO timestamp when we cross midnight (makes UI friendlier)
  let finishIso: string | undefined
  if (crossesMidnight) {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(startM / 60), startM % 60)
    const finishDate = new Date(startDate.getTime() + totalMinutes * 60_000)
    finishIso = finishDate.toISOString()
  }

  return {
    netPayout: to2(net),
    accept,
    requiredDollars: to2(required),
    projectedGrossPerHour: to2(projectedGrossPerHour),
    projectedNetPerHour: to2(projectedNetPerHour),
    finishIso
  }
}
