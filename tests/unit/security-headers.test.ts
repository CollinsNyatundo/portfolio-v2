import { describe, expect, it } from "vitest";
import {
  buildCsp,
  createNonce,
  staticSecurityHeaders,
} from "@/lib/security-headers";

function directive(csp: string, name: string): string[] {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.split(" ")[0] === name);
  return found ? found.split(" ").slice(1) : [];
}

describe("Content-Security-Policy", () => {
  const nonce = "dGVzdC1ub25jZQ==";
  const prod = buildCsp({ nonce, dev: false });

  it("allows scripts only by nonce in production, never inline or eval", () => {
    expect(directive(prod, "script-src")).toEqual([
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
    ]);
  });

  it("allows style elements only by nonce in production", () => {
    expect(directive(prod, "style-src-elem")).toEqual([
      "'self'",
      `'nonce-${nonce}'`,
    ]);
    expect(directive(prod, "style-src-attr")).toEqual(["'unsafe-inline'"]);
  });

  it("blocks framing, plugins and foreign forms", () => {
    expect(directive(prod, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(prod, "object-src")).toEqual(["'none'"]);
    expect(directive(prod, "form-action")).toEqual(["'self'"]);
    expect(directive(prod, "base-uri")).toEqual(["'self'"]);
  });

  it("upgrades insecure requests only in production", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(buildCsp({ nonce, dev: true })).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("allows eval only in development", () => {
    expect(directive(prod, "script-src")).not.toContain("'unsafe-eval'");
    expect(directive(buildCsp({ nonce, dev: true }), "script-src")).toContain(
      "'unsafe-eval'",
    );
  });
});

describe("createNonce", () => {
  it("returns a fresh base64 value each call", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("static security headers", () => {
  const headers = Object.fromEntries(
    staticSecurityHeaders.map((h) => [h.key, h.value]),
  );

  it("sets HSTS for two years with preload", () => {
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("sets the remaining hardening headers", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });

  it("leaves the CSP to the per-request proxy", () => {
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });
});
