/**
 * HTTP security headers (docs/07-SECURITY.md §4, decision D-28).
 *
 * The CSP is nonce-based and set per request in `proxy.ts`, because Next.js
 * emits inline bootstrap scripts that a strict policy would otherwise block.
 * That requires dynamic rendering (see app/layout.tsx). The remaining headers
 * are static and set in next.config.ts.
 */

export type HeaderEntry = { key: string; value: string };

type CspOptions = {
  /** Per-request nonce, base64. */
  nonce: string;
  /** `next dev` needs eval and unhashed styles, and serves over plain http. */
  dev: boolean;
  /**
   * Cloudflare Turnstile for the contact form (07 §4, M4.8). Added only when
   * the form is configured, so the host isn't trusted before it's needed.
   */
  turnstile?: boolean;
};

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCsp({
  nonce,
  dev,
  turnstile = false,
}: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets nonce-trusted scripts load their own chunks.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
      ...(turnstile ? [TURNSTILE_ORIGIN] : []),
    ],
    "style-src-elem": ["'self'", dev ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    // style="" attributes: allowed. React and the scroll engine set inline
    // custom properties; attributes can't load resources or run script.
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "media-src": ["'self'"],
    "frame-src": turnstile ? [TURNSTILE_ORIGIN] : ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([name, sources]) => `${name} ${sources.join(" ")}`,
  );
  // Upgrading on localhost would break `next dev` over http.
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Static headers for every route; the CSP comes from proxy.ts. */
export const staticSecurityHeaders: HeaderEntry[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];
