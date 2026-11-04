"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
// Bundled with the home route only; the file itself is never edited.
import "../../public/vendor/scrollcraft/scrollcraft.css";

type Instance = { destroy: () => void };
type Engine = { mount: (root?: Element | Document) => Instance };

declare global {
  interface Window {
    ScrollCraft?: Engine;
  }
}

/**
 * Mounts the vendored scroll-craft engine (unmodified, AGENTS.md rule 12) on
 * the home page only. The script is injected by Next.js's nonce-trusted
 * runtime, so 'strict-dynamic' admits it without a new CSP host.
 */
export function ScrollEngine() {
  const instance = useRef<Instance | null>(null);

  const mount = () => {
    if (!instance.current && window.ScrollCraft) {
      instance.current = window.ScrollCraft.mount(document);
    }
  };

  // Client navigation back to the page: the script is cached, mount again.
  useEffect(() => {
    mount();
    return () => {
      instance.current?.destroy();
      instance.current = null;
    };
  }, []);

  return (
    <>
      <Script
        src="/vendor/scrollcraft/scrollcraft.js"
        strategy="afterInteractive"
        onReady={mount}
      />
    </>
  );
}
