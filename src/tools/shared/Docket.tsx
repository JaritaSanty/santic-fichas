export function Docket({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details open className="border border-line bg-surface">
      <summary className="cursor-pointer px-5 py-3 font-semibold text-ink md:hidden">{summary}</summary>
      <div className="grid content-start gap-5 p-5">{children}</div>
    </details>
  );
}
