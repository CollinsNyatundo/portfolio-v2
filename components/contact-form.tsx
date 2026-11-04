"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT_TOPICS } from "@/lib/contact-form";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "response-field": boolean;
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * The optional contact form (docs/03 §5). Email stays the primary route;
 * this is for visitors without a mail client. Rendered only when the server
 * has every key it needs.
 */
export function ContactForm({
  siteKey,
  email,
  defaultTopic = "general",
}: {
  siteKey: string;
  email: string;
  defaultTopic?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Loaded by this nonce-trusted bundle, so 'strict-dynamic' allows it.
    const render = () => {
      if (widget.current && window.turnstile && !widgetId.current)
        widgetId.current = window.turnstile.render(widget.current, {
          sitekey: siteKey,
          callback: setToken,
          "expired-callback": () => setToken(""),
          // We send the token ourselves; no hidden cf-turnstile-response input.
          "response-field": false,
        });
    };
    if (window.turnstile) return render();
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [siteKey]);

  async function submit(form: HTMLFormElement) {
    if (status.kind === "sending") return; // no double submit (07 item 44)
    setStatus({ kind: "sending" });
    setFields({});
    // Only the fields the API accepts; anything a widget injects is dropped.
    const fd = new FormData(form);
    const data = Object.fromEntries(
      ["name", "email", "topic", "message", "website"].map((k) => [
        k,
        String(fd.get(k) ?? ""),
      ]),
    );
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken: token }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        form.reset();
        setStatus({ kind: "sent" });
      } else if (res.status === 400) {
        setFields(body.fields ?? {});
        setStatus({
          kind: "error",
          message: "Please check the fields marked below.",
        });
      } else if (res.status === 429) {
        setStatus({
          kind: "error",
          message: "Too many messages. Please try again later.",
        });
      } else {
        setStatus({
          kind: "error",
          message: `Couldn't send. Email me directly at ${email}.`,
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: `Couldn't send. Email me directly at ${email}.`,
      });
    } finally {
      window.turnstile?.reset(widgetId.current);
      setToken("");
    }
  }

  const sending = status.kind === "sending";
  const input =
    "border-border bg-surface text-text mt-2 min-h-11 w-full rounded-sm border px-3 text-base";
  const err = (name: string) =>
    fields[name] ? (
      <span
        id={`${name}-error`}
        className="text-text mt-1 block font-sans text-sm font-semibold"
      >
        {fields[name][0].toUpperCase() + fields[name].slice(1)}.
      </span>
    ) : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="max-w-[40rem] space-y-5 font-sans text-sm"
    >
      <label className="block">
        Name
        <input
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          disabled={sending}
          aria-invalid={Boolean(fields.name)}
          aria-describedby={fields.name ? "name-error" : undefined}
          className={input}
        />
        {err("name")}
      </label>
      <label className="block">
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          disabled={sending}
          aria-invalid={Boolean(fields.email)}
          aria-describedby={fields.email ? "email-error" : undefined}
          className={input}
        />
        {err("email")}
      </label>
      <label className="block">
        Topic
        <select
          name="topic"
          defaultValue={defaultTopic}
          disabled={sending}
          className={input}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {err("topic")}
      </label>
      <label className="block">
        Message
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={2000}
          rows={6}
          disabled={sending}
          aria-invalid={Boolean(fields.message)}
          aria-describedby={fields.message ? "message-error" : undefined}
          className={`${input} py-2`}
        />
        {err("message")}
      </label>
      {/* Honeypot: off-screen and out of the tab order for people. */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div ref={widget} />
      {err("turnstileToken")}
      <button
        type="submit"
        disabled={sending || !token}
        className="border-text min-h-11 rounded-full border px-5 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send message"}
      </button>
      <p role="status" aria-live="polite" className="text-base">
        {status.kind === "sent" &&
          "Thanks. I reply within 2 working days (EAT)."}
        {status.kind === "error" && status.message}
      </p>
    </form>
  );
}
