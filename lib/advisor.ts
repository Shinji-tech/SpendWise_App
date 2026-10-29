import { CATEGORY_LABEL, GOALS, type CategoryId } from "./data";
import { formatDate, formatVnd, percent } from "./format";
import type { Summary } from "./finance";

/**
 * Rule-based stand-in for the AI advisor. It answers from the user's own
 * recorded numbers, so it works offline. To use a real model, replace the body
 * of `answerQuestion` with a call to your API and keep the signature.
 */

export const SUGGESTIONS = [
  "How am I doing this month?",
  "Which budget is over?",
  "How much did I spend on food?",
  "Am I on track for my goals?",
];

const CATEGORY_KEYWORDS: Record<Exclude<CategoryId, "other">, string[]> = {
  food: ["food", "drink", "coffee", "eat", "restaurant", "snack", "cafe", "lunch", "dinner", "grocer"],
  housing: ["housing", "rent", "apartment"],
  utilities: ["utilit", "electric", "water", "internet", "wifi", "bill"],
  shopping: ["shopping", "shop", "clothes"],
  transport: ["transport", "grab", "taxi", "bus", "ride", "fuel", "commute"],
};

/** Matches a word that *starts with* a keyword, so "eat" doesn't fire on "create". */
const has = (q: string, words: string[]) => words.some((w) => new RegExp(`\\b${w.trim()}`).test(q));

export function answerQuestion(question: string, s: Summary, now: Date): string {
  const q = question.toLowerCase();

  // A specific category: spend, share and budget status.
  const catEntry = (Object.entries(CATEGORY_KEYWORDS) as [CategoryId, string[]][]).find(([, words]) => has(q, words));
  if (catEntry) {
    const [category] = catEntry;
    const label = CATEGORY_LABEL[category];
    const spent = s.byCategory.find((c) => c.category === category);
    const budget = s.budgets.find((b) => b.category === category);
    if (!spent) return `You haven't recorded any ${label} spending in ${s.monthLabel} yet.`;
    let text = `You've spent ${formatVnd(spent.amount)} on ${label} in ${s.monthLabel}, ${spent.share}% of your ${formatVnd(s.expenses)} total.`;
    if (budget) {
      text +=
        budget.over > 0
          ? `\nThat's ${formatVnd(budget.over)} over your ${formatVnd(budget.limit)} budget.`
          : `\nYou have ${formatVnd(budget.limit - budget.spent)} left of your ${formatVnd(budget.limit)} budget (${percent(budget.spent, budget.limit)}% used).`;
    }
    return text;
  }

  if (has(q, ["goal", "saving", "save", "laptop", "emergency", "on track"])) {
    return GOALS.map((g) => {
      const due = new Date(g.due);
      const monthsLeft = Math.max(1, Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
      const remaining = Math.max(0, g.target - g.saved);
      return `${g.name}: ${formatVnd(g.saved)} of ${formatVnd(g.target)} (${percent(g.saved, g.target)}%), due ${formatDate(g.due)}. Setting aside about ${formatVnd(remaining / monthsLeft)} a month for ${monthsLeft} months gets you there.`;
    }).join("\n\n") + `\n\nThis month you're ${s.net >= 0 ? "up" : "down"} ${formatVnd(s.net)}, so ${s.net > 0 ? "there's room to top these up." : "goals may need to wait."}`;
  }

  if (has(q, ["budget", "limit", "over", "overspen", "remaining", "left"])) {
    const overs = s.budgets.filter((b) => b.over > 0);
    const lines = overs.map((b) => `• ${CATEGORY_LABEL[b.category]}: ${formatVnd(b.over)} over its ${formatVnd(b.limit)} limit`);
    const head = overs.length
      ? `${overs.length === 1 ? "One budget is" : `${overs.length} budgets are`} over this month:\n${lines.join("\n")}`
      : "No budget is over its limit this month.";
    return `${head}\n\nAcross all budgets you've used ${s.budgetUsedPct}% of ${formatVnd(s.totalLimit)}, leaving ${s.budgetRemaining < 0 ? `${formatVnd(s.budgetRemaining)} over` : formatVnd(s.budgetRemaining)}.`;
  }

  if (has(q, ["balance", "how much do i have", "net worth", "total money"])) {
    return `Your balance across all accounts is ${formatVnd(s.balance)}. This month it changed by ${s.net >= 0 ? "+" : "-"}${formatVnd(s.net)}.`;
  }

  if (has(q, ["income", "earn", "salary", "paid"])) {
    return `You've recorded ${formatVnd(s.income)} of income in ${s.monthLabel} (${s.incomeCount} ${s.incomeCount === 1 ? "entry" : "entries"}). Last month was ${formatVnd(s.prevIncome)}.`;
  }

  if (has(q, ["biggest", "largest", "most", "highest", "top"])) {
    const top = s.byCategory[0];
    const largest = s.monthTransactions.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount)[0];
    if (!top || !largest) return "There are no expenses recorded this month yet.";
    return `Your biggest category is ${CATEGORY_LABEL[top.category]} at ${formatVnd(top.amount)} (${top.share}% of spending). The largest single expense is ${largest.title} for ${formatVnd(largest.amount)} on ${formatDate(largest.date)}.`;
  }

  if (has(q, ["last month", "previous", "compare", "versus", "vs", "september"])) {
    const diff = s.expenses - s.prevExpenses;
    return `So far in ${s.monthLabel} you've spent ${formatVnd(s.expenses)} versus ${formatVnd(s.prevExpenses)} in all of ${s.prevMonthLabel}. That's ${formatVnd(diff)} ${diff <= 0 ? "less" : "more"}, and the month isn't over yet.`;
  }

  if (has(q, ["spend", "spent", "expense", "doing", "summary", "overview", "month", "hello", "hi ", "hey", "help"]) || q.trim() === "hi") {
    const top = s.byCategory[0];
    return `In ${s.rangeLabel} you've earned ${formatVnd(s.income)} and spent ${formatVnd(s.expenses)}, leaving ${formatVnd(s.net)} ${s.net >= 0 ? "ahead" : "short"}.${top ? ` ${CATEGORY_LABEL[top.category]} is your biggest cost at ${formatVnd(top.amount)}.` : ""}\nBudgets: ${s.budgetUsedPct}% used, ${s.budgetRemaining >= 0 ? `${formatVnd(s.budgetRemaining)} remaining` : `${formatVnd(s.budgetRemaining)} over`}.`;
  }

  return "I can answer questions about your spending, budgets, balance, income and saving goals. Try one of the suggestions below.";
}
