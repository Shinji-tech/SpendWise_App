"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_LABEL } from "@/lib/data";
import { formatDate, formatSignedVnd } from "@/lib/format";
import { useTransactions } from "@/lib/store";
import { CloseIcon, SearchIcon } from "../app-icons";
import { CategoryIcon } from "./categoryIcon";

/** Live search across the user's transactions (title, note, category, amount). */
export default function SearchBox() {
  const { transactions } = useTransactions();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return transactions
      .filter((t) => t.status === "confirmed")
      .filter((t) => `${t.title} ${t.note} ${CATEGORY_LABEL[t.category]} ${t.amount}`.toLowerCase().includes(q))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [q, transactions]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder="Search transactions and receipts"
        aria-label="Search transactions and receipts"
        className="h-10 w-full appearance-none rounded-xl border border-ink-200 bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-ink-400 hover:border-ink-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-700"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}

      {open && q && (
        <div className="absolute left-0 right-0 top-12 z-30 max-h-80 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-card">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-ink-500">No transactions match “{query.trim()}”.</p>
          ) : (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
              <ul role="list">
                {results.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-ink-100/60">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                      <CategoryIcon category={t.category} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{t.title}</p>
                      <p className="truncate text-xs text-ink-500">
                        {formatDate(t.date)} · {CATEGORY_LABEL[t.category]}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${t.type === "expense" ? "text-red-600" : "text-emerald-600"}`}>
                      {formatSignedVnd(t.type === "expense" ? -t.amount : t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {results.length > 6 && <p className="px-2.5 py-1.5 text-xs text-ink-500">+{results.length - 6} more. Refine your search to narrow it down.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
