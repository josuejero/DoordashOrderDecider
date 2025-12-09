import { useId } from "react";
import { Label } from "./Label";
export type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
};
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: TextFieldProps) {
  const inputId = useId();
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={inputId}>{label}</Label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <input
        type="text"
        id={inputId}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-700 bg-white/5 px-3 py-2 text-base text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
