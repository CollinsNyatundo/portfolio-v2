import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("about page", () => {
  test("has the narrative, focus, method, experience and education", async ({
    page,
  }) => {
    const response = await page.goto("/about");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("About");
    await expect(page.locator("main h2")).toHaveText([
      "Focus areas",
      "How I work",
      "Experience",
      "Education and certifications",
    ]);
    await expect(page.locator("[data-narrative]")).toContainText("Nairobi");
    await expect(
      page.getByRole("img", { name: /Collins Nyagaka/ }),
    ).toBeVisible();
  });

  test("shows only focus areas with published work, each linked", async ({
    page,
  }) => {
    await page.goto("/about");
    const areas = page.locator("#focus ~ ul > li");
    await expect(areas.locator("h3")).toHaveText([
      "Fintech",
      "Legaltech",
      "Agritech",
    ]);
    await expect(
      page.getByRole("link", { name: "See the fintech work" }),
    ).toHaveAttribute("href", "/work?tag=fintech");
  });

  test("lists every role with its dates", async ({ page }) => {
    await page.goto("/about");
    const roles = page.locator("#experience ~ ol > li");
    await expect(roles).toHaveCount(7);
    await expect(roles.first()).toContainText("FlyRank AI");
    await expect(roles.first()).toContainText("to present");
  });

  test("is linked from every page's colophon", async ({ page }) => {
    await page.goto("/work");
    await page.locator("footer").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("no visible em dashes and no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto("/about");
    await page.waitForLoadState("load");
    expect(await page.locator("main").innerText()).not.toContain("—");
    expect(violations).toEqual([]);
  });

  for (const width of [320, 768, 1280]) {
    test(`axe and no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/about");
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
