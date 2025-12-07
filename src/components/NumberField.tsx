// src/components/NumberField.tsx
import { useId } from "react";
import { Label } from "./Label";

export type NumberFieldProps = {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (n: number) => void;
  hint?: string;
};

export function NumberField({
  label,
  value,
  step = 1,
  min,
  onChange,
  hint,
}: NumberFieldProps) {
  const inputId = useId();
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="grid gap-1">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        aria-describedby={hintId}
        inputMode="decimal"
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
      />
      {hint ? (
        <span id={hintId} className="text-[11px] opacity-60">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
