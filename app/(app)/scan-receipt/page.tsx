"use client";

import { useShell } from "@/components/AppShell";

export default function ScanReceiptPage() {
  const { openAdd } = useShell();

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center rounded-2xl border border-ink-200 bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-700" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
          <path d="M8 12h8" />
        </svg>
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">Scan a receipt</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-500">
        Choose a JPG, PNG, or PDF in the transaction form. We&apos;ll suggest details for you to review before saving a draft.
      </p>
      <button
        type="button"
        onClick={openAdd}
        className="mt-6 h-11 rounded-xl bg-accent-600 px-5 text-sm font-semibold text-white transition hover:bg-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
      >
        Open scanner form
      </button>
      <p className="mt-3 text-xs text-ink-500">The file is uploaded securely when you save the transaction.</p>
    </section>
  );
}
