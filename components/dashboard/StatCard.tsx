export default function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "negative";
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p
        className={`mt-0.5 text-xl font-semibold leading-7 tracking-tight tabular-nums ${
          tone === "negative" ? "text-red-600" : "text-ink-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs leading-4 text-ink-500">{note}</p>
    </div>
  );
}
