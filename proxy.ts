import { NextResponse, type NextRequest } from "next/server";
import { contactFormEnabled } from "./lib/contact-form";
import { buildCsp, createNonce } from "./lib/security-headers";

/**
 * Sets a fresh nonce-based Content-Security-Policy on every page request.
 * Next.js reads the nonce from the request's CSP header and applies it to its
 * own scripts and styles during rendering.
 */
/**
 * Encoded backslashes and encoded slashes never appear in this site's URLs.
 * On Vercel they reach the page renderer for the parent route and end in a 500
 * (MODULE_NOT_FOUND); answer them as a plain 404 instead.
 */
export function isMalformedPath(pathname: string): boolean {
  return pathname.includes("\\") || /%(5c|2f)/i.test(pathname);
}

/**
 * Review and preview hosts that search engines must skip. An explicit list, so
 * an unknown host stays indexable and production can never be hidden by a
 * mistake here. `noindex` goes in a header, not robots.txt: a crawler blocked
 * by robots.txt never reads the header and may still list the bare URL.
 */
export function isNoindexHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.toLowerCase().split(":")[0];
  return (
    hostname === "bench.collinsnyagaka.com" || hostname.endsWith(".vercel.app")
  );
}

export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV === "development",
    turnstile: contactFormEnabled(),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = isMalformedPath(request.nextUrl.pathname)
    ? NextResponse.rewrite(new URL("/not-found-malformed-path", request.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (isNoindexHost(request.headers.get("host"))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    {
      // Skip static assets and link prefetches, which carry no HTML.
      source: "/((?!api|_next/static|_next/image|vendor/|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
