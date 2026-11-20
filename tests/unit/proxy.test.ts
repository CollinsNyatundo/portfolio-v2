import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isMalformedPath, isNoindexHost, proxy } from "../../proxy";

describe("noindex hosts", () => {
  it.each([
    "bench.collinsnyagaka.com",
    "BENCH.collinsnyagaka.com:443",
    "portfolio-v2-9kvjjxdnq-collins-nyagakas-projects.vercel.app",
  ])("marks %s noindex", (host) => {
    expect(isNoindexHost(host)).toBe(true);
  });

  it.each([
    "collinsnyagaka.com",
    "www.collinsnyagaka.com",
    "localhost:3000",
    "bench.collinsnyagaka.com.evil.example",
    null,
  ])("leaves %s indexable", (host) => {
    expect(isNoindexHost(host)).toBe(false);
  });

  const send = (url: string) =>
    proxy(new NextRequest(url, { headers: { host: new URL(url).host } }));

  it("sends X-Robots-Tag on the bench host", () => {
    const res = send("https://bench.collinsnyagaka.com/work");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("never sends X-Robots-Tag on production hosts", () => {
    for (const url of [
      "https://collinsnyagaka.com/",
      "https://www.collinsnyagaka.com/work",
    ]) {
      expect(send(url).headers.get("x-robots-tag")).toBeNull();
    }
  });
});

describe("malformed paths", () => {
  it.each(["/work%5C", "/about%5c", "/%5C", "/work%2F", "/work\\"])(
    "flags %s",
    (path) => {
      expect(isMalformedPath(path)).toBe(true);
    },
  );

  it.each([
    "/",
    "/work",
    "/work/complianceguard",
    "/cv/Collins_Nyagaka_CV.pdf",
  ])("lets %s through", (path) => {
    expect(isMalformedPath(path)).toBe(false);
  });

  it("rewrites a malformed path to a route that does not exist, with a CSP", () => {
    const res = proxy(new NextRequest("https://collinsnyagaka.com/work%5C"));
    expect(res.headers.get("x-middleware-rewrite")).toContain(
      "/not-found-malformed-path",
    );
    expect(res.headers.get("content-security-policy")).toContain("nonce-");
  });

  it("does not rewrite a normal path", () => {
    const res = proxy(new NextRequest("https://collinsnyagaka.com/work"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
