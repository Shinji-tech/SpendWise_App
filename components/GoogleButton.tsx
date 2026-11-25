"use client";

import { useEffect, useState } from "react";
import Alert from "./Alert";
import Button from "./Button";
import { GoogleIcon } from "./icons";

const GOOGLE_ERRORS: Record<string, string> = {
  account_exists: "This email already has an account. Sign in with your password, then connect Google in Settings.",
  already_linked: "That Google account is already connected to another SpendWise account.",
  cancelled: "Google sign-in was cancelled.",
  invalid_state: "The Google sign-in request expired. Please try again.",
  not_configured: "Google sign-in is not configured yet. Contact the administrator.",
  provider_error: "Google sign-in could not be completed. Please try again.",
  sign_in_required: "Sign in first, then connect Google from Settings.",
  unavailable: "Authentication is temporarily unavailable. Please try again.",
};

export default function GoogleButton() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("google_error");
    if (!error) return;
    const frame = requestAnimationFrame(() => setNotice(GOOGLE_ERRORS[error] ?? GOOGLE_ERRORS.provider_error));
    url.searchParams.delete("google_error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={() => window.location.assign(new URL("/api/auth/google", window.location.origin).toString())}>
        <GoogleIcon />
        Continue with Google
      </Button>
      {notice && <Alert tone="error">{notice}</Alert>}
    </div>
  );
}