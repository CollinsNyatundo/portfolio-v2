import { expect, test } from "@playwright/test";

/**
 * Live-site checks from the security checklist (docs/07 §3, task 5.1).
 * Item numbers refer to that table.
 */
test.describe("security on the deployed site", () => {
  test("31 CORS: a foreign origin gets no allow header", async ({
    request,
  }) => {
    for (const path of [
      "/",
      "/api/demos/fraud/samples",
      "/api/demos/mlsys/search?q=drift",
    ]) {
      const res = await request.get(path, {
        headers: { Origin: "https://evil.test" },
      });
      expect(
        res.headers()["access-control-allow-origin"],
        path,
      ).toBeUndefined();
    }
  });

  test("33, 53 headers: framing denied, HSTS, nosniff, referrer, permissions", async ({
    request,
  }) => {
    const h = (await request.get("/")).headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"]).toContain("max-age=63072000");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("30 cookies: pages and functions set none", async ({ request }) => {
    for (const path of ["/", "/demos/fraud", "/api/demos/fraud/samples"]) {
      const res = await request.get(path);
      expect(res.headers()["set-cookie"], path).toBeUndefined();
    }
  });

  test("06, 65 shipped JavaScript holds no secrets", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const js = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map(
      (m) => m[1],
    );
    for (const src of js) {
      const body = await (await request.get(src)).text();
      expect(body, src).not.toMatch(
        /(sk_live_|re_[A-Za-z0-9]{20,}|TURNSTILE_SECRET|UPSTASH_REDIS_REST_TOKEN|-----BEGIN [A-Z ]*PRIVATE KEY)/,
      );
    }
  });

  test("41, 48, 51 functions reject unknown fields and hide internals", async ({
    request,
  }) => {
    const res = await request.post("/api/demos/fraud/score", {
      data: { sampleId: "s01", features: {}, admin: true },
    });
    expect(res.status()).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/Traceback|\/var\/task|\.py"|File "/);
    expect(JSON.parse(text).fields.admin).toBe("is not allowed");
  });

  test("42, 46 search limits are enforced, long queries refused", async ({
    request,
  }) => {
    expect(
      (
        await request.get("/api/demos/mlsys/search?q=drift&limit=10000")
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.get(`/api/demos/mlsys/search?q=${"a".repeat(500)}`)
      ).status(),
    ).toBe(400);
  });

  // Probe-like requests (/.env, script payloads, unknown routes) can make
  // Vercel's bot protection challenge this IP, so they run last, and this
  // file runs by hand (npm run smoke:security), not on a schedule.
  test("63, 64 no source maps, env files or git metadata are served", async ({
    request,
  }) => {
    for (const path of [
      "/.env",
      "/.env.local",
      "/.git/config",
      "/private",
      "/api/_data/fraud/prep.json",
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
    }
    const html = await (await request.get("/")).text();
    const js = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map(
      (m) => m[1],
    );
    expect(js.length).toBeGreaterThan(0);
    // Not served: 404, or 403 when the platform declines the request.
    const map = await request.get(`${js[0]}.map`);
    expect([403, 404]).toContain(map.status());
  });

  test("13 reflected XSS: query input never reaches the page as markup", async ({
    page,
  }) => {
    const payload = "<script>window.__pwned=1</script>";
    for (const path of [
      `/work?tag=${encodeURIComponent(payload)}`,
      `/contact?topic=${encodeURIComponent(payload)}`,
      `/demos/fraud?sample=${encodeURIComponent(payload)}`,
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => (window as { __pwned?: number }).__pwned),
        path,
      ).toBeUndefined();
      expect(await page.content(), path).not.toContain(payload);
    }
  });

  test("34 no open redirect through query parameters", async ({ request }) => {
    for (const q of [
      "?next=https://evil.test",
      "?redirect=https://evil.test",
      "?url=https://evil.test",
    ]) {
      const res = await request.get(`/${q}`, { maxRedirects: 0 });
      expect(res.headers()["location"] ?? "", q).not.toContain("evil.test");
    }
  });

  test("02, 03 only the known API routes answer", async ({ request }) => {
    for (const path of [
      "/api/admin",
      "/api/demos/fraud/train",
      "/api/debug",
      "/api/demos/../_lib/http.py",
    ]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([404, 405], path).toContain(res.status());
    }
  });

  test("52 no debug or framework banners in production", async ({
    request,
  }) => {
    const res = await request.get("/does-not-exist");
    expect(res.status()).toBe(404);
    const text = await res.text();
    expect(text).not.toMatch(
      /stack|webpack-internal|next-dev|__nextjs_original-stack-frame/i,
    );
  });
});
