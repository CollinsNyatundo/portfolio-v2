import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Scroll the home page so on-entry reveals finish before measuring contrast. */
async function revealAll(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

test.describe("portfolio assistant (enabled with local stub)", () => {
  test("does not render inert launcher when JavaScript is disabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("[data-assistant-ui]")).toHaveCount(0);
    await context.close();
  });

  test("lazy-loads drawer on click with 0 CSP violations, renders Fact Cards and navigates cleanly", async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/Content Security Policy|Refused to/i.test(msg.text())) {
        violations.push(msg.text());
      }
    });

    const jsUrlsBeforeClick: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/_next/static/chunks/")) {
        jsUrlsBeforeClick.push(req.url());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const launcher = page.getByRole("button", {
      name: "Ask about Collins's portfolio",
    });
    await expect(launcher).toBeVisible();
    const initialChunksCount = jsUrlsBeforeClick.length;

    // Open drawer: loads lazy drawer chunk and focuses input.
    await launcher.click();
    const dialog = page.getByRole("dialog", { name: "Ask the portfolio" });
    await expect(dialog).toBeVisible();
    expect(jsUrlsBeforeClick.length).toBeGreaterThan(initialChunksCount);

    // Submit a question via input & Ask button.
    await dialog
      .getByLabel("Ask a question about Collins's work")
      .fill("What F1 did the fraud model get on the holdout?");
    await dialog.getByRole("button", { name: "Ask", exact: true }).click();

    await expect(dialog).toContainText("0.80 F1 and 0.75 recall");
    await expect(dialog).toContainText("Recorded figures and limits");
    await expect(dialog).toContainText("Caveat:");
    await expect(dialog).toContainText("Evidence");

    await revealAll(page);
    const answeredAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(answeredAxe.violations).toEqual([]);

    // Clicking an internal Evidence link closes the dialog and navigates.
    await dialog
      .getByRole("link", { name: /Real-time credit-card fraud detection/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/work\/creditcard-fraud/);
    await expect(dialog).toBeHidden();
    expect(violations).toEqual([]);
  });

  test("a LegalAI refusal answer cites the off-topic refusal figure", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Ask about Collins's portfolio" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Ask the portfolio" });
    await dialog
      .getByLabel("Ask a question about Collins's work")
      .fill("How does LegalAI Kenya refuse off-topic questions?");
    await dialog.getByRole("button", { name: "Ask", exact: true }).click();
    // The answer and its fact card both carry the refusal result, not a
    // retrieval score.
    await expect(dialog).toContainText("refusing 9 of 10 off-topic queries");
    await expect(dialog).toContainText("Off-topic queries refused");
  });

  test("handles out-of-scope refusal, malformed fallback, Reset, internal Close and Esc focus restore", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const launcher = page.getByRole("button", {
      name: "Ask about Collins's portfolio",
    });
    await launcher.click();
    const dialog = page.getByRole("dialog", { name: "Ask the portfolio" });
    const input = dialog.getByLabel("Ask a question about Collins's work");

    // Out-of-scope deterministic refusal
    await input.fill("What is the weather in Nairobi?");
    await dialog.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(dialog).toContainText("Collins Nyagaka's public portfolio");

    // Malformed / XSS provider response degrades cleanly to retrieval_only
    await input.fill("MALFORMED_TEST fraud model");
    await dialog.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(dialog).toContainText("did not pass grounding checks");
    expect(await dialog.innerHTML()).not.toContain("<script>");

    // Reset clears messages
    await dialog.getByRole("button", { name: "Reset" }).click();
    await expect(dialog).toContainText("Suggested questions");

    // Internal Close button closes and restores focus to launcher
    await dialog.getByRole("button", { name: "Close portfolio index" }).click();
    await expect(dialog).toBeHidden();
    await expect(launcher).toBeFocused();

    // Esc key closes and restores focus to launcher
    await launcher.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(launcher).toBeFocused();
  });

  test("never collides with the Evidence Ledger on desktop 1440px or mobile 320px/375px", async ({
    page,
  }) => {
    // Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("[data-ledger-id]").first().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(
      page.locator("aside.ledger-aside .ledger-line").first(),
    ).toBeVisible();

    const asideBox = await page.locator("aside.ledger-aside").boundingBox();
    const desktopLauncherBox = await page
      .getByRole("button", { name: "Ask about Collins's portfolio" })
      .boundingBox();
    expect(asideBox).toBeTruthy();
    expect(desktopLauncherBox).toBeTruthy();
    expect(asideBox!.y + asideBox!.height).toBeLessThanOrEqual(
      desktopLauncherBox!.y,
    );

    // Mobile 320x568 with Evidence strip collapsed & expanded
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    await page.locator("[data-ledger-id]").first().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    const strip = page.getByRole("region", { name: "Evidence read so far" });
    await expect(strip).toBeVisible();

    await expect(async () => {
      const stripCollapsed = await strip.boundingBox();
      const launcherMobileCollapsed = await page
        .getByRole("button", { name: "Ask about Collins's portfolio" })
        .boundingBox();
      expect(stripCollapsed).toBeTruthy();
      expect(launcherMobileCollapsed).toBeTruthy();
      expect(
        launcherMobileCollapsed!.y + launcherMobileCollapsed!.height,
      ).toBeLessThanOrEqual(stripCollapsed!.y);
    }).toPass({ timeout: 2000 });

    await strip.getByRole("button", { name: /Evidence/ }).click();
    await expect(strip.locator(".ledger-line").first()).toBeVisible();
    await expect(async () => {
      const stripExpanded = await strip.boundingBox();
      const launcherMobileExpanded = await page
        .getByRole("button", { name: "Ask about Collins's portfolio" })
        .boundingBox();
      expect(stripExpanded).toBeTruthy();
      expect(launcherMobileExpanded).toBeTruthy();
      expect(
        launcherMobileExpanded!.y + launcherMobileExpanded!.height,
      ).toBeLessThanOrEqual(stripExpanded!.y);
    }).toPass({ timeout: 2000 });
  });

  test("hides assistant chrome in print on /cv while keeping 2-page PDF budget", async ({
    page,
  }) => {
    await page.goto("/cv");
    const launcher = page.getByRole("button", {
      name: "Ask about Collins's portfolio",
    });
    await launcher.click();
    await page.getByRole("button", { name: "Close portfolio index" }).click();

    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    await expect(launcher).toBeHidden();
    const pdf = await page.pdf({ format: "A4", printBackground: false });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [])
      .length;
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(2);
  });

  for (const width of [320, 768, 1280]) {
    test(`axe-core 0 violations & no horizontal scroll at ${width}px (closed + open, light + dark)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await revealAll(page);
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);

      const closedLight = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(closedLight.violations).toEqual([]);

      await page
        .getByRole("button", { name: "Ask about Collins's portfolio" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Ask the portfolio" });
      await expect(dialog).toBeVisible();

      const openLight = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(openLight.violations).toEqual([]);

      // Switch to dark reading mode and re-check axe inside the open drawer.
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
      });
      const openDark = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(openDark.violations).toEqual([]);
    });
  }
});
