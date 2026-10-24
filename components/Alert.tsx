import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

const tones = {
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-ink-200 bg-ink-100/70 text-ink-700",
} as const;

export default function Alert({
  tone = "error",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] leading-5 ${tones[tone]}`}
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}