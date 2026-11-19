import { expect, test } from "@playwright/test";

test.describe("recruiter journey", () => {
  test("the folio links About and Contact", async ({ page }) => {
    await page.goto("/work");
    const nav = page.locator('nav[aria-label="Site"]');
    await expect(
      nav.getByRole("link", { name: "About" }).first(),
    ).toHaveAttribute("href", "/about");
    await expect(
      nav.getByRole("link", { name: "Contact" }).first(),
    ).toHaveAttribute("href", "/contact");
  });

  test("the home hero shows availability and the next steps on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hero = page.locator("#title").locator("xpath=ancestor::section[1]");
    await expect(hero).toContainText("Open to remote");
    const start = hero.getByRole("list", { name: "Start here" });
    await expect(
      start.getByRole("link", { name: "See the work" }),
    ).toBeVisible();
    await expect(
      start.getByRole("link", { name: "Score a transaction" }),
    ).toHaveAttribute("href", "/demos/fraud");
    await expect(start.getByRole("link", { name: "Contact" })).toBeVisible();
  });
});

test.describe("evidence strip on a phone", () => {
  test("is a real, keyboard-operable disclosure", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.locator("[data-ledger-id]").first().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    const strip = page.getByRole("region", { name: "Evidence read so far" });
    const button = strip.getByRole("button", { name: /Evidence/ });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(strip.locator(".ledger-line").first()).toBeVisible();
  });
});

test.describe("fraud demo", () => {
  test("Time is read-only when editing values", async ({ page }) => {
    await page.goto("/demos/fraud");
    await page.getByLabel("Edit values").check();
    const time = page.getByLabel("Time", { exact: true });
    await expect(time).toHaveAttribute("readonly", "");
  });
});

test.describe("second audit (2026-11-19)", () => {
  test("home Work shows only featured case studies", async ({ page }) => {
    await page.goto("/");
    const work = page.locator("#work").locator("xpath=ancestor::section[1]");
    await expect(work.getByRole("heading", { level: 3 })).toContainText([
      "LegalAI Kenya",
    ]);
    await expect(work).not.toContainText("GEO-AI cropland mapping");
    await expect(page.locator("table")).not.toContainText("0.745");
  });

  test("the home demo has a working link before its code loads", async ({
    page,
  }) => {
    await page.goto("/");
    // The server HTML, before any lazy loading.
    const html = await (await page.request.get("/")).text();
    expect(html).toContain("open the fraud-score explorer");
  });

  test("printing the home page shows every chapter at rest", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("sc-ready"),
    );
    await page.emulateMedia({ media: "print" });
    const hidden = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            "[data-sc-in], [data-sc-stagger] > *, [data-sc-reveal]",
          ),
        ].filter((el) => {
          const s = getComputedStyle(el);
          return s.opacity !== "1" || s.clipPath !== "none";
        }).length,
    );
    expect(hidden).toBe(0);
  });

  test("the fraud model card shows its figures with their caveats", async ({
    page,
  }) => {
    await page.goto("/demos/fraud");
    const card = page.locator("#card").locator("xpath=ancestor::section[1]");
    await expect(card).toContainText("F1 0.80");
    await expect(card).toContainText("The 0.85 recall gate failed");
  });
});
