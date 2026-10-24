"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Returns a flag that flips on briefly so a form can play the `shake` animation. */
export function useShake(duration = 520) {
  const [shaking, setShaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const trigger = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setShaking(false);
    // Re-apply on the next frame so the animation restarts every time.
    requestAnimationFrame(() => {
      setShaking(true);
      timer.current = setTimeout(() => setShaking(false), duration);
    });
  }, [duration]);

  return [shaking, trigger] as const;
}
