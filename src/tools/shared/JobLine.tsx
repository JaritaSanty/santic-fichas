export function JobLine({ actions, items }: { actions: React.ReactNode; items: { label: string; value: string }[] }) {
  return (
    <div data-job-line className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3">
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
            <dd className="font-semibold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
