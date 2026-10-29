import type { ReactNode } from "react";
import { ChevronDownIcon } from "../app-icons";

type Option = { value: string; label: string };

type Props = {
  /** Visible prefix, e.g. "Type". Also used as the accessible name. */
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Text shown after the prefix. Defaults to the selected option's label. */
  display?: ReactNode;
  /** Tint the control when it differs from its default. */
  active?: boolean;
};

/**
 * Looks like the design's "Category: All" pill but is a real <select> underneath,
 * so keyboard, screen readers and mobile pickers all work.
 */
export default function FilterSelect({ label, value, options, onChange, display, active = false }: Props) {
  const selected = options.find((o) => o.value === value);
  return (
    <div
      className={`relative flex h-11 items-center rounded-xl border px-3.5 text-sm transition focus-within:ring-4 focus-within:ring-accent-100 ${
        active ? "border-accent-500 bg-accent-50 text-accent-700" : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
      }`}
    >
      <span className="truncate pr-6">
        <span className={active ? "text-accent-700/80" : "text-ink-500"}>{label}: </span>
        <span className="font-medium">{display ?? selected?.label}</span>
      </span>
      <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-current opacity-70" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
