import type { Transaction } from "@/lib/data";
import { formatDate, formatSignedVnd } from "@/lib/format";
import { ReceiptIcon } from "../app-icons";
import Card from "./Card";
import { CategoryIcon } from "./categoryIcon";

export default function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card
      title="Recent transactions"
      subtitle="Latest confirmed records · receipt icons indicate attached images"
      action={{ label: "View all transactions", href: "/transactions" }}
      className="h-full"
    >
      {transactions.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-500">No transactions yet. Use “Add transaction” to record your first one.</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg py-2 transition-colors first:pt-0 last:pb-0 hover:bg-ink-100/50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <CategoryIcon category={t.category} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{t.title}</p>
                <p className="truncate text-xs text-ink-500">{t.note || "No note"}</p>
              </div>
              <span className="hidden shrink-0 text-xs text-ink-500 sm:block">{formatDate(t.date)}</span>
              <span
                className={`w-24 shrink-0 text-right text-sm font-semibold tabular-nums ${t.type === "expense" ? "text-red-600" : "text-emerald-600"}`}
              >
                {t.type === "expense" ? formatSignedVnd(-t.amount) : formatSignedVnd(t.amount)}
              </span>
              <span className="hidden w-5 shrink-0 text-ink-400 sm:block" title={t.receipt ? "Receipt attached" : undefined}>
                {t.receipt && <ReceiptIcon className="h-4 w-4" />}
              </span>
              <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 md:block">
                Confirmed
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
