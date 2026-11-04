import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("CV page", () => {
  test("has every section and no phone number", async ({ page }) => {
    const response = await page.goto("/cv");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("Collins Nyatundo Nyagaka");
    await expect(page.locator("main h2")).toHaveText([
      "Profile",
      "Technical skills",
      "Experience",
      "Selected work",
      "Education and certifications",
    ]);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\+254|\b07\d{8}\b/);
    expect(text).not.toContain("—");
  });

  test("lists all roles and links the case studies", async ({ page }) => {
    await page.goto("/cv");
    await expect(page.locator("#experience ~ ol > li")).toHaveCount(7);
    await expect(
      page.getByRole("link", {
        name: "LegalAI Kenya, legal research for advocates",
      }),
    ).toHaveAttribute("href", "/work/legalai-kenya");
  });

  test("prints on two A4 pages without the folio", async ({ page }) => {
    await page.goto("/cv");
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator('nav[aria-label="Site"]')).toBeHidden();
    const pdf = await page.pdf({ format: "A4", printBackground: false });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [])
      .length;
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(2);
  });

  for (const width of [320, 1280]) {
    test(`axe and no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/cv");
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
