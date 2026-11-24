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

  test("the live demo gets its intertitle and Act IV", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Now try one.")).toHaveCount(1);
    // The demo's code loads as Act IV comes near.
    await page.locator("#demo").scrollIntoViewIfNeeded();
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
    await page.locator("#demo").scrollIntoViewIfNeeded();
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

test.describe("home: projects and recognition", () => {
  test("more projects lists the reference template, not the company site", async ({
    page,
  }) => {
    await page.goto("/");
    const more = page
      .locator("section[aria-labelledby='work'] div")
      .filter({ has: page.getByRole("heading", { name: "More projects" }) })
      .getByRole("list");
    await expect(more.getByRole("listitem")).toHaveCount(4);
    await expect(
      more.getByRole("link", { name: "Production AI Reference Template" }),
    ).toHaveAttribute("href", "/work/production-ai-template");
    await expect(more).not.toContainText("TundoTech Systems Website");
  });

  test("the fraud study shows its XERJ selection", async ({ page }) => {
    await page.goto("/");
    const fraud = page.locator("article").filter({
      has: page.locator('h3 a[href="/work/creditcard-fraud"]'),
    });
    await expect(
      fraud.getByRole("link", { name: /Selected for the XERJ Corpus Hub/ }),
    ).toHaveAttribute(
      "href",
      "https://hub.xerj.org/contributors/CollinsNyatundo",
    );
    await expect(
      page.getByRole("link", { name: /Selected for the XERJ Corpus Hub/ }),
    ).toHaveCount(1);
  });
});

test.describe("home: the demo opens on a real score", () => {
  test("the server HTML already carries the recorded score, no JS needed", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain("Recorded result for sample 1");
    expect(html).toContain("70.9%");
    expect(html).not.toContain("Loading the demo");
  });

  test("the loaded demo keeps the recorded score until a live run replaces it", async ({
    page,
  }) => {
    await page.goto("/");
    const demo = page.locator("section[aria-labelledby='demo']");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo.getByRole("button", { name: "Score" })).toBeVisible();
    await expect(demo).toContainText("Recorded result for sample 1");
    await expect(demo).toContainText("70.9%");
  });

  test("a live score replaces the recorded one", async ({ page }) => {
    // A result that can't be confused with the recorded 70.9%.
    await page.route("**/api/demos/fraud/score", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          probability: 0.2,
          calibratedProbability: 0.123,
          threshold: 0.03,
          decision: "flag",
          topContributions: [
            { feature: "V14", logOdds: 0.5, direction: "fraud" },
          ],
          modelVersion: "x",
          latencyMs: { model: 0.4, total: 150 },
        }),
      }),
    );
    await page.goto("/");
    const demo = page.locator("section[aria-labelledby='demo']");
    await demo.scrollIntoViewIfNeeded();
    await demo.getByRole("button", { name: "Score" }).click();
    await expect(demo).toContainText("12.3%");
    await expect(demo).not.toContainText("Recorded result for sample 1");
    await expect(demo).not.toContainText("70.9%");
  });

  test("the recorded result shows no timing from the local run", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toContain("0.12 ms");
  });
});
