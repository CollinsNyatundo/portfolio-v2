import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const path = "/work/creditcard-fraud";
const sections = [
  "Problem",
  "Constraints",
  "Approach",
  "Evaluation",
  "Results",
  "Security",
  "Limits",
  "What I'd do next",
  "Evidence",
];

test.describe("case study page", () => {
  test("renders the study with every section, in order", async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(
      "Real-time credit-card fraud detection",
    );
    await expect(page.locator("article h2")).toHaveText(
      sections.map((s) => new RegExp(`^${s}`)),
    );
  });

  test("every metric shows its dataset and caveat", async ({ page }) => {
    await page.goto(path);
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(6);
    for (const row of await rows.all()) {
      const cells = row.locator("td");
      await expect(cells.nth(1)).not.toBeEmpty();
      await expect(cells.nth(2)).not.toBeEmpty();
    }
  });

  test("evidence links are pinned to a commit in the public repo", async ({
    page,
  }) => {
    await page.goto(path);
    const links = page.locator("#evidence ~ ul a");
    expect(await links.count()).toBeGreaterThanOrEqual(2);
    for (const href of await links.evaluateAll((as) =>
      as.map((a) => a.getAttribute("href")),
    )) {
      expect(href).toMatch(
        /^https:\/\/github\.com\/CollinsNyatundo\/creditcard-fraud\/blob\/[0-9a-f]{40}\//,
      );
    }
  });

  test("sections can be deep-linked", async ({ page }) => {
    await page.goto(`${path}#evaluation`);
    await expect(page.locator("h2#evaluation")).toBeInViewport();
  });

  test("the diagram has a text alternative", async ({ page }) => {
    await page.goto(path);
    const svg = page.getByRole("img", {
      name: "How one transaction is scored",
    });
    await expect(svg).toBeVisible();
    await expect(svg.locator("desc")).toContainText(
      "previous ten transactions",
    );
  });

  test("no visible em dashes in the copy (docs/04 §1)", async ({ page }) => {
    await page.goto(path);
    expect(await page.locator("main").innerText()).not.toContain("—");
  });

  test("runs without CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto(path);
    await page.waitForLoadState("load");
    expect(violations).toEqual([]);
  });

  test("unknown case studies return 404", async ({ page }) => {
    const response = await page.goto("/work/not-a-study");
    expect(response?.status()).toBe(404);
  });

  for (const width of [320, 768, 1280]) {
    test(`axe and no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
});
