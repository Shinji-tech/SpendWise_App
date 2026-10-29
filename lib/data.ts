import { toISODate } from "./format";

export type CategoryId = "housing" | "utilities" | "shopping" | "food" | "transport" | "other";
export type TransactionCategory = CategoryId | "income";

export type AccountId = "cash" | "momo" | "vietcombank";

/**
 * confirmed     = posted: counts toward balance, budgets and analytics
 * needs_review  = receipt draft waiting for the user to check it
 * processing    = receipt draft still being read
 * Anything other than `confirmed` is a draft and is excluded from totals.
 */
export type TransactionStatus = "confirmed" | "needs_review" | "processing";

/** Only metadata is kept in the browser. Real file upload belongs to your backend. */
export type Receipt = { name: string; size: number; kind: "image" | "pdf" };

export type Transaction = {
  id: string;
  type: "income" | "expense";
  title: string;
  note: string;
  /** Always positive. `type` decides the direction. */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  category: TransactionCategory;
  account: AccountId;
  status: TransactionStatus;
  receipt?: Receipt;
  createdAt: number;
};

export const CATEGORY_LABEL: Record<TransactionCategory, string> = {
  housing: "Housing",
  utilities: "Utilities",
  shopping: "Shopping",
  food: "Food & drinks",
  transport: "Transport",
  other: "Other",
  income: "Income",
};

export const EXPENSE_CATEGORIES: CategoryId[] = ["food", "transport", "shopping", "utilities", "housing", "other"];

export const ACCOUNTS: { id: AccountId; name: string }[] = [
  { id: "cash", name: "Cash" },
  { id: "momo", name: "MoMo" },
  { id: "vietcombank", name: "Vietcombank" },
];

export const ACCOUNT_LABEL: Record<AccountId, string> = {
  cash: "Cash",
  momo: "MoMo",
  vietcombank: "Vietcombank",
};

export const isDraft = (t: Pick<Transaction, "status">) => t.status !== "confirmed";

/** Monthly limits. Combined = 4,500,000đ. `other` is intentionally unbudgeted. */
export const BUDGETS: { category: CategoryId; limit: number }[] = [
  { category: "housing", limit: 3_000_000 },
  { category: "utilities", limit: 700_000 },
  { category: "shopping", limit: 400_000 },
  { category: "food", limit: 200_000 },
  { category: "transport", limit: 200_000 },
];

export type Goal = { id: string; name: string; saved: number; target: number; due: string };

export const GOALS: Goal[] = [
  { id: "emergency", name: "Emergency fund", saved: 3_000_000, target: 6_000_000, due: "2027-01-31" },
  { id: "laptop", name: "New laptop", saved: 1_200_000, target: 6_000_000, due: "2027-04-30" },
];

/** Balance before the first recorded transaction. */
export const OPENING_BALANCE = 0;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Demo data that reproduces the Dashboard and Transactions designs:
 * this month 12,000,000đ income / 4,320,000đ expenses (7 posted + 2 receipt drafts),
 * last month 12,000,000đ / 4,800,000đ. Dates are relative to `now`.
 */
export function buildSeed(now: Date): Transaction[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();
  const thisMonth = (day: number) => toISODate(new Date(y, m, Math.min(day, today)));
  const lastMonth = (day: number) => toISODate(new Date(y, m - 1, day));
  const monthName = MONTH_NAMES[m];
  const prevMonthName = MONTH_NAMES[(m + 11) % 12];

  type Row = Omit<Transaction, "id" | "createdAt" | "status"> & { status?: TransactionStatus };
  const img = (name: string): Receipt => ({ name, size: 240_000, kind: "image" });
  const pdf = (name: string): Receipt => ({ name, size: 180_000, kind: "pdf" });

  const rows: Row[] = [
    // Last month
    { type: "income", title: "Salary", note: `${prevMonthName} salary`, amount: 12_000_000, date: lastMonth(1), category: "income", account: "vietcombank" },
    { type: "expense", title: "Monthly rent", note: `${prevMonthName} apartment rent`, amount: 3_000_000, date: lastMonth(3), category: "housing", account: "vietcombank" },
    { type: "expense", title: "EVN electricity", note: "Electricity, water, wifi", amount: 650_000, date: lastMonth(5), category: "utilities", account: "vietcombank", receipt: pdf("evn-bill.pdf") },
    { type: "expense", title: "Uniqlo", note: "Clothes", amount: 700_000, date: lastMonth(12), category: "shopping", account: "vietcombank", receipt: img("uniqlo.jpg") },
    { type: "expense", title: "Co.opmart", note: "Weekly groceries", amount: 300_000, date: lastMonth(18), category: "food", account: "cash", receipt: img("coopmart.jpg") },
    { type: "expense", title: "Grab", note: "Rides", amount: 150_000, date: lastMonth(20), category: "transport", account: "momo" },
    // This month
    { type: "income", title: "Salary", note: `${monthName} salary`, amount: 12_000_000, date: thisMonth(1), category: "income", account: "vietcombank" },
    { type: "expense", title: "Monthly rent", note: `${monthName} apartment rent`, amount: 3_000_000, date: thisMonth(3), category: "housing", account: "vietcombank" },
    { type: "expense", title: "EVN electricity", note: `${prevMonthName} electricity bill`, amount: 600_000, date: thisMonth(5), category: "utilities", account: "vietcombank", receipt: pdf("evn-bill.pdf") },
    { type: "expense", title: "Shopee", note: "Personal shopping", amount: 450_000, date: thisMonth(6), category: "shopping", account: "vietcombank", receipt: pdf("shopee-order.pdf") },
    { type: "expense", title: "Grab", note: "Ride home", amount: 120_000, date: thisMonth(7), category: "transport", account: "momo", receipt: img("grab-07-oct.png") },
    { type: "expense", title: "Circle K", note: "Snacks and drinks", amount: 85_000, date: thisMonth(8), category: "food", account: "cash", receipt: img("circle-k-08-oct.jpg") },
    { type: "expense", title: "Highlands Coffee", note: "Afternoon coffee and bánh mì", amount: 65_000, date: thisMonth(9), category: "food", account: "cash", receipt: img("highlands-09-oct.jpg") },
    // Receipt drafts (not counted anywhere until confirmed)
    { type: "expense", title: "Circle K", note: "", amount: 32_000, date: thisMonth(10), category: "food", account: "cash", status: "needs_review", receipt: img("circle-k-10-oct.jpg") },
    { type: "expense", title: "Highlands Coffee", note: "", amount: 75_000, date: thisMonth(10), category: "food", account: "cash", status: "needs_review", receipt: img("highlands-10-oct.jpg") },
  ];

  const base = now.getTime();
  return rows.map((r, i) => ({
    ...r,
    status: r.status ?? "confirmed",
    id: `seed-${i + 1}`,
    createdAt: base - (rows.length - i) * 1000,
  }));
}
