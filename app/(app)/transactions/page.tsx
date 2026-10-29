"use client";

import { useMemo, useState } from "react";
import { useShell } from "@/components/AppShell";
import Pagination from "@/components/transactions/Pagination";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionTable from "@/components/transactions/TransactionTable";
import type { TransactionCategory } from "@/lib/data";
import { formatVnd } from "@/lib/format";
import { useTransactions } from "@/lib/store";
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  applyFilters,
  countRecords,
  filtersAreDefault,
  sortTransactions,
  type Filters,
  type SortKey,
  type SortState,
} from "@/lib/transactions";

export default function TransactionsPage() {
  const { transactions, now } = useTransactions();
  const { summary, openAdd, openEdit } = useShell();

  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);

  const setFilters = (next: Filters) => {
    setFiltersState(next);
    setPage(1);
  };

  const sorted = useMemo(() => sortTransactions(applyFilters(transactions, filters, now), sort), [transactions, filters, now, sort]);
  const counts = countRecords(sorted);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const rows = sorted.slice(start, start + PAGE_SIZE);
  const month = summary.monthLabel.split(" ")[0];

  function onSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
    setPage(1);
  }

  const countLine = [
    `${counts.total} ${counts.total === 1 ? "record" : "records"}`,
    `${counts.posted} posted`,
    ...(counts.drafts ? [`${counts.drafts} receipt ${counts.drafts === 1 ? "draft" : "drafts"}`] : []),
  ].join(" · ");

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">Transactions</h1>
        <p className="mt-0.5 text-sm text-ink-500">Every income, expense and receipt. Only your records.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-ink-500">{month} income</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-emerald-600">{formatVnd(summary.income)}</p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-ink-500">{month} expenses</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-red-600">{formatVnd(summary.expenses)}</p>
        </div>
      </div>

      <TransactionFilters filters={filters} onChange={setFilters} now={now} />

      <section className="rounded-2xl border border-ink-200 bg-white pb-4 pt-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <header className="px-5 pb-4">
          <h2 className="text-[15px] font-semibold text-ink-900">Transaction records</h2>
          <p className="mt-0.5 text-xs text-ink-500" aria-live="polite">
            {countLine}
          </p>
          <p className="mt-2 text-xs text-ink-500">Draft receipts aren&apos;t included in balances, budgets or analytics.</p>
        </header>

        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center">
            {transactions.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-ink-900">No transactions yet</p>
                <p className="mt-1 text-sm text-ink-500">Record your first income or expense to see it here.</p>
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-4 h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
                >
                  Add transaction
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink-900">No transactions match these filters</p>
                <p className="mt-1 text-sm text-ink-500">Try a different search, or widen the date range.</p>
                {!filtersAreDefault(filters) && (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="mt-4 h-10 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-accent-600 hover:bg-accent-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
                  >
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <TransactionTable
              rows={rows}
              sort={sort}
              onSort={onSort}
              onOpen={openEdit}
              onCategory={(c: TransactionCategory) => setFilters({ ...filters, category: c })}
            />
            <div className="mt-3 flex flex-col items-start justify-between gap-3 border-t border-ink-200 px-5 pt-4 sm:flex-row sm:items-center">
              <p className="text-xs text-ink-500">
                Showing {start + 1}–{start + rows.length} of {sorted.length} {sorted.length === 1 ? "record" : "records"}
              </p>
              <Pagination page={current} pageCount={pageCount} onPage={setPage} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
