const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 12000000 -> "12,000,000đ" (fixed locale so server and client always agree). */
export function formatVnd(amount: number): string {
  return `${Math.round(Math.abs(amount)).toLocaleString("en-US")}đ`;
}

/** Adds an explicit sign: "-65,000đ" / "+12,000,000đ". */
export function formatSignedVnd(amount: number): string {
  const sign = amount < 0 ? "-" : "+";
  return `${sign}${formatVnd(amount)}`;
}

/** 6000000 -> "6M", 500000 -> "500K" (chart axes). */
export function formatCompactVnd(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1_000_000) return `${+(amount / 1_000_000).toFixed(1)}M`;
  return `${Math.round(amount / 1_000)}K`;
}

export function monthShort(monthIndex: number): string {
  return MONTHS[((monthIndex % 12) + 12) % 12];
}

/** "2026-10-09" -> "09 Oct 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Local date -> "YYYY-MM-DD" (not UTC, so late-night users get the right day). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** 240000 -> "234 KB" */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
