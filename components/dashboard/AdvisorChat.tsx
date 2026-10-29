"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { answerQuestion, SUGGESTIONS } from "@/lib/advisor";
import type { Summary } from "@/lib/finance";
import { CloseIcon, SendIcon, SparkleIcon } from "../app-icons";

type Message = { id: number; role: "user" | "advisor"; text: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: Summary;
  now: Date;
  firstName: string;
};

/** Floating advisor: round bubble bottom-right that opens a small chat panel. */
export default function AdvisorChat({ open, onOpenChange, summary, now, firstName }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 0,
      role: "advisor",
      text: `Hi ${firstName}! Ask me anything about your recorded transactions or saving goals.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        bubbleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function ask(text: string) {
    const question = text.trim();
    if (!question || typing) return;
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text: question }]);
    setDraft("");
    setTyping(true);
    timer.current = setTimeout(() => {
      setMessages((m) => [...m, { id: nextId.current++, role: "advisor", text: answerQuestion(question, summary, now) }]);
      setTyping(false);
    }, 650);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(draft);
  }

  const onlyGreeting = messages.length === 1;

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Advisor chat"
          className="fixed bottom-24 right-4 z-50 flex h-[480px] max-h-[calc(100vh-7.5rem)] w-[360px] max-w-[calc(100vw-2rem)] animate-fade-up flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.28)] sm:right-6"
        >
          <header className="flex items-center gap-2.5 bg-blue-600 px-4 py-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <SparkleIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-4">SpendWise Advisor</p>
              <p className="text-xs text-blue-100">Answers from your recorded data</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close advisor"
              className="rounded-lg p-1.5 text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-ink-100/40 px-4 py-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-[13px] leading-5 ${
                    m.role === "user" ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-ink-200 bg-white text-ink-900"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start" aria-label="Advisor is typing">
                <span className="flex gap-1 rounded-2xl rounded-bl-md border border-ink-200 bg-white px-3.5 py-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-ink-200 bg-white p-3">
            {onlyGreeting && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about your spending…"
                aria-label="Message the advisor"
                className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 px-3 text-sm outline-none transition placeholder:text-ink-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!draft.trim() || typing}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-200"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        ref={bubbleRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={open ? "Close advisor" : "Ask the advisor"}
        aria-expanded={open}
        className="group fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_30px_-6px_rgba(37,99,235,0.6)] transition hover:scale-105 hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:right-6"
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <SparkleIcon className="h-6 w-6" />}
        {!open && (
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
            Ask the advisor
          </span>
        )}
      </button>
    </>
  );
}
