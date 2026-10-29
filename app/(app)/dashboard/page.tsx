"use client";

import { useShell } from "@/components/AppShell";
import BudgetUsage from "@/components/dashboard/BudgetUsage";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import SavingGoals from "@/components/dashboard/SavingGoals";
import SpendByCategory from "@/components/dashboard/SpendByCategory";
import StatCard from "@/components/dashboard/StatCard";
import { formatSignedVnd, formatVnd } from "@/lib/format";


export default function DashboardPage() {
  const { summary: s, firstName } = useShell();
  const overBudget = s.budgetRemaining < 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Welcome back, {firstName}. Your money at a glance · {s.rangeLabel}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <StatCard
          label="Total income"
          value={formatVnd(s.income)}
          note={`${s.incomeCount} recorded ${s.incomeCount === 1 ? "income" : "incomes"} this month`}
        />
        <StatCard
          label="Total expenses"
          value={formatVnd(s.expenses)}
          note={`${s.expenseCount} confirmed ${s.expenseCount === 1 ? "expense" : "expenses"} · drafts excluded`}
        />
        <StatCard label="Balance" value={formatVnd(s.balance)} note={`All accounts · ${formatSignedVnd(s.net)} this month`} />
        <StatCard
          label={overBudget ? "Over budget" : "Budget remaining"}
          value={formatVnd(s.budgetRemaining)}
          tone={overBudget ? "negative" : "default"}
          note={`${formatVnd(s.totalLimit)} combined monthly limit`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="grid gap-4 md:grid-cols-2 xl:col-span-2 xl:content-start">
          <SpendByCategory summary={s} />
          <IncomeExpenseChart summary={s} />
          <div className="md:col-span-2">
            <RecentTransactions transactions={s.recent} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[auto_1fr]">
          <BudgetUsage summary={s} />
          <SavingGoals className="h-full" />
        </div>
      </div>
    </div>
  );
}
