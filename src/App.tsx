// Single-screen calculator UI (no logic yet).
// Responsibilities:
// - Collect inputs (target $/hr, shift start HH:MM, earned so far, offer payout, finish HH:MM, optional miles + cost/mi, buffer mins)
// - Show decision card (ACCEPT/REJECT), required >= $, offered/net $, projected averages, friendly finish ETA
// - Actions: "I accepted" (later will add net to earned), "Reset offer"
// - Accept URL params later: payout, finish, miles, cpm
// - Delegate math to lib/decision + persistence to lib/storage

export default function App() {
  return (
    <main className="min-h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-xl p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">DoorDash Order Decider</h1>
          <p className="text-sm opacity-75">
            calculator scaffold — no logic yet
          </p>
        </header>

        {/* Inputs (stubs) */}
        <section className="grid gap-4">
          {/* TODO: NumberField for target $/hr */}
          {/* TODO: TimeField for shift start HH:MM */}
          {/* TODO: NumberField for earned so far */}
          {/* TODO: NumberField for offer payout */}
          {/* TODO: TimeField for finish HH:MM */}
          {/* Optional: miles, cost/mi, buffer mins */}
        </section>

        {/* Decision card (stub) */}
        <section className="rounded-2xl border p-4">
          <div className="text-lg font-medium">Decision</div>
          <div className="text-sm opacity-75">
            ACCEPT/REJECT will appear here
          </div>
          <div className="mt-2 text-xs opacity-60">
            required ≥ $, offered/net $, averages, ETA
          </div>
        </section>

        {/* Actions (stubs) */}
        <section className="flex gap-3">
          <button className="rounded-2xl px-4 py-2 border">I accepted</button>
          <button className="rounded-2xl px-4 py-2 border">Reset offer</button>
        </section>
      </div>
    </main>
  );
}
