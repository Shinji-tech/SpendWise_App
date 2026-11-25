"use client";

import Link from "next/link";
import { useState } from "react";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import { AuthError, confirmEmailChange } from "@/lib/auth";

export default function VerifyEmailChangeForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await confirmEmailChange(token);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : "Could not verify this email address.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Confirmation link unavailable" subtitle="This link is invalid or missing." showTerms={false}>
        <Link href="/sign-in" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
          Back to login
        </Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Email updated" subtitle="Your new email is ready to use. Sign in again to continue." showTerms={false}>
        <Link href="/sign-in" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirm new email" subtitle="Confirm this address to use it for signing in." showTerms={false}>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="button" onClick={() => void confirm()} loading={loading}>
        {loading ? "Confirming…" : "Confirm email address"}
      </Button>
      <p className="mt-5 text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}
