import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { TransactionsProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TransactionsProvider>
      <AppShell>{children}</AppShell>
    </TransactionsProvider>
  );
}
