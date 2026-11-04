import { expect, test } from "@playwright/test";

test.describe("home page chapters", () => {
  test("has the chapters in BRIEF order", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main h2.chapter__title")).toHaveText([
      "Problem",
      "Method",
      "Work",
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

  test("shows the demo intertitle only once the demo is live", async ({
    page,
  }) => {
    await page.goto("/");
    // The fraud demo ships in M4; until then there is no empty stage.
    await expect(page.getByText("Now try one.")).toHaveCount(0);
  });
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
