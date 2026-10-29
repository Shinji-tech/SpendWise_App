"use client";

import {
  ACCOUNT_LABEL,
  CATEGORY_LABEL,
  type Transaction,
  type TransactionCategory,
  type TransactionStatus,
} from "@/lib/data";
import { formatDate, formatSignedVnd } from "@/lib/format";
import type { SortKey, SortState } from "@/lib/transactions";
import { ArrowUpIcon, ReceiptIcon } from "../app-icons";
import { CategoryIcon } from "../dashboard/categoryIcon";

const GRID = "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.5fr)]";

const STATUS: Record<TransactionStatus, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700" },
  needs_review: { label: "Needs review", cls: "bg-amber-50 text-amber-700" },
  processing: { label: "Processing", cls: "bg-accent-50 text-accent-700" },
};

export function StatusPill({ status }: { status: TransactionStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {status === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-600" aria-hidden="true" />}
      {s.label}
    </span>
  );
}

function Arrow({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return <ArrowUpIcon className={`h-3 w-3 transition ${active ? (dir === "desc" ? "rotate-180 opacity-100" : "opacity-100") : "opacity-0"}`} />;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  return (
    <div role="columnheader" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded px-0.5 text-xs font-medium transition hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
          active ? "text-ink-900" : "text-ink-500"
        }`}
      >
        {align === "right" && <Arrow active={active} dir={sort.dir} />}
        {label}
        {align === "left" && <Arrow active={active} dir={sort.dir} />}
      </button>
    </div>
  );
}

type Props = {
  rows: Transaction[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
  onCategory: (category: TransactionCategory) => void;
};

export default function TransactionTable({ rows, sort, onSort, onOpen, onCategory }: Props) {
  return (
    <div role="table" aria-label="Transaction records">
      <div role="rowgroup" className="hidden lg:block">
        <div role="row" className={`grid ${GRID} items-center gap-x-4 border-b border-ink-200 px-5 pb-2.5`}>
          <div role="columnheader" className="text-xs font-medium text-ink-500">
            Merchant / description
          </div>
          <div role="columnheader" className="text-xs font-medium text-ink-500">
            Category
          </div>
          <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} />
          <SortHeader label="Amount" sortKey="amount" sort={sort} onSort={onSort} align="right" />
          <div role="columnheader" className="pl-3 text-xs font-medium text-ink-500">
            Account
          </div>
          <div role="columnheader" className="text-xs font-medium text-ink-500">
            Receipt status
          </div>
        </div>
      </div>

      <div role="rowgroup" className="divide-y divide-ink-100">
        {rows.map((t) => {
          const draft = t.status !== "confirmed";
          const amount = formatSignedVnd(t.type === "income" ? t.amount : -t.amount);
          const amountCls = t.type === "income" ? "text-emerald-600" : "text-red-600";
          return (
            <div
              key={t.id}
              role="row"
              tabIndex={0}
              aria-label={`${t.title}, ${amount}, ${formatDate(t.date)}. Press Enter to edit.`}
              onClick={() => onOpen(t.id)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onOpen(t.id);
                }
              }}
              className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3 outline-none transition-colors hover:bg-ink-100/60 focus-visible:bg-accent-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400 lg:py-3.5 ${GRID}`}
            >
              <div role="cell" className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <CategoryIcon category={t.category} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{t.title}</p>
                  <p className="truncate text-xs text-ink-500">{draft ? "Receipt draft · not included in totals" : t.note || "No note"}</p>
                </div>
              </div>

              <div role="cell" className="hidden lg:block">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCategory(t.category);
                  }}
                  title={`Show only ${CATEGORY_LABEL[t.category]}`}
                  className="max-w-full truncate rounded px-0.5 text-left text-xs font-medium text-accent-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                >
                  {CATEGORY_LABEL[t.category]}
                </button>
              </div>

              <div role="cell" className="hidden text-xs text-ink-700 lg:block">
                {formatDate(t.date)}
              </div>

              <div role="cell" className={`text-right text-sm font-semibold tabular-nums lg:text-right ${amountCls}`}>
                {amount}
              </div>

              <div role="cell" className="hidden truncate pl-3 text-xs text-ink-700 lg:block">
                {ACCOUNT_LABEL[t.account]}
              </div>

              <div role="cell" className="hidden items-center gap-2.5 lg:flex">
                <span className="flex w-5 shrink-0 justify-center text-ink-400" title={t.receipt ? t.receipt.name : "No receipt attached"}>
                  {t.receipt ? <ReceiptIcon className="h-5 w-5" /> : <span aria-label="No receipt">—</span>}
                </span>
                <StatusPill status={t.status} />
              </div>

              {/* Compact meta line for small screens */}
              <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-11 text-xs text-ink-500 lg:hidden">
                <span className="font-medium text-accent-600">{CATEGORY_LABEL[t.category]}</span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(t.date)}</span>
                <span aria-hidden="true">·</span>
                <span>{ACCOUNT_LABEL[t.account]}</span>
                {t.receipt && <ReceiptIcon className="h-4 w-4 text-ink-400" />}
                <StatusPill status={t.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
