import { BUDGETS, OPENING_BALANCE, type CategoryId, type Transaction } from "./data";
import { percent, toISODate } from "./format";

export type CategorySpend = { category: CategoryId; amount: number; share: number };
export type BudgetStatus = {
  category: CategoryId;
  spent: number;
  limit: number;
  /** spent / limit, e.g. 1.125 = 112% */
  ratio: number;
  over: number;
};

export type Summary = {
  monthLabel: string;
  /** First and last day shown, for "1–23 Oct 2026". */
  rangeLabel: string;
  monthTransactions: Transaction[];
  income: number;
  incomeCount: number;
  expenses: number;
  expenseCount: number;
  /** Net change this month (income - expenses). */
  net: number;
  /** Current balance across all confirmed history. */
  balance: number;
  byCategory: CategorySpend[];
  budgets: BudgetStatus[];
  totalLimit: number;
  budgetedSpend: number;
  budgetRemaining: number;
  budgetUsedPct: number;
  prevIncome: number;
  prevExpenses: number;
  prevMonthLabel: string;
  recent: Transaction[];
};

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const sum = (list: Transaction[]) => list.reduce((acc, t) => acc + t.amount, 0);

export function summarize(all: Transaction[], now: Date): Summary {
  const confirmed = all.filter((t) => t.status === "confirmed");
  const today = toISODate(now);
  const curKey = today.slice(0, 7);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = toISODate(prevDate).slice(0, 7);

  const inMonth = (key: string) => confirmed.filter((t) => t.date.slice(0, 7) === key);
  const monthTransactions = inMonth(curKey);
  const income = sum(monthTransactions.filter((t) => t.type === "income"));
  const expenseList = monthTransactions.filter((t) => t.type === "expense");
  const expenses = sum(expenseList);

  const prev = inMonth(prevKey);
  const prevIncome = sum(prev.filter((t) => t.type === "income"));
  const prevExpenses = sum(prev.filter((t) => t.type === "expense"));

  const balance =
    OPENING_BALANCE +
    sum(confirmed.filter((t) => t.type === "income")) -
    sum(confirmed.filter((t) => t.type === "expense"));

  const spentBy = new Map<CategoryId, number>();
  for (const t of expenseList) {
    const c = t.category as CategoryId;
    spentBy.set(c, (spentBy.get(c) ?? 0) + t.amount);
  }
  const byCategory: CategorySpend[] = [...spentBy.entries()]
    .map(([category, amount]) => ({ category, amount, share: percent(amount, expenses) }))
    .sort((a, b) => b.amount - a.amount);

  const budgets: BudgetStatus[] = BUDGETS.map(({ category, limit }) => {
    const spent = spentBy.get(category) ?? 0;
    return { category, spent, limit, ratio: spent / limit, over: Math.max(0, spent - limit) };
  });
  const totalLimit = BUDGETS.reduce((acc, b) => acc + b.limit, 0);
  const budgetedSpend = budgets.reduce((acc, b) => acc + b.spent, 0);

  const recent = [...confirmed]
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
    .slice(0, 3);

  const month = now.getMonth();
  return {
    monthLabel: `${FULL_MONTHS[month]} ${now.getFullYear()}`,
    rangeLabel: `1–${now.getDate()} ${SHORT_MONTHS[month]} ${now.getFullYear()}`,
    monthTransactions,
    income,
    incomeCount: monthTransactions.filter((t) => t.type === "income").length,
    expenses,
    expenseCount: expenseList.length,
    net: income - expenses,
    balance,
    byCategory,
    budgets,
    totalLimit,
    budgetedSpend,
    budgetRemaining: totalLimit - budgetedSpend,
    budgetUsedPct: percent(budgetedSpend, totalLimit),
    prevIncome,
    prevExpenses,
    prevMonthLabel: `${SHORT_MONTHS[prevDate.getMonth()]} ${prevDate.getFullYear()}`,
    recent,
  };
}
