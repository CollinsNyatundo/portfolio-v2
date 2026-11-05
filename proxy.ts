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
