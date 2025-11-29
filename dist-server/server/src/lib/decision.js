function parseHHMM(hhmm) {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? "");
    if (!m)
        throw new Error(`Invalid time: ${hhmm}`);
    return Number(m[1]) * 60 + Number(m[2]);
}
function to2(n) {
    return Math.round(n * 100) / 100;
}
export function computeDecision(input) {
    const target = Math.max(0, Number(input.targetRatePerHour) || 0);
    const startM = parseHHMM(input.shiftStartHHMM);
    const finishBaseM = parseHHMM(input.finishHHMM);
    const earned = Math.max(0, Number(input.earnedSoFar) || 0);
    const payout = Math.max(0, Number(input.offerPayout) || 0);
    const miles = Math.max(0, Number(input.miles ?? 0));
    const cpm = Math.max(0, Number(input.costPerMile ?? 0));
    const buffer = Math.max(0, Math.floor(Number(input.bufferMinutes ?? 0)));
    let finishM = finishBaseM;
    let crossesMidnight = false;
    if (finishM < startM) {
        finishM += 24 * 60;
        crossesMidnight = true;
    }
    let totalMinutes = finishM - startM + buffer;
    if (totalMinutes < 1)
        totalMinutes = 1;
    const hours = totalMinutes / 60;
    const variableCost = miles * cpm;
    const net = Math.max(0, payout - variableCost);
    const required = Math.max(0, target * hours - earned);
    const accept = net >= required;
    const projectedGrossPerHour = (earned + payout) / hours;
    const projectedNetPerHour = (earned + net) / hours;
    let finishIso;
    if (crossesMidnight) {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(startM / 60), startM % 60);
        const finishDate = new Date(startDate.getTime() + totalMinutes * 60_000);
        finishIso = finishDate.toISOString();
    }
    return {
        netPayout: to2(net),
        accept,
        requiredDollars: to2(required),
        projectedGrossPerHour: to2(projectedGrossPerHour),
        projectedNetPerHour: to2(projectedNetPerHour),
        finishIso,
    };
}
export function explainDecision(input, result) {
    const target = Math.max(0, Number(input.targetRatePerHour) || 0);
    if (result.accept) {
        if (result.projectedNetPerHour >= target) {
            return {
                code: "ACCEPT_ON_TARGET",
                message: `ACCEPT because projected net $${result.projectedNetPerHour.toFixed(2)}/hr meets your target of $${target.toFixed(2)}/hr.`,
            };
        }
        return {
            code: "ACCEPT_AHEAD_OF_TARGET",
            message: `ACCEPT because this order keeps you ahead of pace: net $${result.netPayout.toFixed(2)} vs $${result.requiredDollars.toFixed(2)} required for this slot.`,
        };
    }
    return {
        code: "REJECT_BELOW_TARGET",
        message: `REJECT because net $${result.netPayout.toFixed(2)} is below the $${result.requiredDollars.toFixed(2)} you need in this time block to hit your target.`,
    };
}
