"use client";

import { useRouter } from "next/navigation";
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
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
  const {
    transactions,
    accounts,
    ready,
    now,
    error: transactionsError,
    migration,
    migrationError,
    migrationBusy,
    importLocalTransactions,
    skipLocalImport,
    reload,
  } = useTransactions();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerMode | null>(null);
  const [initialReceiptFile, setInitialReceiptFile] = useState<File | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getSession()
      .then((s) => {
        if (!active) return;
        if (!s) {
          router.replace("/sign-in");
          return;
        }
        startTransition(() => setSession(s));
      })
      .catch((error: unknown) => {
        if (active) setSessionError(error instanceof Error ? error.message : "Could not verify your session.");
      });
    return () => {
      active = false;
    };
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

  const summary = useMemo(() => summarize(transactions, now, accounts), [transactions, now, accounts]);
  const firstName = session?.name.trim().split(/\s+/)[0] || "there";
  const openAdd = useCallback(() => {
    setInitialReceiptFile(null);
    setDrawer({ kind: "add" });
  }, []);
  const openScanReceipt = useCallback(() => scanInputRef.current?.click(), []);
  const openEdit = useCallback((id: string) => setDrawer({ kind: "edit", id }), []);
  const shell = useMemo(
    () => ({ summary, firstName, openAdd, openEdit, openScanReceipt, showToast }),
    [summary, firstName, openAdd, openEdit, openScanReceipt, showToast],
  );

  function onScanFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setInitialReceiptFile(file);
    setDrawer({ kind: "add" });
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-100 px-6 text-center">
        <p role="alert" className="max-w-lg text-sm text-red-700">{sessionError}</p>
      </div>
    );
  }

  if (!session || !ready) {
    return <div className="min-h-screen bg-ink-100" aria-busy="true" />;
  }

  if (transactionsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-100 px-6 text-center">
        <p role="alert" className="max-w-lg text-sm text-red-700">{transactionsError}</p>
        <button
          type="button"
          onClick={reload}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
        >
          Retry
        </button>
      </div>
    );
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
        <Sidebar onNavigate={() => setNavOpen(false)} onOpenAdvisor={() => setAdvisorOpen(true)} onScanReceipt={openScanReceipt} />
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
              void signOut()
                .then(() => router.replace("/sign-in"))
                .catch((error: unknown) => showToast(error instanceof Error ? error.message : "Could not sign out."));
            }}
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
          </div>
        </main>
      </div>

      <input
        ref={scanInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="hidden"
        aria-label="Choose or take a receipt photo"
        onChange={onScanFile}
      />

      <AdvisorChat open={advisorOpen} onOpenChange={setAdvisorOpen} summary={summary} now={now} firstName={firstName} />

      {drawer && (
        <TransactionDrawer
          key={drawer.kind === "edit" ? drawer.id : "add"}
          mode={drawer}
          initialReceiptFile={initialReceiptFile}
          onClose={() => {
            setDrawer(null);
            setInitialReceiptFile(null);
          }}
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
      {!migration && migrationError && (
        <div role="alert" className="fixed bottom-6 left-1/2 z-70 -translate-x-1/2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg">
          Could not read the old browser transactions: {migrationError}
        </div>
      )}

      {migration && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/40 px-4" role="presentation">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="transaction-import-title"
            aria-describedby="transaction-import-description"
            className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-xl"
          >
            <h2 id="transaction-import-title" className="text-lg font-semibold text-ink-900">
              Import browser transactions?
            </h2>
            <p id="transaction-import-description" className="mt-2 text-sm leading-6 text-ink-600">
              {migration.transactions.length} saved transaction{migration.transactions.length === 1 ? "" : "s"} were found on this browser.
              They aren&apos;t linked to an account. Importing will add them to the account you&apos;re currently signed into. Demo rows are excluded; attached receipt files aren&apos;t copied.
            </p>
            {migrationError && <p role="alert" className="mt-3 text-sm text-red-700">{migrationError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={skipLocalImport}
                disabled={migrationBusy}
                className="h-10 rounded-xl border border-ink-200 px-4 text-sm font-semibold text-ink-700 hover:bg-ink-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200 disabled:opacity-50"
              >
                Skip for this account
              </button>
              <button
                type="button"
                onClick={() => void importLocalTransactions().catch(() => undefined)}
                disabled={migrationBusy}
                className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200 disabled:opacity-50"
              >
                {migrationBusy ? "Importing…" : "Import transactions"}
              </button>
            </div>
          </section>
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
  /** Open the platform file picker or mobile camera for a receipt photo. */
  openScanReceipt: () => void;
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
