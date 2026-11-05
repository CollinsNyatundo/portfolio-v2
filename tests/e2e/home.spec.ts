import { expect, test } from "@playwright/test";

test.describe("home page chapters", () => {
  test("has the chapters in BRIEF order", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main h2.chapter__title")).toHaveText([
      "Problem",
      "Method",
      "Work",
      "Score a transaction",
      "Colophon",
    ]);
  });

  test("mounts the scroll engine without CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/sc-ready/);
    expect(violations).toEqual([]);
  });

  test("the colophon lists every ledger figure with a source", async ({
    page,
  }) => {
    await page.goto("/");
    const rows = page.locator('[aria-label="Evidence table"] tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) {
      await expect(row.locator("td").first()).not.toBeEmpty();
      // Figure, measured on, caveat: every number keeps its context (D-05).
      await expect(row.locator("td").nth(1)).not.toBeEmpty();
      await expect(row.locator("td").nth(2)).not.toBeEmpty();
      await expect(row.locator("td").last()).toContainText(
        /Repository file|Private work/,
      );
    }
  });

  test("the margin ledger adds a line when a figure is read", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const ledger = page.locator("aside .ledger-line");
    await expect(ledger).toHaveCount(0);
    const firstFigure = page.locator("[data-ledger-id]").first();
    await firstFigure.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(ledger.first()).toBeVisible();
    // Only figures from the evidence data can appear.
    const ids = await page
      .locator("[data-ledger-id]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-ledger-id")));
    expect(ids.every((id) => id && id.includes(":"))).toBe(true);
  });

  test("the photo has meaningful alt text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("img", { name: /Collins Nyagaka, smiling/ }),
    ).toBeVisible();
  });

  test("the live demo gets its intertitle and Act IV", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Now try one.")).toHaveCount(1);
    await expect(
      page.getByRole("combobox", { name: "Transaction" }),
    ).toBeVisible();
  });

  test("a home-page run writes the visitor's line into the ledger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/demos/fraud/score", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          probability: 0.99,
          calibratedProbability: 0.7085,
          threshold: 0.03,
          decision: "flag",
          topContributions: [
            { feature: "V14", logOdds: 0.9, direction: "fraud" },
            { feature: "V4", logOdds: 0.4, direction: "fraud" },
            { feature: "V10", logOdds: 0.39, direction: "fraud" },
            { feature: "V17", logOdds: 0.37, direction: "fraud" },
            { feature: "V12", logOdds: 0.31, direction: "fraud" },
          ],
          modelVersion: "x",
          latencyMs: { model: 0.4, total: 150 },
        }),
      }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.locator("[data-visitor]").first()).toContainText(
      "you, just now",
    );
  });
});

test("the ledger records figures on a wide, short screen", async ({ page }) => {
  // Percentage margins would resolve against this width and leave no
  // reading area at all.
  await page.setViewportSize({ width: 2560, height: 900 });
  await page.goto("/");
  await page.locator("[data-ledger-id]").first().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(page.locator("aside .ledger-line").first()).toBeVisible();
});

test.describe("home page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every chapter's content is visible", async ({ page }) => {
    await page.goto("/");
    for (const text of [
      "Evaluate on data the model hasn't seen",
      "Read the case study",
      "Every figure on this page",
    ]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });
});
