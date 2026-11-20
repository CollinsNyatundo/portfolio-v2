"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type {
  AssistantOperationalMode,
  AssistantResponse,
  PublicEvidenceRef,
  PublicFactCard,
} from "@/lib/assistant/types";
import { AssistantIcon } from "./assistant-icon";

type ThreadMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; response: AssistantResponse }
  | { id: string; role: "error"; text: string };

const REQUEST_TIMEOUT_MS = 20_000;

function startersForPath(pathname: string): string[] {
  if (
    pathname.startsWith("/work/creditcard-fraud") ||
    pathname === "/demos/fraud"
  ) {
    return [
      "What F1 and recall did the fraud model get on the holdout?",
      "Why does 1.4 ms not represent full API latency?",
      "Why did you port TreeSHAP without the lightgbm library?",
    ];
  }
  if (pathname.startsWith("/work/legalai-kenya")) {
    return [
      "How does LegalAI Kenya refuse weak or off-topic questions?",
      "How is cross-tenant isolation enforced and tested?",
      "What are the main limits of LegalAI Kenya?",
    ];
  }
  if (pathname.startsWith("/work/complianceguard")) {
    return [
      "Is ComplianceGuard running in live bank environments?",
      "How does ComplianceGuard handle POCAMLA and M-Pesa typologies?",
      "How are national IDs and audit logs protected?",
    ];
  }
  if (pathname.startsWith("/work/production-ai-template")) {
    return [
      "How does the AI template prevent cross-tenant data leaks?",
      "What CI checks and coverage does it report?",
      "What are its current limits?",
    ];
  }
  if (pathname.startsWith("/work/geo-ai-cropland-mapping")) {
    return [
      "What happened when SMOTE ran before splitting?",
      "Why is the 0.745 accuracy still considered optimistic?",
      "What baseline did RandomForest beat?",
    ];
  }
  return [
    "How does LegalAI Kenya refuse weak answers?",
    "What happened on the fraud holdout and why no lightgbm at runtime?",
    "Is Collins available for remote AI and ML engineering roles?",
  ];
}

function currentEpochMs(): number {
  return Date.now();
}

function safeTrack(eventName: string, props: Record<string, string>): void {
  try {
    track(eventName, props);
  } catch {
    // Analytics is optional and non-blocking.
  }
}

