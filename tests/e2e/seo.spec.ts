import { expect, test } from "@playwright/test";

test.describe("search and sharing", () => {
  test("home has Person JSON-LD, canonical and social tags", async ({
    page,
  }) => {
    await page.goto("/");
    const ld = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) ?? "{}",
    );
    expect(ld["@type"]).toBe("Person");
    expect(ld.sameAs).toContain("https://github.com/CollinsNyatundo");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://collinsnyagaka.com",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("filtered work views share one canonical URL", async ({ page }) => {
    await page.goto("/work?tag=fintech");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://collinsnyagaka.com/work",
    );
  });

  test("case studies are articles with their own preview image", async ({
    page,
    request,
  }) => {
    await page.goto("/work/creditcard-fraud");
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const path = new URL(image ?? "").pathname;
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("sitemap and robots are served", async ({ request }) => {
    const map = await request.get("/sitemap.xml");
    expect(map.status()).toBe(200);
    expect(await map.text()).toContain(
      "https://collinsnyagaka.com/work/legalai-kenya",
    );
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain(
      "Sitemap: https://collinsnyagaka.com/sitemap.xml",
    );
  });

  test("CV links download the PDF", async ({ page }) => {
    await page.goto("/about");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("main").getByRole("link", { name: "CV (PDF)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("Collins_Nyagaka_CV.pdf");
  });

  test("home JSON-LD causes no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto("/");
    await page.waitForLoadState("load");
    expect(violations).toEqual([]);
  });
});
