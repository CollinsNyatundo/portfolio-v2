"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "failed";

/**
 * "Copy email" for visitors with no mail client (docs/03 §5). The address is
 * always visible as text, so a blocked clipboard still leaves a way to copy it.
 */
export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 4000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="border-border hover:border-text inline-flex min-h-11 items-center rounded-full border px-4 font-sans text-sm"
      >
        Copy email
      </button>
      <span role="status" className="text-muted ml-3 font-sans text-sm">
        {state === "copied" && "Email copied"}
        {state === "failed" && `Couldn't copy. The address is ${email}`}
      </span>
    </>
  );
}
