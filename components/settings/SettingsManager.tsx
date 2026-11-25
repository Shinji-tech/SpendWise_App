"use client";

import { useEffect, useState, type FormEvent } from "react";
import { changePassword, requestEmailChange, updateProfile } from "@/lib/auth";
import { useShell } from "@/components/AppShell";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none transition focus:border-accent-500 focus:ring-4 focus:ring-accent-100";

type GoogleStatus = "loading" | "connected" | "not-connected" | "error";

export default function SettingsManager() {
  const { session, updateSession } = useShell();
  const [name, setName] = useState(session?.name ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>("loading");
  const [googleNotice, setGoogleNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [saving, setSaving] = useState<"profile" | "password" | "email" | null>(null);

  useEffect(() => {
    let active = true;
    async function loadGoogleStatus() {
      try {
        const response = await fetch("/api/settings/google", { cache: "no-store" });
        if (!response.ok) throw new Error("Google status request failed.");
        const result = (await response.json()) as { connected?: unknown };
        if (active) setGoogleStatus(result.connected === true ? "connected" : "not-connected");
      } catch {
        if (active) setGoogleStatus("error");
      }
    }

    void loadGoogleStatus();
    const url = new URL(window.location.href);
    let notice: { text: string; tone: "error" | "success" } | null = null;
    if (url.searchParams.get("google") === "connected") {
      notice = { text: "Google sign-in is connected to your account.", tone: "success" };
      url.searchParams.delete("google");
    }
    const googleError = url.searchParams.get("google_error");
    if (googleError) {
      const messages: Record<string, string> = {
        already_linked: "That Google account is already connected to another SpendWise account.",
        not_configured: "Google sign-in is not configured yet. Contact the administrator.",
        sign_in_required: "Sign in again before connecting Google.",
        unavailable: "Could not connect Google. Please try again.",
      };
      notice = { text: messages[googleError] ?? "Could not connect Google. Please try again.", tone: "error" };
      url.searchParams.delete("google_error");
    }
    if (url.href !== window.location.href) {
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const frame = notice ? requestAnimationFrame(() => setGoogleNotice(notice)) : null;
    return () => {
      active = false;
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setProfileError("Enter a name between 2 and 80 characters.");
      return;
    }

    setSaving("profile");
    setProfileError(null);
    setProfileSaved(false);
    try {
      const updatedSession = await updateProfile(trimmedName);
      updateSession(updatedSession);
      setName(updatedSession.name);
      setProfileSaved(true);
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Could not update your profile.");
    } finally {
      setSaving(null);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (passwords.next.length < 8 || passwords.next.length > 128 || !/\d/.test(passwords.next)) {
      setPasswordError("Use 8–128 characters and include at least one number.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setSaving("password");
    setPasswordError(null);
    setPasswordSaved(false);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordSaved(true);
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "Could not change your password.");
    } finally {
      setSaving(null);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const newEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail) || newEmail.length > 254) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setSaving("email");
    setEmailError(null);
    setEmailMessage(null);
    try {
      const message = await requestEmailChange(newEmail, emailPassword);
      setEmailMessage(message);
      setEmail("");
      setEmailPassword("");
    } catch (cause) {
      setEmailError(cause instanceof Error ? cause.message : "Could not request an email change.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-500">Manage your profile and account security.</p>
      </header>

      <form onSubmit={(event) => void saveProfile(event)} className="max-w-2xl space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">Profile</h2>
          <p className="mt-0.5 text-xs text-ink-500">Your name appears in the app. Email is used to sign in.</p>
        </div>
        <label className="block text-[13px] font-medium text-ink-700">
          Display name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" required className={inputClass} />
        </label>
        <label className="block text-[13px] font-medium text-ink-700">
          Email
          <input value={session?.email ?? ""} readOnly aria-readonly="true" className={`${inputClass} bg-ink-50 text-ink-500`} />
          <span className="mt-1 block text-xs font-normal text-ink-500">Confirm any new address from your inbox before it becomes your sign-in email.</span>
        </label>
        {profileError && <p role="alert" className="text-sm text-red-700">{profileError}</p>}
        {profileSaved && <p role="status" className="text-sm text-emerald-700">Profile updated.</p>}
        <button type="submit" disabled={saving !== null} className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">
          {saving === "profile" ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form onSubmit={(event) => void saveEmail(event)} className="max-w-2xl space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">Change email address</h2>
          <p className="mt-0.5 text-xs text-ink-500">We’ll send a one-time confirmation link to the new address. The link expires in 60 minutes.</p>
        </div>
        <label className="block text-[13px] font-medium text-ink-700">
          New email
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required className={inputClass} />
        </label>
        <label className="block text-[13px] font-medium text-ink-700">
          Current password (required for password accounts)
          <input type="password" autoComplete="current-password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} maxLength={128} className={inputClass} />
        </label>
        {emailError && <p role="alert" className="text-sm text-red-700">{emailError}</p>}
        {emailMessage && <p role="status" className="text-sm text-emerald-700">{emailMessage}</p>}
        <button type="submit" disabled={saving !== null} className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">
          {saving === "email" ? "Sending…" : "Send confirmation link"}
        </button>
      </form>

      <form onSubmit={(event) => void savePassword(event)} className="max-w-2xl space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">Change password</h2>
          <p className="mt-0.5 text-xs text-ink-500">Use at least 8 characters and include a number. Google-only accounts can set a password without a current one.</p>
        </div>
        <label className="block text-[13px] font-medium text-ink-700">
          Current password (if set)
          <input type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))} minLength={8} maxLength={128} className={inputClass} />
        </label>
        <label className="block text-[13px] font-medium text-ink-700">
          New password
          <input type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))} minLength={8} maxLength={128} required className={inputClass} />
        </label>
        <label className="block text-[13px] font-medium text-ink-700">
          Confirm new password
          <input type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} minLength={8} maxLength={128} required className={inputClass} />
        </label>
        {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
        {passwordSaved && <p role="status" className="text-sm text-emerald-700">Password changed successfully.</p>}
        <button type="submit" disabled={saving !== null} className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">
          {saving === "password" ? "Saving…" : "Change password"}
        </button>
      </form>

      <section className="max-w-2xl space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">Google sign-in</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            {googleStatus === "loading" ? "Checking connection…" :
              googleStatus === "connected" ? "Your Google account is connected." :
                googleStatus === "error" ? "Could not check the Google connection." :
                  "Connect Google to sign in without a password."}
          </p>
        </div>
        {googleStatus !== "connected" && (
          <button type="button" onClick={() => window.location.assign(new URL("/api/auth/google?mode=link", window.location.origin).toString())} className="inline-flex h-10 items-center rounded-xl border border-ink-200 px-4 text-sm font-semibold text-ink-800 hover:bg-ink-100">
            Connect Google
          </button>
        )}
        {googleNotice && (
          <p role={googleNotice.tone === "error" ? "alert" : "status"} className={`text-sm ${googleNotice.tone === "error" ? "text-red-700" : "text-emerald-700"}`}>
            {googleNotice.text}
          </p>
        )}
      </section>
    </div>
  );
}
