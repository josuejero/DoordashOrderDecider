type Props = {
  label: string;
  value?: string;
  onChange?: (hhmm: string) => void;
};
export default function TimeField({ label }: Props) {
  return (
    <label className="grid gap-1">
      <span className="text-sm opacity-80">{label}</span>
      <input className="rounded-xl border px-3 py-2" type="time" />
    </label>
  );
}
