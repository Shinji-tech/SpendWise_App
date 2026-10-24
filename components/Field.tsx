"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  hintTone?: "neutral" | "success";
  /** Rendered on the right of the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
};

export default function Field({
  label,
  error,
  hint,
  hintTone = "neutral",
  labelAction,
  type = "text",
  ...rest
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-ink-100 ${
            isPassword ? "pr-11" : ""
          } ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-ink-200 hover:border-ink-400 focus:border-brand-500 focus:ring-brand-100"
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-ink-400 transition hover:text-ink-700 focus:outline-none focus-visible:text-brand-700"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className={`mt-1.5 text-[13px] transition-colors ${
            hintTone === "success" ? "text-brand-700" : "text-ink-500"
          }`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
