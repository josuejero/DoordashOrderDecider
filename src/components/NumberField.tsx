type Props = { label: string; value?: number; onChange?: (n: number|undefined) => void }
export default function NumberField({ label }: Props) {
  return (
    <label className="grid gap-1">
      <span className="text-sm opacity-80">{label}</span>
      <input className="rounded-xl border px-3 py-2" type="number" placeholder="—" />
    </label>
  )
}
