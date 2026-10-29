import Link from "next/link";
import { notFound } from "next/navigation";

const SECTIONS: Record<string, { title: string; blurb: string }> = {
  "scan-receipt": { title: "Scan receipt", blurb: "Snap a receipt and turn it into a transaction." },
  budgets: { title: "Budgets", blurb: "Set monthly limits per category and track them." },
  goals: { title: "Goals", blurb: "Create saving goals and watch them fill up." },
  analytics: { title: "Analytics", blurb: "Trends and breakdowns across months." },
  accounts: { title: "Accounts", blurb: "Your bank accounts, cards and cash in one place." },
  settings: { title: "Settings", blurb: "Profile, currency and preferences." },
};


export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: key } = await params;
  const section = SECTIONS[key];
  if (!section) notFound();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{section.title}</h1>
        <p className="mt-2 text-sm text-ink-500">{section.blurb}</p>
        <p className="mt-1 text-sm text-ink-500">This screen hasn&apos;t been designed yet, so it&apos;s a placeholder.</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white transition hover:bg-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
