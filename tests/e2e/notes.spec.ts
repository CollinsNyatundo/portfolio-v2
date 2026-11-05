import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const NOTES = [
  "/notes/scoring-lightgbm-without-lightgbm",
  "/notes/oversampling-before-the-split",
];

test.describe("notes", () => {
  test("the folio shows Notes once two notes exist", async ({ page }) => {
    await page.goto("/");
    await expect(
      page
        .locator('nav[aria-label="Site"]')
        .getByRole("link", { name: "Notes" })
        .first(),
    ).toHaveAttribute("href", "/notes");
  });

  test("the index lists both notes, newest first, linking each", async ({
    page,
  }) => {
    const response = await page.goto("/notes");
    expect(response?.status()).toBe(200);
    const links = page.locator("main ol h2 a");
    await expect(links).toHaveCount(2);
    for (const href of await links.evaluateAll((as) =>
      as.map((a) => a.getAttribute("href")),
    ))
      expect(NOTES).toContain(href);
  });

  for (const path of NOTES) {
    test(`${path} renders with evidence and its case study`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).not.toBeEmpty();
      await expect(page.locator("article h2#evidence")).toBeVisible();
      await expect(page.getByText("Related case study:")).toBeVisible();
      expect(await page.locator("main").innerText()).not.toContain("—");
    });
  }

  test("unknown notes return 404", async ({ page }) => {
    const response = await page.goto("/notes/not-a-note");
    expect(response?.status()).toBe(404);
  });

  test("notes are in the sitemap", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/notes", ...NOTES])
      expect(body).toContain(`https://collinsnyagaka.com${path}`);
  });

  for (const width of [320, 1280]) {
    test(`axe and no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/notes", ...NOTES]) {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations, path).toEqual([]);
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          ),
          path,
        ).toBe(false);
      }
    });
  }
});
