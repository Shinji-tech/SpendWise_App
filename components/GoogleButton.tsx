"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "./Alert";
import  Button  from "./Button";
import { GoogleIcon } from "./icons";

/**
 * "Continue with Google". There's no OAuth provider wired up yet, so clicking it
 * shows a short notice. Replace the onClick body with your sign-in call
 * (e.g. NextAuth's `signIn("google")`).
 */
export default function GoogleButton() {
  const [notice, setNotice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleClick() {
    setNotice(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(false), 4000);
  }

  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={handleClick}>
        <GoogleIcon />
        Continue with Google
      </Button>
      {notice && <Alert tone="info">Google sign-in isn&apos;t connected yet. Hook it up to your OAuth provider.</Alert>}
    </div>
  );
}