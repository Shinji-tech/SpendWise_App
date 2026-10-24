export default function Logo({ className = "", tone = "brand" }: { className?: string; tone?: "brand" | "accent" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${tone === "accent" ? "bg-accent-600 shadow-accent-600/30" : "bg-brand-600 shadow-brand-600/30"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <path d="M4 16.5 9.500 11l3.500 3.500L20 7.500" />
          <path d="M15 7.500h5V12.500" />
        </svg>
      </span>
      <span className="text-xl font-semibold tracking-tight text-ink-900">SpendWise</span>
    </div>
  );
}