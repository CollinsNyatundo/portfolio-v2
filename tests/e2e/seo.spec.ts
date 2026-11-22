import { expect, test } from "@playwright/test";

test.describe("search and sharing", () => {
  test("home has a ProfilePage graph, canonical and social tags", async ({
    page,
  }) => {
    await page.goto("/");
    const ld = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) ?? "{}",
    );
    const graph: { "@type": string; sameAs?: string[] }[] = ld["@graph"];
    expect(graph.map((n) => n["@type"])).toEqual([
      "ProfilePage",
      "Person",
      "WebSite",
    ]);
    const person = graph.find((n) => n["@type"] === "Person");
    expect(person?.sameAs).toContain("https://github.com/CollinsNyatundo");
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

test.describe("second audit: head tags", () => {
  test("a 404 has its own title, noindex and no canonical", async ({
    page,
  }) => {
    const res = await page.goto("/no-such-page-here");
    expect(res?.status()).toBe(404);
    await expect(page).toHaveTitle(/^Page not found/);
    // Next.js may add its own noindex too; at least one must be present.
    expect(
      await page.locator('meta[name="robots"][content*="noindex"]').count(),
    ).toBeGreaterThan(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test("the new diagrams render on their case studies", async ({ page }) => {
    for (const [slug, title] of [
      ["geo-ai-cropland-mapping", "How a labelled point becomes a prediction"],
      ["production-ai-template", "How one query is answered"],
    ]) {
      const res = await page.goto(`/work/${slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("img", { name: title })).toBeVisible();
    }
  });

  test("a case study carries Article and breadcrumb data", async ({ page }) => {
    await page.goto("/work/creditcard-fraud");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const types = blocks.map((b) => JSON.parse(b)["@type"]);
    expect(types).toEqual(
      expect.arrayContaining(["Article", "BreadcrumbList"]),
    );
  });

  test("sitemap entries all have lastmod", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const urls = xml.match(/<url>/g)?.length ?? 0;
    const mods = xml.match(/<lastmod>/g)?.length ?? 0;
    expect(urls).toBeGreaterThan(0);
    expect(mods).toBe(urls);
  });
});

test.describe("third audit: links", () => {
  test("every colophon links to the /cv page as well as the PDF", async ({
    page,
  }) => {
    expect((await page.goto("/notes"))?.status()).toBe(200);
    const footer = page.locator("footer");
    await expect(
      footer.getByRole("link", { name: "CV", exact: true }),
    ).toHaveAttribute("href", "/cv");
    await expect(
      footer.getByRole("link", { name: "PDF of the CV" }),
    ).toHaveAttribute("download", "");
    expect((await page.goto("/cv"))?.status()).toBe(200);
  });

  test("links inside paragraphs are underlined, not colour alone", async ({
    page,
  }) => {
    for (const path of [
      "/",
      "/contact",
      "/notes/oversampling-before-the-split",
    ]) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      const plain = await page.$$eval("main p a, footer p a", (links) =>
        links
          .filter((a) => !a.className.includes("no-underline"))
          .filter((a) => getComputedStyle(a).textDecorationLine !== "underline")
          .map((a) => a.outerHTML.slice(0, 80)),
      );
      expect(plain, path).toEqual([]);
    }
  });
});