function FactCardList({
  facts,
  onNavigate,
}: {
  facts: PublicFactCard[];
  onNavigate: () => void;
}) {
  if (facts.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-muted font-sans text-xs font-medium tracking-wide uppercase">
        Recorded figures and limits
      </p>
      <ul className="space-y-2">
        {facts.map((fact) => (
          <li
            key={fact.id}
            className="border-border bg-bg/70 rounded-sm border p-3 font-sans text-xs"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-text font-medium">{fact.label}</span>
              <span className="figure text-primary text-sm font-medium">
                {fact.value}
              </span>
            </div>
            <p className="text-muted mt-1">{fact.datasetOrContext}</p>
            <p className="text-text mt-1">Caveat: {fact.caveat}</p>
            <p className="text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <Link href={fact.route} onClick={onNavigate}>
                Open section
              </Link>
              {fact.evidenceUrl ? (
                <a
                  href={fact.evidenceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={() =>
                    safeTrack("assistant_evidence_click", {
                      route: fact.route,
                      kind: "external",
                    })
                  }
                >
                  Evidence<span aria-hidden="true"> ↗</span>
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : fact.visibility === "private" ? (
                <span>Private work</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceRefList({
  evidence,
  onNavigate,
}: {
  evidence: PublicEvidenceRef[];
  onNavigate: () => void;
}) {
  if (evidence.length === 0) return null;
  return (
    <div className="border-border mt-3 border-t pt-3">
      <p className="text-muted font-sans text-xs font-medium tracking-wide uppercase">
        Evidence
      </p>
      <ol className="mt-2 space-y-1.5 font-sans text-xs">
        {evidence.map((ref) => (
          <li key={ref.chunkId} className="ledger-line flex flex-wrap gap-x-2">
            <span className="figure text-muted">[{ref.index}]</span>
            <Link
              href={ref.route}
              onClick={() => {
                safeTrack("assistant_evidence_click", {
                  route: ref.route,
                  kind: "internal",
                });
                onNavigate();
              }}
              className="font-medium"
            >
              {ref.title} · {ref.section}
            </Link>
            {ref.externalUrl ? (
              <a
                href={ref.externalUrl}
                rel="noopener noreferrer"
                target="_blank"
                onClick={() =>
                  safeTrack("assistant_evidence_click", {
                    route: ref.route,
                    kind: "external",
                  })
                }
                className="text-muted"
              >
                Source<span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : ref.visibility === "private" ? (
              <span className="text-muted">Private work</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AssistantDrawer({
  open,
  onClose,
  initialMode,
  launcherRef,
  limitedUntil,
  onLimited,
}: {
  open: boolean;
  onClose: () => void;
  initialMode: AssistantOperationalMode;
  launcherRef: RefObject<HTMLButtonElement | null>;
  limitedUntil: number;
  onLimited: (untilMs: number) => void;
}) {
  const pathname = usePathname() || "/";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const prevPathRef = useRef(pathname);
  const pathnameRef = useRef(pathname);

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [activeEntitySlug, setActiveEntitySlug] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [modeNote, setModeNote] =
    useState<AssistantOperationalMode>(initialMode);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const starters = useMemo(() => startersForPath(pathname), [pathname]);
  const limited = limitedUntil > now;
  const limitMinutes = Math.max(1, Math.ceil((limitedUntil - now) / 60_000));

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      safeTrack("assistant_open", { route: pathnameRef.current });
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Close drawer when client navigation changes routes.
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (open) onClose();
    }
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!limited) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [limited]);

  useEffect(() => {
    return () => {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      abortRef.current?.abort("unmount");
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (sending) {
      container.scrollTop = container.scrollHeight;
      return;
    }
    if (messages.length > 0 && latestMessageRef.current) {
      container.scrollTop = Math.max(
        0,
        latestMessageRef.current.offsetTop - 16,
      );
    }
  }, [messages.length, sending]);

  function clearSpinner() {
    if (spinnerTimerRef.current) {
      clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = null;
    }
    setShowSpinner(false);
  }

  function handleDialogClose() {
    if (open) onClose();
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  function resetThread() {
    generationRef.current += 1;
    abortRef.current?.abort("reset");
    abortRef.current = null;
    clearSpinner();
    setSending(false);
    setMessages([]);
    setActiveEntitySlug(null);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function submitQuestion(rawQuestion: string) {
    const q = rawQuestion.trim();
    if (q.length < 2 || sending || limited) return;

    const myGen = ++generationRef.current;
    abortRef.current?.abort("superseded");
    const ac = new AbortController();
    abortRef.current = ac;
    const timeoutId = setTimeout(() => ac.abort("timeout"), REQUEST_TIMEOUT_MS);
    clearSpinner();
    spinnerTimerRef.current = setTimeout(() => {
      if (generationRef.current === myGen) setShowSpinner(true);
    }, 300);

    const history = messages
      .filter(
        (m): m is Extract<ThreadMessage, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant",
      )
      .slice(-4)
      .map((m) => ({
        role: m.role,
        content:
          m.role === "user"
            ? m.text.slice(0, 800)
            : (m.response.mode === "generated"
                ? m.response.blocks.map((b) => b.text).join(" ")
                : m.response.summary
              ).slice(0, 800),
      }));

    setMessages((prev) => [
      ...prev,
      { id: `u-${myGen}-${prev.length}`, role: "user", text: q },
    ]);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          question: q,
          pageContext: pathname.slice(0, 80),
          activeEntitySlug,
          history,
        }),
      });

      if (generationRef.current !== myGen) return;

      if (res.status === 429) {
        const errBody = (await res.json().catch(() => ({}))) as {
          retryAfterSeconds?: number;
        };
        const waitMs = (errBody.retryAfterSeconds ?? 60) * 1000;
        const ts = currentEpochMs();
        onLimited(ts + waitMs);
        setNow(ts);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${myGen}`,
            role: "error",
            text: `Rate limit reached. Try again in ${Math.max(1, Math.ceil(waitMs / 60_000))} min, or email Collins directly on Contact.`,
          },
        ]);
        return;
      }

      if (res.status === 503) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${myGen}`,
            role: "error",
            text: "The assistant is currently disabled. Browse Work or Contact directly.",
          },
        ]);
        return;
      }

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${myGen}`,
            role: "error",
            text:
              errBody.error === "validation"
                ? "Please ask a question between 2 and 500 characters."
                : "Could not reach the assistant right now. Try again or inspect the case studies directly.",
          },
        ]);
        return;
      }

      const data = (await res.json()) as AssistantResponse;
      if (generationRef.current !== myGen) return;
      setActiveEntitySlug(data.activeEntitySlug);
      if (data.mode === "retrieval_only") {
        setModeNote("retrieval_only");
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${myGen}`, role: "assistant", response: data },
      ]);
    } catch (err) {
      if (generationRef.current !== myGen) return;
      if (ac.signal.aborted && ac.signal.reason !== "timeout") return;
      void err;
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${myGen}`,
          role: "error",
          text: "Request timed out or lost connection. You can retry or browse Work directly.",
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      if (generationRef.current === myGen) {
        clearSpinner();
        setSending(false);
        abortRef.current = null;
      }
    }
  }

  function onTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submitQuestion(draft);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      data-assistant-ui
      aria-labelledby="assistant-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="assistant-dialog print:hidden"
    >
      <div className="bg-surface text-text border-border flex h-dvh w-full flex-col max-sm:mt-auto max-sm:h-[94dvh] max-sm:border-t sm:ml-auto sm:max-w-[27.5rem] sm:border-l sm:shadow-xl">
        <header className="border-border flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <AssistantIcon size={32} />
            <div className="min-w-0">
              <h2
                id="assistant-dialog-title"
                className="font-serif text-xl leading-tight font-medium"
              >
                Ask the portfolio
              </h2>
              <p className="text-muted mt-1 font-sans text-xs">
                Answers from Collins&apos;s published work, with linked
                evidence.
              </p>
              {modeNote === "retrieval_only" && (
                <p className="text-warning mt-1 font-mono text-[11px]">
                  Retrieval mode active (direct portfolio excerpts)
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={resetThread}
                className="assistant-btn-ghost min-h-11 cursor-pointer rounded-[6px] px-2.5"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close portfolio index"
              className="assistant-btn-close border-border hover:border-primary inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[6px] border"
            >
              ×
            </button>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        >
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-muted font-sans text-sm">
                Ask about architecture, held-out evaluations, stated limits,
                security checks, or remote availability.
              </p>
              <div>
                <p className="text-muted font-sans text-xs font-medium tracking-wide uppercase">
                  Suggested questions
                </p>
                <ul className="mt-2 space-y-2">
                  {starters.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        disabled={sending || limited}
                        onClick={() => void submitQuestion(q)}
                        className="assistant-btn-chip border-border bg-bg/60 hover:border-primary min-h-11 w-full cursor-pointer rounded-[6px] border px-3 py-2 text-left disabled:opacity-50"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                if (msg.role === "user") {
                  return (
                    <div
                      key={msg.id}
                      ref={isLast ? latestMessageRef : undefined}
                      className="border-primary scroll-mt-2 border-l-2 pl-3 font-sans text-sm font-medium"
                    >
                      {msg.text}
                    </div>
                  );
                }

                if (msg.role === "error") {
                  return (
                    <div
                      key={msg.id}
                      ref={isLast ? latestMessageRef : undefined}
                      role="status"
                      className="border-danger/40 bg-bg scroll-mt-2 rounded-sm border p-3 font-sans text-sm"
                    >
                      {msg.text}
                    </div>
                  );
                }

                const resp = msg.response;
                return (
                  <article
                    key={msg.id}
                    ref={isLast ? latestMessageRef : undefined}
                    className="scroll-mt-2 space-y-3"
                  >
                    {resp.mode === "generated" ? (
                      <>
                        <div className="space-y-2.5 text-base leading-relaxed">
                          {resp.blocks.map((block, idx) => (
                            <p key={idx}>
                              {block.text}{" "}
                              {block.evidenceIndices.map((evIdx) => {
                                const ref = resp.evidence.find(
                                  (e) => e.index === evIdx,
                                );
                                if (!ref) return null;
                                return (
                                  <Link
                                    key={evIdx}
                                    href={ref.route}
                                    onClick={onClose}
                                    aria-label={`Evidence ${evIdx}: ${ref.title}, ${ref.section}`}
                                    className="figure ml-1 text-xs no-underline hover:underline"
                                  >
                                    [{evIdx}]
                                  </Link>
                                );
                              })}
                            </p>
                          ))}
                        </div>
                        <FactCardList facts={resp.facts} onNavigate={onClose} />
                        <EvidenceRefList
                          evidence={resp.evidence}
                          onNavigate={onClose}
                        />
                        <p className="text-muted font-mono text-[11px]">
                          {resp.notice}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-base leading-relaxed">
                          {resp.summary}
                        </p>
                        {resp.excerpts.length > 0 && (
                          <ul className="space-y-2">
                            {resp.excerpts.map((ex, i) => (
                              <li
                                key={`${ex.route}-${i}`}
                                className="border-border bg-bg/60 rounded-sm border p-3 font-sans text-xs"
                              >
                                <Link
                                  href={ex.route}
                                  onClick={onClose}
                                  className="font-semibold"
                                >
                                  {ex.title} · {ex.section}
                                </Link>
                                <p className="text-muted mt-1 leading-relaxed">
                                  {ex.snippet}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                        <FactCardList facts={resp.facts} onNavigate={onClose} />
                        <EvidenceRefList
                          evidence={resp.evidence}
                          onNavigate={onClose}
                        />
                      </>
                    )}

                    {resp.followUps.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {resp.followUps.map((f) => (
                          <button
                            key={f}
                            type="button"
                            disabled={sending || limited}
                            onClick={() => void submitQuestion(f)}
                            className="assistant-btn-chip border-border hover:border-primary min-h-11 cursor-pointer rounded-[6px] border px-2.5 py-1.5 text-left disabled:opacity-50"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div role="status" aria-live="polite" className="mt-4">
            {showSpinner && (
              <div className="border-border bg-bg flex items-center justify-between gap-2 rounded-sm border px-3 py-2 font-sans text-xs">
                <span>Searching portfolio…</span>
                <button
                  type="button"
                  onClick={() => {
                    generationRef.current += 1;
                    abortRef.current?.abort("user_cancel");
                    clearSpinner();
                    setSending(false);
                  }}
                  className="assistant-btn-ghost min-h-11 cursor-pointer px-2"
                >
                  Cancel
                </button>
              </div>
            )}
            {limited && (
              <p className="text-warning font-sans text-xs">
                Limit reached. Try again in {limitMinutes} min.
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitQuestion(draft);
          }}
          className="border-border bg-surface border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
        >
          <label
            htmlFor="assistant-question-input"
            className="text-text block font-sans text-xs font-medium"
          >
            Ask a question about Collins&apos;s work
          </label>
          <div className="mt-1.5 flex items-end gap-2">
            <textarea
              ref={inputRef}
              id="assistant-question-input"
              name="question"
              rows={2}
              minLength={2}
              maxLength={500}
              value={draft}
              disabled={sending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              placeholder="Ask about a project, metric, or availability"
              className="assistant-textarea border-border bg-bg min-h-11 flex-1 resize-none rounded-sm border px-3 py-2"
            />
            <button
              type="submit"
              disabled={sending || limited || draft.trim().length < 2}
              className="assistant-btn-submit bg-primary hover:bg-primary-hover min-h-11 shrink-0 cursor-pointer rounded-[6px] border border-transparent px-4"
            >
              Ask
            </button>
          </div>
          <p className="text-muted mt-2 font-sans text-[11px] leading-snug">
            Questions are sent to OpenRouter (Google Gemini 2.5 Flash, data
            collection denied) to draft answers from public portfolio content.
            Do not enter personal or confidential data. Transcript stays in
            browser memory only.
          </p>
        </form>
      </div>
    </dialog>
  );
}
