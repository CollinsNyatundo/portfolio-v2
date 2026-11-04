import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PATH = "/demos/fraud";
const SCORE = "**/api/demos/fraud/score";

const result = {
  probability: 0.997,
  calibratedProbability: 0.7085,
  threshold: 0.03,
  decision: "flag",
  topContributions: [
    { feature: "V14", logOdds: 2.41, direction: "fraud" },
    { feature: "V4", logOdds: 1.2, direction: "fraud" },
    { feature: "V10", logOdds: 0.9, direction: "fraud" },
    { feature: "V17", logOdds: -0.5, direction: "legit" },
    { feature: "V12", logOdds: 0.3, direction: "fraud" },
  ],
  modelVersion: "lgbm-optimized-d501607",
  latencyMs: { model: 0.12, total: 1.98 },
};

async function mockScore(
  page: Page,
  status: number,
  body: unknown,
  onBody?: (b: Record<string, unknown>) => void,
) {
  await page.route(SCORE, (route) => {
    onBody?.(route.request().postDataJSON());
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test.describe("fraud demo", () => {
  test("samples load from the static endpoint, 20 with history", async ({
    request,
  }) => {
    const res = await request.get("/api/demos/fraud/samples");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.samples).toHaveLength(20);
    expect(body.samples[0].window).toHaveLength(10);
    expect(body.attribution.licence).toContain("CC BY-NC-SA 4.0");
  });

  test("scores the chosen sample and shows decision, reasons and latency", async ({
    page,
  }) => {
    let sent: Record<string, unknown> = {};
    await mockScore(page, 200, result, (b) => (sent = b));
    await page.goto(PATH);
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.locator("main")).toContainText("70.9%");
    await expect(page.locator("main")).toContainText("Flag");
    await expect(page.locator("main")).toContainText(
      "Model 0.12 ms (in-process inference)",
    );
    await expect(page.locator("main ol > li")).toHaveCount(5);
    // Only the target transaction is sent; the window stays on the server.
    expect(Object.keys(sent).sort()).toEqual(["features", "sampleId"]);
    expect(Object.keys(sent.features as object)).toHaveLength(30);
  });

  test("sample choice lives in the URL; back restores it", async ({ page }) => {
    await page.goto(PATH);
    const select = page.getByRole("combobox", { name: "Transaction" });
    await expect(select).toBeVisible();
    await select.selectOption({ index: 3 });
    await expect(page).toHaveURL(/\?sample=s04$/);
    await select.selectOption({ index: 5 });
    await expect(page).toHaveURL(/\?sample=s06$/);
    await page.goBack();
    await expect(page).toHaveURL(/\?sample=s04$/);
    await expect(select).toHaveValue("s04");
  });

  test("out-of-range edits are caught before sending", async ({ page }) => {
    let calls = 0;
    await mockScore(page, 200, result, () => calls++);
    await page.goto(PATH);
    await page.getByLabel("Edit values").check();
    await page.getByLabel("Amount", { exact: true }).fill("50000");
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.locator("main")).toContainText("Amount must be ≤ 30000");
    expect(calls).toBe(0);
  });

  test("server field errors show inline", async ({ page }) => {
    await mockScore(page, 400, {
      error: "validation",
      fields: { "features.V3": "must be ≤ 100" },
    });
    await page.goto(PATH);
    await page.getByLabel("Edit values").check();
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.locator("main")).toContainText("V3 must be ≤ 100");
  });

  test("reset restores the sample and clears the result", async ({ page }) => {
    await mockScore(page, 200, result);
    await page.goto(PATH);
    await page.getByLabel("Edit values").check();
    const amount = page.getByLabel("Amount", { exact: true });
    const original = await amount.inputValue();
    await amount.fill("12");
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.locator("main")).toContainText("70.9%");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(amount).toHaveValue(original);
    await expect(page.locator("main")).not.toContainText("70.9%");
  });

  test("rate limited: says how long and disables Score", async ({ page }) => {
    await mockScore(page, 429, {
      error: "rate_limited",
      retryAfterSeconds: 120,
    });
    await page.goto(PATH);
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.getByRole("status")).toContainText("try again in 2 min");
    await expect(page.getByRole("button", { name: "Score" })).toBeDisabled();
  });

  test("unavailable function falls back to the recorded example", async ({
    page,
  }) => {
    await mockScore(page, 503, { error: "internal" });
    await page.goto(PATH);
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Demo is waking up or unavailable",
    );
    await expect(page.locator("main ol > li")).toHaveCount(5);
  });

  test("editing a value clears the old result", async ({ page }) => {
    await mockScore(page, 200, result);
    await page.goto(PATH);
    await page.getByLabel("Edit values").check();
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.locator("main")).toContainText("70.9%");
    await page.getByLabel("Amount", { exact: true }).fill("55");
    await expect(page.locator("main")).not.toContainText("70.9%");
  });

  test("Reset keeps the rate-limit cooldown", async ({ page }) => {
    await mockScore(page, 429, {
      error: "rate_limited",
      retryAfterSeconds: 120,
    });
    await page.goto(PATH);
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.getByRole("status")).toContainText("try again in 2 min");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByRole("button", { name: "Score" })).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("try again in 2 min");
  });

  test("credits the dataset and its licence", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator("main")).toContainText("CC BY-NC-SA 4.0");
    await expect(page.locator("main")).toContainText(
      "Université Libre de Bruxelles",
    );
  });

  test("keyboard only: choose, score, read the result", async ({ page }) => {
    await mockScore(page, 200, result);
    await page.goto(PATH);
    await page.getByRole("combobox", { name: "Transaction" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(/\?sample=s02$/);
    await page.getByRole("button", { name: "Score" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toContainText("70.9%");
  });

  test("no visible em dashes and no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto(PATH);
    await page.waitForLoadState("load");
    expect(await page.locator("main").innerText()).not.toContain("—");
    expect(violations).toEqual([]);
  });

  for (const width of [320, 1280]) {
    test(`axe with a result and no horizontal scroll at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockScore(page, 200, result);
      await page.goto(PATH);
      await page.getByLabel("Edit values").check();
      await page.getByRole("button", { name: "Score" }).click();
      await expect(page.locator("main")).toContainText("70.9%");
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
