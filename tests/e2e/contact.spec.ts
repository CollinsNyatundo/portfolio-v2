import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("contact page", () => {
  test("shows email, time zone, availability and links", async ({ page }) => {
    const response = await page.goto("/contact");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("Contact");
    const email = page.locator("main").getByRole("link", {
      name: "Email Collins",
    });
    await expect(email).toHaveAttribute(
      "href",
      /^mailto:cnyagakan@gmail\.com\?subject=/,
    );
    await expect(page.locator("main")).toContainText("UTC+3");
    await expect(page.locator("main")).toContainText(
      "Open to remote AI and ML engineering roles",
    );
    await expect(
      page.locator("main").getByRole("link", { name: /LinkedIn/ }),
    ).toHaveAttribute("href", /linkedin\.com\/in\/collinsnyagaka001/);
  });

  test("copy email puts the address on the clipboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/contact");
    await page.getByRole("button", { name: "Copy email" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Email copied" }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "cnyagakan@gmail.com",
    );
  });

  test("a blocked clipboard still shows the address", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("blocked")) },
      });
    });
    await page.goto("/contact");
    await page.getByRole("button", { name: "Copy email" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Couldn't copy" }),
    ).toContainText("cnyagakan@gmail.com");
  });

  test("freelance link goes to TundoTech in a new tab", async ({ page }) => {
    await page.goto("/contact");
    const link = page.getByRole("link", { name: /TundoTech Systems/ });
    await expect(link).toHaveAttribute("href", "https://tundotechsystems.com");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("a known topic asks for a walkthrough; an unknown one is general", async ({
    page,
  }) => {
    await page.goto("/contact?topic=legalai-kenya");
    await expect(page.locator("main")).toContainText(
      "walkthrough of LegalAI Kenya",
    );
    await expect(
      page.locator("main").getByRole("link", { name: "Email Collins" }),
    ).toHaveAttribute("href", /Walkthrough%20request/);

    await page.goto("/contact?topic=%3Cscript%3E");
    await expect(page.locator("main")).not.toContainText("walkthrough");
  });

  test("private case studies link to a walkthrough request", async ({
    page,
  }) => {
    await page.goto("/work/complianceguard");
    await page.getByRole("link", { name: "Request a walkthrough" }).click();
    await expect(page).toHaveURL(/\/contact\?topic=complianceguard$/);
  });

  test("the 404 page links to work and contact", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(
      page.getByRole("link", { name: "get in touch" }),
    ).toHaveAttribute("href", "/contact");
  });

  test("no visible em dashes and no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()))
        violations.push(m.text());
    });
    await page.goto("/contact");
    await page.waitForLoadState("load");
    expect(await page.locator("main").innerText()).not.toContain("—");
    expect(violations).toEqual([]);
  });

  for (const width of [320, 768, 1280]) {
    test(`axe and no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contact");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
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
