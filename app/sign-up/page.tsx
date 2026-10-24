"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import  Button  from "@/components/Button";
import Divider from "@/components/Divider";
import Field from "@/components/Field";
import GoogleButton from "@/components/GoogleButton";
import { AuthError, registerUser } from "@/lib/auth";
import { useShake } from "@/lib/useShake";
import { validateEmail, validateName, validateNewPassword } from "@/lib/validators";

type Key = "name" | "email" | "password";

export default function SignUp() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Record<Key, string>>({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shaking, shake] = useShake();

  const errors: Record<Key, string | null> = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
  };
  const visibleError = (k: Key) => (touched[k] || submitted ? errors[k] : null);

  const update = (k: Key) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (formError) setFormError(null);
  };
  const blur = (k: Key) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setSubmitted(true);
    setFormError(null);

    if (errors.name || errors.email || errors.password) {
      shake();
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }

    setLoading(true);
    try {
      await registerUser(values);
      router.push("/dashboard");
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : "Something went wrong. Please try again.");
      shake();
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Make room for smarter money habits.">
      <form ref={formRef} noValidate onSubmit={onSubmit} className={`space-y-4 ${shaking ? "animate-shake" : ""}`}>
        <Field
          label="Your name"
          name="name"
          autoComplete="name"
          placeholder="Linh Nguyen"
          value={values.name}
          onChange={update("name")}
          onBlur={blur("name")}
          error={visibleError("name")}
          disabled={loading}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={update("email")}
          onBlur={blur("email")}
          error={visibleError("email")}
          disabled={loading}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={values.password}
          onChange={update("password")}
          onBlur={blur("password")}
          error={visibleError("password")}
          hint="Use at least 8 characters, including a number."
          hintTone={values.password && !errors.password ? "success" : "neutral"}
          disabled={loading}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <Button type="submit" loading={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="my-5">
        <Divider />
      </div>

      <GoogleButton />

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
