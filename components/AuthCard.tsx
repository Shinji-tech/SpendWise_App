import type { ReactNode } from "react";
import Logo from "./Logo";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Hide the terms line, e.g. on a success state. */
  showTerms?: boolean;
};

export default function AuthCard({ title, subtitle, children, showTerms = true }: Props) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.brand.100),transparent_70%)] opacity-70"
      />
        
      <div className="relative w-full max-w-105 animate-fade-up">
        <div className="rounded-3xl border border-ink-200/70 bg-white p-7 shadow-card sm:p-9">
          <Logo className="mb-7" />
          <h1 className="text-center text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1.5 text-center text-[15px] text-ink-500">{subtitle}</p>

          <div className="mt-7">{children}</div>

          {showTerms && (
            <p className="mt-6 text-center text-xs leading-5 text-ink-500">
              By continuing, you agree to our{" "}
              <a href="#" className="font-medium text-ink-700 underline-offset-2 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="font-medium text-ink-700 underline-offset-2 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Personal finance. One account, just for you.
        </p>
      </div>
    </main>
  );
}
