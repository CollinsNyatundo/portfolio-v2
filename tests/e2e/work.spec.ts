import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("work index", () => {
  test("lists every case study and project, linking to the studies", async ({
    page,
  }) => {
    const response = await page.goto("/work");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("Work");
    const studies = page.locator("#case-studies ~ ol > li");
    await expect(studies).toHaveCount(5);
    await expect(
      page.getByRole("link", { name: /LegalAI Kenya/ }).first(),
    ).toHaveAttribute("href", "/work/legalai-kenya");
    expect(await page.locator("#projects ~ ul > li").count()).toBeGreaterThan(
      3,
    );
  });

  test("marks Work as the current section in the folio", async ({ page }) => {
    await page.goto("/work");
    await expect(
      page.locator('nav[aria-label="Site"] a[aria-current="page"]').first(),
    ).toHaveText("Work");
  });

  test("a chip filters in place, updates the URL, and back restores", async ({
    page,
  }) => {
    await page.goto("/work");
    const all = await page.locator("main li h3").count();
    const filters = page.getByRole("navigation", { name: "Filter by tag" });
    await filters.getByRole("link", { name: "Legaltech" }).click();
    await expect(page).toHaveURL(/\/work\?tag=legaltech$/);
    await expect(
      filters.getByRole("link", { name: "Legaltech" }),
    ).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#case-studies ~ ol > li")).toHaveCount(1);
    await expect(page.locator("#projects")).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.locator("main li h3")).toHaveCount(all);
  });

  test("a shared filtered URL renders filtered", async ({ page }) => {
    await page.goto("/work?tag=fintech");
    for (const tags of await page.locator("main li ul").allInnerTexts())
      expect(tags).toContain("Fintech");
  });

  test("an unknown tag shows everything without an error", async ({ page }) => {
    const response = await page.goto("/work?tag=crypto");
    expect(response?.status()).toBe(200);
    await expect(
      page
        .getByRole("navigation", { name: "Filter by tag" })
        .getByRole("link", { name: "All" }),
    ).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#case-studies ~ ol > li")).toHaveCount(5);
  });

  test("private case studies carry the label and no repository link", async ({
    page,
  }) => {
    await page.goto("/work?tag=legaltech");
    const row = page.locator("#case-studies ~ ol > li").first();
    await expect(row).toContainText("Private work");
    await expect(row.locator('a[href*="github.com"]')).toHaveCount(0);
  });

  test("every headline figure shows its evidence or a Private work label", async ({
    page,
  }) => {
    await page.goto("/work");
    const rows = page.locator("#case-studies ~ ol > li");
    for (const row of await rows.all()) {
      const source = row.locator("[data-headline-source]");
      if ((await row.innerText()).startsWith("Private work"))
        await expect(source).toHaveText("Evidence: Private work");
      else
        await expect(source.locator("a")).toHaveAttribute(
          "href",
          /^https:\/\/github\.com\/CollinsNyatundo\//,
        );
    }
  });

  test("no visible em dashes and no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto("/work");
    await page.waitForLoadState("load");
    expect(await page.locator("main").innerText()).not.toContain("—");
    expect(violations).toEqual([]);
  });

  for (const width of [320, 768, 1280]) {
    test(`axe and no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/work");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
    });
  }
});
