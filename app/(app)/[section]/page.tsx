import { notFound } from "next/navigation";
import BudgetManager from "@/components/planning/BudgetManager";
import GoalManager from "@/components/planning/GoalManager";

const SECTIONS: Record<string, { title: string; blurb: string }> = {
  budgets: { title: "Budgets", blurb: "Set monthly limits per category and track them." },
  goals: { title: "Goals", blurb: "Create saving goals and watch them fill up." },
};

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: key } = await params;
  const section = SECTIONS[key];
  if (!section) notFound();

  return (
    <div className="space-y-4 pb-20">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">{section.title}</h1>
        <p className="mt-0.5 text-sm text-ink-500">{section.blurb}</p>
      </header>
      {key === "budgets" ? <BudgetManager /> : <GoalManager />}
    </div>
  );
}
