import type { ButtonHTMLAttributes } from "react";
import { SpinnerIcon } from "./icons";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
};

const base =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed";

const variants = {
  primary:
    "bg-brand-600 text-black shadow-sm shadow-brand-700/20 hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-200 disabled:bg-brand-400 disabled:shadow-none",
  secondary:
    "border border-ink-200 bg-white text-ink-900 hover:border-ink-400 hover:bg-ink-100/60 active:bg-ink-100 focus-visible:ring-ink-200 disabled:text-ink-400",
} as const;

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]}`}
      {...rest}
    >
      {loading && <SpinnerIcon />}
      {children}
    </button>
  );
}