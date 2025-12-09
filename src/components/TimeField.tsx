import { useId } from "react";
import { Label } from "./Label";
export type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};
export function TimeField({ label, value, onChange, hint }: TimeFieldProps) {
  const inputId = useId();
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={inputId}>{label}</Label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <input
        type="time"
        id={inputId}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-700 bg-white/5 px-3 py-2 text-base text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
