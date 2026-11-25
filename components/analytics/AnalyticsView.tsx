"use client";

import { CATEGORY_LABEL, type CategoryId } from "@/lib/data";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import { useTransactions } from "@/lib/store";
import Card from "@/components/dashboard/Card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsView() {
  const { transactions, budgets, now } = useTransactions();
  const confirmed = transactions.filter((transaction) => transaction.status === "confirmed");
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentTransactions = confirmed.filter((transaction) => transaction.date.startsWith(currentMonth));
  const income = currentTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = currentTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const net = income - expenses;
  const categories = new Map<CategoryId, number>();
  for (const transaction of currentTransactions) {
    if (transaction.type !== "expense" || transaction.category === "income") continue;
    categories.set(transaction.category, (categories.get(transaction.category) ?? 0) + transaction.amount);
  }
  const categorySpending = [...categories.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxCategorySpend = categorySpending[0]?.amount ?? 0;
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const rows = confirmed.filter((transaction) => transaction.date.startsWith(key));
    return {
      label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      income: rows.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + transaction.amount, 0),
      expenses: rows.filter((transaction) => transaction.type === "expense").reduce((total, transaction) => total + transaction.amount, 0),
    };
  });
  const peak = Math.max(...months.flatMap((month) => [month.income, month.expenses]), 1);
  const totalBudget = budgets.reduce((total, budget) => total + budget.limit, 0);
  const budgetedSpend = budgets.reduce((total, budget) => total + (categories.get(budget.category) ?? 0), 0);
  const budgetUsage = totalBudget > 0 ? Math.round((budgetedSpend / totalBudget) * 100) : budgetedSpend > 0 ? 100 : 0;

  return (
    <div className="space-y-4 pb-20">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">Analytics</h1>
        <p className="mt-0.5 text-sm text-ink-500">Income, expenses and budget progress from confirmed transactions.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Income this month" value={formatVnd(income)} />
        <Metric label="Expenses this month" value={formatVnd(expenses)} />
        <Metric label="Net this month" value={`${net < 0 ? "−" : "+"}${formatVnd(net)}`} negative={net < 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Income vs. expenses" subtitle="Last six months · drafts excluded">
          <div className="mb-3 flex gap-4 text-xs text-ink-700">
            <Legend color="#047857" label="Income" />
            <Legend color="#2fcf9c" label="Expenses" />
          </div>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 640 260" className="h-auto min-w-[520px] w-full" role="img" aria-label="Monthly income and expenses for the last six months">
              {[0, 1, 2, 3].map((step) => {
                const value = (peak * step) / 3;
                const y = 206 - (value / peak) * 166;
                return (
                  <g key={step}>
                    <line x1="58" x2="630" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={step === 0 ? undefined : "3 3"} />
                    <text x="50" y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">{formatCompactVnd(value)}</text>
                  </g>
                );
              })}
              {months.map((month, index) => {
                const groupX = 94 + index * 88;
                const incomeHeight = (month.income / peak) * 166;
                const expenseHeight = (month.expenses / peak) * 166;
                return (
                  <g key={month.label}>
                    <rect x={groupX} y={206 - incomeHeight} width="24" height={incomeHeight} rx="4" fill="#047857">
                      <title>{month.label} income: {formatVnd(month.income)}</title>
                    </rect>
                    <rect x={groupX + 30} y={206 - expenseHeight} width="24" height={expenseHeight} rx="4" fill="#2fcf9c">
                      <title>{month.label} expenses: {formatVnd(month.expenses)}</title>
                    </rect>
                    <text x={groupX + 27} y="228" textAnchor="middle" fontSize="10" fill="#64748b">{month.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <table className="sr-only">
            <caption>Income and expenses over the last six months</caption>
            <thead><tr><th>Month</th><th>Income</th><th>Expenses</th></tr></thead>
            <tbody>{months.map((month) => <tr key={month.label}><td>{month.label}</td><td>{formatVnd(month.income)}</td><td>{formatVnd(month.expenses)}</td></tr>)}</tbody>
          </table>
        </Card>

        <Card title="Spending by category" subtitle={`This month · ${formatVnd(expenses)} total expenses`}>
          {categorySpending.length ? (
            <ul className="space-y-3">
              {categorySpending.map(({ category, amount }) => (
                <li key={category}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="font-medium text-ink-800">{CATEGORY_LABEL[category]}</span>
                    <span className="tabular-nums text-ink-700">{formatVnd(amount)} · {expenses ? Math.round((amount / expenses) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-accent-600" style={{ width: `${maxCategorySpend ? (amount / maxCategorySpend) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-center text-sm text-ink-500">No confirmed expenses this month yet.</p>}
        </Card>
      </div>

      <Card
        title="Budget progress"
        subtitle={budgets.length ? `${budgetUsage}% of your saved limits used · ${formatVnd(budgetedSpend)} of ${formatVnd(totalBudget)}` : "Set your own limits to compare spending against a budget."}
        action={budgets.length ? { label: "Manage budgets", href: "/budgets" } : { label: "Set budgets", href: "/budgets" }}
      >
        {budgets.length ? (
          <ul className="space-y-3">
            {budgets.map((budget) => {
              const spent = categories.get(budget.category) ?? 0;
              const ratio = budget.limit > 0 ? spent / budget.limit : spent > 0 ? 1 : 0;
              const over = Math.max(0, spent - budget.limit);
              return (
                <li key={budget.category}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-ink-800">{CATEGORY_LABEL[budget.category]}</span>
                    <span className={over > 0 ? "text-red-700" : "text-ink-600"}>
                      {formatVnd(spent)} / {formatVnd(budget.limit)}{over > 0 ? ` · ${formatVnd(over)} over` : ""}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-label={`${CATEGORY_LABEL[budget.category]} budget`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))}>
                    <div className={`h-full rounded-full ${over > 0 ? "bg-red-600" : "bg-accent-600"}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-ink-500">No saved budgets yet.</p>}
      </Card>
    </div>
  );
}

function Metric({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${negative ? "text-red-700" : "text-ink-900"}`}>{value}</p>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />{label}</span>;
}
