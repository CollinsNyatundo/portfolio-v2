import { describe, expect, it } from "vitest";
import { upstashConfigured } from "@/lib/assistant/config";
import { upstashCredentials } from "@/lib/upstash-env";

// The Vercel Marketplace Upstash integration provisions KV_REST_API_URL and
// KV_REST_API_TOKEN, not UPSTASH_REDIS_REST_*. Both naming schemes must work.

describe("upstashCredentials", () => {
  it("reads the UPSTASH_REDIS_REST_* names", () => {
    expect(
      upstashCredentials({
        UPSTASH_REDIS_REST_URL: "https://a.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "tok-a",
      }),
    ).toEqual({ url: "https://a.upstash.io", token: "tok-a" });
  });

  it("falls back to the Marketplace KV_REST_API_* names", () => {
    expect(
      upstashCredentials({
        KV_REST_API_URL: " https://b.upstash.io ",
        KV_REST_API_TOKEN: "tok-b",
      }),
    ).toEqual({ url: "https://b.upstash.io", token: "tok-b" });
  });

  it("prefers the explicit UPSTASH names as a pair", () => {
    expect(
      upstashCredentials({
        UPSTASH_REDIS_REST_URL: "https://a.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "tok-a",
        KV_REST_API_URL: "https://b.upstash.io",
        KV_REST_API_TOKEN: "tok-b",
      }),
    ).toEqual({ url: "https://a.upstash.io", token: "tok-a" });
  });

  it("never mixes schemes and never uses the read-only token", () => {
    expect(
      upstashCredentials({
        UPSTASH_REDIS_REST_URL: "https://a.upstash.io",
        KV_REST_API_TOKEN: "tok-b",
      }),
    ).toBeNull();
    expect(
      upstashCredentials({
        KV_REST_API_URL: "https://b.upstash.io",
        KV_REST_API_READ_ONLY_TOKEN: "ro",
      }),
    ).toBeNull();
    expect(upstashCredentials({})).toBeNull();
  });

  it("makes the assistant see Redis under either scheme", () => {
    expect(
      upstashConfigured({
        KV_REST_API_URL: "https://b.upstash.io",
        KV_REST_API_TOKEN: "tok-b",
      }),
    ).toBe(true);
  });
});
