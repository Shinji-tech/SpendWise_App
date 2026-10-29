"use client";

import { useRouter } from "next/navigation";
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSession, signOut, type Session } from "@/lib/auth";
import { summarize, type Summary } from "@/lib/finance";
import { useTransactions } from "@/lib/store";
import { MenuIcon, PlusIcon } from "./app-icons";
import TransactionDrawer, { type DrawerMode } from "./transactions/TransactionDrawer";
import AdvisorChat from "./dashboard/AdvisorChat";
import SearchBox from "./dashboard/SearchBox";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import { CheckIcon } from "./icons";

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { transactions, ready, now } = useTransactions();
  const [session, setSession] = useState<Session | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerMode | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/sign-in");
      return;
    }
    startTransition(() => setSession(s));
  }, [router]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const summary = useMemo(() => summarize(transactions, now), [transactions, now]);
  const firstName = session?.name.trim().split(/\s+/)[0] || "there";
  const openAdd = useCallback(() => setDrawer({ kind: "add" }), []);
  const openEdit = useCallback((id: string) => setDrawer({ kind: "edit", id }), []);
  const shell = useMemo(() => ({ summary, firstName, openAdd, openEdit, showToast }), [summary, firstName, openAdd, openEdit, showToast]);

  if (!session || !ready) {
    return <div className="min-h-screen bg-ink-100" aria-busy="true" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-100/60">
      {/* Sidebar: static on desktop, slide-over on mobile */}
      {navOpen && <div className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-ink-200 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setNavOpen(false)} onOpenAdvisor={() => setAdvisorOpen(true)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex flex-1 justify-end sm:justify-start">
            <SearchBox />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200 sm:px-4"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Add transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
          <UserMenu
            session={session}
            onSignOut={() => {
              signOut();
              router.push("/sign-in");
            }}
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
          </div>
        </main>
      </div>

      <AdvisorChat open={advisorOpen} onOpenChange={setAdvisorOpen} summary={summary} now={now} firstName={firstName} />

      {drawer && (
        <TransactionDrawer
          key={drawer.kind === "edit" ? drawer.id : "add"}
          mode={drawer}
          onClose={() => setDrawer(null)}
          onToast={showToast}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-70 flex -translate-x-1/2 animate-fade-up items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <CheckIcon className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

type ShellValue = {
  summary: Summary;
  firstName: string;
  /** Open the add-transaction drawer. */
  openAdd: () => void;
  /** Open the edit drawer for a transaction id. */
  openEdit: (id: string) => void;
  showToast: (message: string) => void;
};

const ShellContext = createContext<ShellValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}
