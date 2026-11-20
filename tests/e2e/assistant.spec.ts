import { expect, test } from "@playwright/test";

test.describe("portfolio assistant (disabled default build)", () => {
  test("renders zero launcher UI when ASSISTANT_MODE is disabled", async ({
    page,
  }) => {
    for (const path of ["/", "/work", "/about", "/contact"]) {
      await page.goto(path);
      await expect(page.locator("[data-assistant-ui]")).toHaveCount(0);
    }
  });

  test("POST /api/assistant fails closed with 503 when disabled", async ({
    request,
  }) => {
    const res = await request.post("/api/assistant", {
      data: { question: "What is LegalAI Kenya?" },
    });
    expect(res.status()).toBe(503);
    expect(await res.json()).toEqual({ error: "disabled" });
  });
});
