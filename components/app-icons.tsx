import type { ReactNode } from "react";

type P = { className?: string };

function Svg({ className = "h-4.5 w-4.5", children }: P & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
);
export const TransactionsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 4v14m0 0-3-3m3 3 3-3" />
    <path d="M17 20V6m0 0-3 3m3-3 3 3" />
  </Svg>
);
export const ScanIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M8 12h8" />
  </Svg>
);
export const BudgetsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
    <path d="M15 3.5A9 9 0 0 1 20.500 9H15V3.500Z" />
  </Svg>
);
export const GoalsIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" />
  </Svg>
);
export const AnalyticsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
);
export const SparkleIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.500 13.800 9l5.700 1.800-5.700 1.800L12 18l-1.800-5.400L4.500 10.800 10.200 9 12 3.500Z" />
    <path d="M19 3v4M17 5h4" />
  </Svg>
);
export const AccountsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 9.500 12 4l9 5.500" />
    <path d="M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3 20h18" />
  </Svg>
);
export const SettingsIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.400 15a1.700 1.700 0 0 0 .3 1.800l.1.1a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.1a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.1a1.700 1.700 0 0 0 1.800.3h0a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 1 1.500h0a1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.1a1.700 1.700 0 0 0-.3 1.800v0a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1Z" />
  </Svg>
);
export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.500" />
    <path d="m20 20-3.500-3.500" />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const MenuIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);
export const SendIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12 20 4l-4 16-4.500-6.500L5 12Z" />
    <path d="m11.500 13.500 3-3" />
  </Svg>
);
export const LogoutIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" />
  </Svg>
);
export const ReceiptIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </Svg>
);
export const ChevronRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const CoffeeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" />
    <path d="M16 10h1.500a2.500 2.500 0 0 1 0 5H16M8 3v2M12 3v2" />
  </Svg>
);
export const BagIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.500a3 3 0 0 1 6 0V8" />
  </Svg>
);
export const CarIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 16V11l1.800-4.500A2 2 0 0 1 8.600 5h6.800a2 2 0 0 1 1.800 1.500L19 11v5" />
    <path d="M3.500 16h17v2.500h-17zM5 11h14" />
    <circle cx="8" cy="14" r=".6" />
    <circle cx="16" cy="14" r=".6" />
  </Svg>
);
export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="m4 11 8-7 8 7" />
    <path d="M6 10v9h12v-9M10 19v-5h4v5" />
  </Svg>
);
export const BoltIcon = (p: P) => (
  <Svg {...p}>
    <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
  </Svg>
);
export const IncomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v14m0 0-5-5m5 5 5-5M5 20h14" />
  </Svg>
);
export const DotsIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </Svg>
);
export const PaperclipIcon = (p: P) => (
  <Svg {...p}>
    <path d="m20 11-8.500 8.500a5 5 0 0 1-7-7L13 4a3.500 3.500 0 0 1 5 5l-8.500 8.500a2 2 0 0 1-3-3L14 7" />
  </Svg>
);
export const ChevronDownIcon = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const ChevronLeftIcon = (p: P) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
export const ArrowUpIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5m0 0-5 5m5-5 5 5" />
  </Svg>
);
export const TrashIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Svg>
);
export const FileIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 3h7l5 5v13H7V3Z" />
    <path d="M14 3v5h5" />
  </Svg>
);
