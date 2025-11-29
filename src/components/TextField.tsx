// src/components/TextField.tsx
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
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
      />
      {hint ? (
        <span className="text-[11px] opacity-60" aria-hidden>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
