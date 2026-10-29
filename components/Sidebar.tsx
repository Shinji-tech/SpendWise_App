"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import Logo from "./Logo";
import {
  AccountsIcon,
  AnalyticsIcon,
  BudgetsIcon,
  DashboardIcon,
  GoalsIcon,
  ScanIcon,
  SettingsIcon,
  SparkleIcon,
  TransactionsIcon,
} from "./app-icons";

type Item = { label: string; icon: ComponentType<{ className?: string }> } & ({ href: string } | { action: "advisor" });

export const NAV: Item[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Transactions", href: "/transactions", icon: TransactionsIcon },
  { label: "Scan receipt", href: "/scan-receipt", icon: ScanIcon },
  { label: "Budgets", href: "/budgets", icon: BudgetsIcon },
  { label: "Goals", href: "/goals", icon: GoalsIcon },
  { label: "Analytics", href: "/analytics", icon: AnalyticsIcon },
  { label: "Advisor", action: "advisor", icon: SparkleIcon },
  { label: "Accounts", href: "/accounts", icon: AccountsIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

const itemCls = (active: boolean) =>
  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
    active ? "bg-accent-50 text-accent-700" : "text-ink-700 hover:bg-ink-100"
  }`;

export default function Sidebar({ onNavigate, onOpenAdvisor }: { onNavigate: () => void; onOpenAdvisor: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-4 pb-4 pt-4">
        <Link href="/dashboard" onClick={onNavigate} aria-label="SpendWise dashboard" className="inline-block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
          <Logo tone="accent" />
        </Link>
      </div>

      <p className="px-4 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">Personal finance</p>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          if ("action" in item) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onNavigate();
                  onOpenAdvisor();
                }}
                className={itemCls(false)}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </button>
            );
          }
          const active = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={itemCls(active)}>
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-4 py-4 text-xs leading-4 text-ink-500">Your personal space. Only your records.</p>
    </div>
  );
}
