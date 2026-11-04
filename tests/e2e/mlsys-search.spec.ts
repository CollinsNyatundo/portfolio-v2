import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL_PATH = "/demos/ml-systems-search";
const API = "**/api/demos/mlsys/search**";

const results = [
  {
    chapter: "Chapter 14: ML Operations",
    section: "Quantifying Drift",
    snippet:
      "track statistical divergence between production \u0002data\u0003 and baseline",
    url: "https://github.com/CollinsNyatundo/machine-learning-systems-plugin/blob/abc/ch14.md",
    score: 5,
  },
];

async function mockApi(
  page: Page,
  status: number,
  body: unknown,
  onQuery?: (q: string) => void,
) {
  await page.route(API, (route) => {
    onQuery?.(new URL(route.request().url()).searchParams.get("q") ?? "");
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test.describe("ML Systems search demo", () => {
  test("typing searches after a pause and shows highlighted results", async ({
    page,
  }) => {
    const queries: string[] = [];
    await mockApi(page, 200, { results, attribution: {} }, (q) =>
      queries.push(q),
    );
    await page.goto(URL_PATH);
    await page
      .getByLabel("Search the book")
      .pressSequentially("data drift", { delay: 20 });
    const item = page.locator("main ol > li").first();
    await expect(item).toContainText("Quantifying Drift");
    await expect(item.locator("mark")).toHaveText("data");
    // Debounced: one request for the whole phrase, not one per key.
    expect(queries).toEqual(["data drift"]);
  });

  test("fewer than 3 characters sends nothing", async ({ page }) => {
    let calls = 0;
    await mockApi(page, 200, { results }, () => calls++);
    await page.goto(URL_PATH);
    await page.getByLabel("Search the book").fill("ab");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForTimeout(500);
    expect(calls).toBe(0);
  });

  test("no matches suggests other searches", async ({ page }) => {
    await mockApi(page, 200, { results: [] });
    await page.goto(URL_PATH);
    await page.getByLabel("Search the book").fill("zzqx");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("No matches. Try:");
  });

  test("rate limited: says how long, disables search", async ({ page }) => {
    await mockApi(page, 429, { error: "rate_limited", retryAfterSeconds: 300 });
    await page.goto(URL_PATH);
    await page.getByLabel("Search the book").fill("drift");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      "Demo limit reached, try again in 5 min",
    );
    await expect(page.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  test("server error falls back to the recorded example", async ({ page }) => {
    await mockApi(page, 500, { error: "internal" });
    await page.goto(URL_PATH);
    await page.getByLabel("Search the book").fill("drift");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      "Demo is waking up or unavailable",
    );
    await expect(page.locator("main ol > li").first()).toBeVisible();
  });

  test("credits the book and its licence", async ({ page }) => {
    await page.goto(URL_PATH);
    await expect(
      page.getByRole("link", { name: /CC BY-NC-SA 4\.0/ }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    );
    await expect(page.locator("main")).toContainText("Vijay Janapa Reddi");
  });

  test("demos index links the search demo", async ({ page }) => {
    await page.goto("/demos");
    await page
      .getByRole("link", { name: "ML Systems reference search" })
      .click();
    await expect(page).toHaveURL(/\/demos\/ml-systems-search$/);
  });

  test("keyboard only: tab to the field, search, reach a result", async ({
    page,
  }) => {
    await mockApi(page, 200, { results });
    await page.goto(URL_PATH);
    await page.getByLabel("Search the book").focus();
    await page.keyboard.type("drift");
    await page.keyboard.press("Enter");
    await expect(page.locator("main ol > li a").first()).toBeVisible();
  });

  test("no visible em dashes and no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto(URL_PATH);
    await page.waitForLoadState("load");
    expect(await page.locator("main").innerText()).not.toContain("—");
    expect(violations).toEqual([]);
  });

  for (const width of [320, 1280]) {
    test(`axe with results and no horizontal scroll at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page, 200, { results });
      await page.goto(URL_PATH);
      await page.getByLabel("Search the book").fill("drift");
      await page.keyboard.press("Enter");
      await expect(page.locator("main ol > li").first()).toBeVisible();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
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
