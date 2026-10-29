import { pageList } from "@/lib/transactions";

type Props = { page: number; pageCount: number; onPage: (page: number) => void };

const base =
  "flex h-9 items-center justify-center rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400";

export default function Pagination({ page, pageCount, onPage }: Props) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={`${base} px-3 text-ink-700 hover:bg-ink-100 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400 disabled:hover:bg-ink-100`}
      >
        Previous
      </button>
      {pageList(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-ink-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`${base} min-w-9 px-2 ${p === page ? "bg-accent-50 text-accent-700" : "text-ink-700 hover:bg-ink-100"}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        className={`${base} px-3 text-ink-700 hover:bg-ink-100 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400 disabled:hover:bg-ink-100`}
      >
        Next
      </button>
    </nav>
  );
}
