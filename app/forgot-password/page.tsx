"use client";

import Link from "next/link";
import { useEffect, useState, type SubmitEvent } from "react";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import Divider from "@/components/Divider";
import Field from "@/components/Field";
import GoogleButton from "@/components/GoogleButton";
import { MailIcon } from "@/components/icons";
import { requestPasswordReset } from "@/lib/auth";
import { useShake } from "@/lib/useShake";
import { validateEmail } from "@/lib/validators";

const RESEND_SECONDS = 30;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [shaking, shake] = useShake();

  const error = validateEmail(email);
  const showError = touched ? error : null;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function send() {
    setLoading(true);
    setFormError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch {
      setFormError("We couldn't send the link. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setTouched(true);
    if (error) {
      shake();
      return;
    }
    await send();
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="If an account exists for that address, a reset link is on its way."
        showTerms={false}
      >
        <div className="flex flex-col items-center rounded-2xl bg-brand-50 px-4 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
            <MailIcon />
          </span>
          <p className="mt-3 text-sm text-ink-500">We sent a link to</p>
          <p className="break-all text-[15px] font-semibold text-ink-900">{email.trim()}</p>
        </div>

        <div className="mt-5 space-y-3">
          {formError && <Alert tone="error">{formError}</Alert>}
          <Button variant="secondary" onClick={send} loading={loading} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCooldown(0);
            }}
            className="w-full py-1 text-center text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            Use a different email
          </button>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/sign-in" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
            Back to login
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we’ll send you a reset link.">
      <form noValidate onSubmit={onSubmit} className={`space-y-4 ${shaking ? "animate-shake" : ""}`}>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (formError) setFormError(null);
          }}
          onBlur={() => setTouched(true)}
          error={showError}
          disabled={loading}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <Button type="submit" loading={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <div className="my-5">
        <Divider />
      </div>

      <GoogleButton />

      <p className="mt-6 text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}
