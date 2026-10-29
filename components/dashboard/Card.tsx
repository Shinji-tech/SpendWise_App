import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  /** Small link in the header, e.g. "View all". */
  action?: { label: string; href: string };
  /** Extra content on the right of the header (legend etc). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function Card({ title, subtitle, action, aside, className = "", children }: Props) {
  return (
    <section className={`flex flex-col rounded-2xl border border-ink-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-5 text-ink-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-4 text-ink-500">{subtitle}</p>}
        </div>
        {aside}
        {action && (
          <Link
            href={action.href}
            className="shrink-0 rounded-md px-1 text-xs font-medium text-accent-600 hover:text-accent-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-200"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
