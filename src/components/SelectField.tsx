// src/components/SelectField.tsx
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
      <Label htmlFor={selectId}>{label}</Label>
      <select
        id={selectId}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={hintId} className="text-[11px] opacity-60">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
