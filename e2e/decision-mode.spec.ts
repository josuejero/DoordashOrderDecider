import { expect, test } from "@playwright/test";
test.describe("Decision Mode E2E", () => {
  test("should switch decision mode and see badge update", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByRole("button", { name: "Profile" }).click();
    const decisionModeSelect = page.getByLabel("Decision mode");
    await expect(decisionModeSelect).toHaveValue("heuristic");
    await decisionModeSelect.selectOption("hybrid_ml");
    await page.getByRole("button", { name: "Decider" }).click();
    await expect(page.getByText("Hybrid ML")).toBeVisible();
    await page.getByLabel("Offer payout ($)").fill("25");
    await page.getByLabel("Projected finish").fill("19:00");
    await expect(page.getByText(/ACCEPT|REJECT/)).toBeVisible();
    await page.getByRole("button", { name: "Profile" }).click();
    await expect(decisionModeSelect).toHaveValue("hybrid_ml");
  });
  test("should show correct mode badge after page reload", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByRole("button", { name: "Profile" }).click();
    await page.getByLabel("Decision mode").selectOption("hybrid_ml");
    await page.reload();
    await page.getByRole("button", { name: "Decider" }).click();
    await expect(page.getByText("Hybrid ML")).toBeVisible();
  });
  test("should work offline with heuristic mode", async ({ page, context }) => {
    await page.goto("http://localhost:5173");
    await context.setOffline(true);
    await page.getByLabel("Offer payout ($)").fill("20");
    await page.getByLabel("Projected finish").fill("18:30");
    await expect(page.getByText(/ACCEPT|REJECT/)).toBeVisible();
    await page.getByRole("button", { name: "Profile" }).click();
    await page.getByLabel("Decision mode").selectOption("hybrid_ml");
    await page.getByRole("button", { name: "Decider" }).click();
    await expect(page.getByText("Hybrid ML")).toBeVisible();
    await context.setOffline(false);
  });
});
