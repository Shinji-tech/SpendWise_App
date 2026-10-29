"use client";

import { ACCOUNTS, CATEGORY_LABEL, type AccountId, type TransactionCategory } from "@/lib/data";
import {
  DEFAULT_FILTERS,
  PRESET_LABEL,
  dateRangeLabel,
  filtersAreDefault,
  type DatePreset,
  type Filters,
} from "@/lib/transactions";
import { CloseIcon, SearchIcon } from "../app-icons";
import FilterSelect from "./FilterSelect";

type Props = { filters: Filters; onChange: (next: Filters) => void; now: Date };

const CATEGORY_ORDER: TransactionCategory[] = ["food", "transport", "shopping", "utilities", "housing", "other", "income"];

export default function TransactionFilters({ filters, onChange, now }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const isDefault = filtersAreDefault(filters);

  const presetOptions = [
    ...(Object.keys(PRESET_LABEL) as Exclude<DatePreset, "custom">[]).map((p) => ({ value: p, label: PRESET_LABEL[p] })),
    { value: "custom", label: "Custom range…" },
  ];

  return (
    <section aria-label="Filter transactions" className="rounded-2xl border border-ink-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="grid gap-3 md:grid-cols-[3fr_2fr]">
        <label className="relative block">
          <span className="sr-only">Search merchant or description</span>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search merchant or description"
            className="h-11 w-full appearance-none rounded-xl border border-ink-200 bg-white pl-10 pr-9 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 hover:border-ink-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => set("query", "")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </label>

        <FilterSelect
          label="Type"
          value={filters.type}
          active={filters.type !== "all"}
          onChange={(v) => set("type", v as Filters["type"])}
          options={[
            { value: "all", label: "All income / expense" },
            { value: "income", label: "Income only" },
            { value: "expense", label: "Expenses only" },
          ]}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <FilterSelect
          label="Category"
          value={filters.category}
          active={filters.category !== "all"}
          onChange={(v) => set("category", v as Filters["category"])}
          options={[{ value: "all", label: "All" }, ...CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]}
        />
        <FilterSelect
          label="Account"
          value={filters.account}
          active={filters.account !== "all"}
          onChange={(v) => set("account", v as Filters["account"])}
          options={[{ value: "all", label: "All" }, ...ACCOUNTS.map((a: { id: AccountId; name: string }) => ({ value: a.id, label: a.name }))]}
        />
        <FilterSelect
          label="Date"
          value={filters.preset}
          active={filters.preset !== "this_month"}
          display={dateRangeLabel(filters, now)}
          onChange={(v) => set("preset", v as DatePreset)}
          options={presetOptions}
        />
      </div>

      {filters.preset === "custom" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px] font-medium text-ink-700">
            From
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => set("from", e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-ink-200 px-3.5 text-sm font-normal text-ink-900 outline-none transition hover:border-ink-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
            />
          </label>
          <label className="block text-[13px] font-medium text-ink-700">
            To
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => set("to", e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-ink-200 px-3.5 text-sm font-normal text-ink-900 outline-none transition hover:border-ink-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
            />
          </label>
        </div>
      )}

      {!isDefault && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="rounded-md px-1 text-[13px] font-medium text-accent-600 hover:text-accent-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-200"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
