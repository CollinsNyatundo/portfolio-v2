import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/this-page-does-not-exist"];
const widths = [320, 768, 1280];

test.describe("security headers", () => {
  test("home page sends the hardening headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    const csp = headers["content-security-policy"];
    expect(csp).toMatch(
      /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
    );
    expect(csp).not.toContain("'unsafe-inline' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("each response carries a fresh nonce", async ({ request }) => {
    const nonceOf = async () =>
      (await request.get("/"))
        .headers()
        ["content-security-policy"].match(/'nonce-([^']+)'/)?.[1];
    const [first, second] = [await nonceOf(), await nonceOf()];
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  test("the page runs without CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) {
        violations.push(message.text());
      }
    });
    await page.goto("/");
    await page.waitForLoadState("load");
    // Hydration proves the scripts loaded under the policy.
    await expect(
      page.getByRole("button", { name: "Dark reading mode" }).first(),
    ).toBeEnabled();
    expect(violations).toEqual([]);
  });

  test("source maps are not served", async ({ request, page }) => {
    await page.goto("/");
    const script = await page
      .locator('script[src*="/_next/static/"]')
      .first()
      .getAttribute("src");
    expect(script).toBeTruthy();
    const map = await request.get(`${script}.map`);
    expect(map.status()).toBe(404);
  });
});

test.describe("shell", () => {
  test("skip link is the first focus stop and targets main", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#main");
    await expect(page.locator("main#main")).toHaveCount(1);
  });

  test("home has exactly one h1 with the owner's name", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Collins Nyagaka");
  });

  test("unknown routes return 404 with recovery links", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: "title page" })).toBeVisible();
  });

  test("dark reading mode toggles and persists", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Dark reading mode" });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("dark reading mode is reachable from the mobile menu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByText("Menu", { exact: true }).click();
    const toggle = page.getByRole("button", { name: "Dark reading mode" });
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // The same control undoes a stored preference.
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

for (const route of routes) {
  for (const width of widths) {
    test(`axe: ${route} at ${width}px has no violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test(`no horizontal scroll: ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
}
