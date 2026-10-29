import { ACCOUNT_LABEL, CATEGORY_LABEL, isDraft, type AccountId, type Transaction, type TransactionCategory } from "./data";
import { toISODate } from "./format";

export type DatePreset = "this_month" | "last_month" | "last_3_months" | "this_year" | "all" | "custom";

export type Filters = {
  query: string;
  type: "all" | "income" | "expense";
  category: "all" | TransactionCategory;
  account: "all" | AccountId;
  preset: DatePreset;
  /** Only used when preset === "custom" (YYYY-MM-DD, either may be empty). */
  from: string;
  to: string;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  type: "all",
  category: "all",
  account: "all",
  preset: "this_month",
  from: "",
  to: "",
};

export type SortKey = "date" | "amount";
export type SortState = { key: SortKey; dir: "asc" | "desc" };

export const PAGE_SIZE = 10;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PRESET_LABEL: Record<Exclude<DatePreset, "custom">, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_3_months: "Last 3 months",
  this_year: "This year",
  all: "All time",
};

/** Inclusive ISO bounds for a preset; null = unbounded. */
export function dateRange(f: Pick<Filters, "preset" | "from" | "to">, now: Date): { from: string | null; to: string | null } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (f.preset) {
    case "this_month":
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(now) };
    case "last_month":
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case "last_3_months":
      return { from: toISODate(new Date(y, m - 2, 1)), to: toISODate(now) };
    case "this_year":
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(now) };
    case "custom":
      return { from: f.from || null, to: f.to || null };
    default:
      return { from: null, to: null };
  }
}

const short = (iso: string) => {
  const [y, mo, d] = iso.split("-").map(Number);
  return { y, label: `${d} ${SHORT_MONTHS[mo - 1]}` };
};

/** "1–25 Oct 2026", "1 Sep – 25 Oct 2026", "All time"... shown inside the Date filter. */
export function dateRangeLabel(f: Pick<Filters, "preset" | "from" | "to">, now: Date): string {
  const { from, to } = dateRange(f, now);
  if (!from && !to) return f.preset === "custom" ? "Any date" : "All time";
  if (from && !to) return `From ${short(from).label} ${short(from).y}`;
  if (!from && to) return `Until ${short(to).label} ${short(to).y}`;
  const a = short(from!);
  const b = short(to!);
  const sameMonth = from!.slice(0, 7) === to!.slice(0, 7);
  if (sameMonth) return `${from!.slice(8).replace(/^0/, "")}–${b.label} ${b.y}`;
  return a.y === b.y ? `${a.label} – ${b.label} ${b.y}` : `${a.label} ${a.y} – ${b.label} ${b.y}`;
}

export function applyFilters(list: Transaction[], f: Filters, now: Date): Transaction[] {
  const q = f.query.trim().toLowerCase();
  const { from, to } = dateRange(f, now);
  return list.filter((t) => {
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.category !== "all" && t.category !== f.category) return false;
    if (f.account !== "all" && t.account !== f.account) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (q) {
      const haystack = `${t.title} ${t.note} ${CATEGORY_LABEL[t.category]} ${ACCOUNT_LABEL[t.account]} ${t.receipt?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

const signed = (t: Transaction) => (t.type === "income" ? t.amount : -t.amount);

export function sortTransactions(list: Transaction[], sort: SortState): Transaction[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const primary = sort.key === "date" ? (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : signed(a) - signed(b);
    // Stable, predictable tie-break: newest entry first.
    return primary !== 0 ? primary * dir : b.createdAt - a.createdAt;
  });
}

export function filtersAreDefault(f: Filters): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).every((k) => f[k] === DEFAULT_FILTERS[k]);
}

export function countRecords(list: Transaction[]) {
  const drafts = list.filter(isDraft).length;
  return { total: list.length, posted: list.length - drafts, drafts };
}

/** [1, 2, "…", 9, 10] style page list for the pager. */
export function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}
