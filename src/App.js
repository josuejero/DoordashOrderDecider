import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Single-screen calculator UI (no logic yet).
// Responsibilities:
// - Collect inputs (target $/hr, shift start HH:MM, earned so far, offer payout, finish HH:MM, optional miles + cost/mi, buffer mins)
// - Show decision card (ACCEPT/REJECT), required >= $, offered/net $, projected averages, friendly finish ETA
// - Actions: "I accepted" (later will add net to earned), "Reset offer"
// - Accept URL params later: payout, finish, miles, cpm
// - Delegate math to lib/decision + persistence to lib/storage
export default function App() {
    return (_jsx("main", { className: "min-h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100", children: _jsxs("div", { className: "mx-auto max-w-xl p-6 space-y-6", children: [_jsxs("header", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "DoorDash Order Decider" }), _jsx("p", { className: "text-sm opacity-75", children: "calculator scaffold \u2014 no logic yet" })] }), _jsx("section", { className: "grid gap-4" }), _jsxs("section", { className: "rounded-2xl border p-4", children: [_jsx("div", { className: "text-lg font-medium", children: "Decision" }), _jsx("div", { className: "text-sm opacity-75", children: "ACCEPT/REJECT will appear here" }), _jsx("div", { className: "mt-2 text-xs opacity-60", children: "required \u2265 $, offered/net $, averages, ETA" })] }), _jsxs("section", { className: "flex gap-3", children: [_jsx("button", { className: "rounded-2xl px-4 py-2 border", children: "I accepted" }), _jsx("button", { className: "rounded-2xl px-4 py-2 border", children: "Reset offer" })] })] }) }));
}
