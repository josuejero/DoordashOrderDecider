import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function NumberField({ label }) {
    return (_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-sm opacity-80", children: label }), _jsx("input", { className: "rounded-xl border px-3 py-2", type: "number", placeholder: "\u2014" })] }));
}
