export default function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-ink-200" />
      <span className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</span>
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  );
}
