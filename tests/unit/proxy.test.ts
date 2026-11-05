import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isMalformedPath, proxy } from "../../proxy";

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
