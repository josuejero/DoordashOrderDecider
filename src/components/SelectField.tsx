import { useId } from "react";
import { Label } from "./Label";
export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};
export type SelectFieldProps<T extends string = string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  hint?: string;
};
export function SelectField<T extends string = string>({
  label,
  value,
  onChange,
  options,
  hint,
}: SelectFieldProps<T>) {
  const selectId = useId();
  const hintId = hint ? `${selectId}-hint` : undefined;
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={selectId}>{label}</Label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <select
        id={selectId}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-xl border border-slate-700 bg-white/5 px-3 py-2 text-base text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-slate-900 text-slate-100"
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
