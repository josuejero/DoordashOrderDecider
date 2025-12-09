type MetricCardProps = {
  label: string;
  value: string;
};
export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-sm ring-1 ring-slate-800">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="mt-1 text-lg font-semibold text-slate-50">{value}</span>
    </div>
  );
}
