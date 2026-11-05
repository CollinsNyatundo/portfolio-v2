import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/work",
  "/work/creditcard-fraud",
  "/work/legalai-kenya",
  "/about",
  "/contact",
  "/cv",
  "/demos",
  "/demos/fraud",
  "/demos/ml-systems-search",
  "/notes",
];

test.describe("production smoke", () => {
  for (const path of PAGES) {
    test(`${path} serves with a strict CSP and no console errors`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      const csp = res?.headers()["content-security-policy"] ?? "";
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(res?.headers()["strict-transport-security"]).toContain("max-age");
      await page.waitForLoadState("load");
      expect(errors).toEqual([]);
    });
  }

  test("the CV PDF downloads", async ({ request }) => {
    const res = await request.get("/cv/Collins_Nyagaka_CV.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
  });

  test("www redirects to the apex domain", async ({ request }) => {
    test.skip(!!process.env.SMOKE_URL, "domain check only");
    const res = await request.get("https://www.collinsnyagaka.com/", {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(308);
    expect(res.headers()["location"]).toMatch(
      /^https:\/\/collinsnyagaka\.com\/?$/,
    );
  });

  test("the fraud function scores a served sample", async ({ request }) => {
    const samples = await (
      await request.get("/api/demos/fraud/samples")
    ).json();
    const s = samples.samples[0];
    const t0 = Date.now();
    const res = await request.post("/api/demos/fraud/score", {
      data: { sampleId: s.id, features: s.target },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(["flag", "allow"]).toContain(body.decision);
    expect(body.topContributions).toHaveLength(5);
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  test("the fraud function rejects bad input with field errors", async ({
    request,
  }) => {
    const res = await request.post("/api/demos/fraud/score", {
      data: { sampleId: "s01", features: { Amount: -1 } },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("validation");
  });

  test("the search function answers with attribution", async ({ request }) => {
    const res = await request.get(
      "/api/demos/mlsys/search?q=data%20drift&limit=3",
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.attribution.licence).toBe("CC BY-NC-SA 4.0");
  });

  test("the contact API stays off until configured", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: {},
      headers: { origin: "https://collinsnyagaka.com" },
    });
    expect([503, 403]).toContain(res.status());
  });
});
