"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import Field from "@/components/Field";
import { AuthError, resetPassword } from "@/lib/auth";
import { useShake } from "@/lib/useShake";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, shake] = useShake();

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }
    if (values.password.length < 8 || values.password.length > 128 || !/\d/.test(values.password)) {
      setError("Use 8–128 characters and include at least one number.");
      shake();
      return;
    }
    if (values.password !== values.confirm) {
      setError("The passwords do not match.");
      shake();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, values.password);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : "Could not reset your password. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="Your password has been reset. You can now sign in." showTerms={false}>
        <Link href="/sign-in" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
          Go to login
        </Link>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard title="Reset link unavailable" subtitle="This link is invalid or missing." showTerms={false}>
        <Link href="/forgot-password" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Use at least 8 characters and include a number." showTerms={false}>
      <form noValidate onSubmit={onSubmit} className={`space-y-4 ${shaking ? "animate-shake" : ""}`}>
        <Field
          label="New password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={values.password}
          onChange={(event) => {
            setValues((current) => ({ ...current, password: event.target.value }));
            if (error) setError(null);
          }}
        />
        <Field
          label="Confirm new password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={values.confirm}
          onChange={(event) => {
            setValues((current) => ({ ...current, confirm: event.target.value }));
            if (error) setError(null);
          }}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={loading}>{loading ? "Updating…" : "Reset password"}</Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}
