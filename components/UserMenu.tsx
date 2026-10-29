"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@/lib/auth";
import { LogoutIcon } from "./app-icons";

export default function UserMenu({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = session.name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700 transition hover:bg-accent-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-30 w-60 animate-fade-up rounded-xl border border-ink-200 bg-white p-1.5 shadow-card">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink-900">{session.name}</p>
            <p className="truncate text-xs text-ink-500">{session.email}</p>
          </div>
          <div className="my-1 h-px bg-ink-100" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            <LogoutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
