// src/components/TextField.tsx
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
      <Label htmlFor={inputId}>{label}</Label>
      <input
        type="text"
        id={inputId}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
