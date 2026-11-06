import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/guides", "/guides/typhoon", "/login", "/signup", "/forgot-password", "/offline", "/services", "/about/privacy", "/setup"];

test.describe("public pages", () => {
  test("landing explains scope and never shows fabricated alerts", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Ready at all times/ })).toBeVisible();
    await expect(page.getByText(/not an emergency alert or dispatch service/i)).toBeVisible();
    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toMatch(/signal no\. \d+ (is )?(now )?raised|alert level \d+ declared|evacuate now/i);
  });

  test("guides: search, filter and read a guide with sources", async ({ page }) => {
    await page.goto("/guides");
    await page.getByLabel("Search guides").fill("storm surge");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("link", { name: /Typhoons/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Earthquakes/ })).toHaveCount(0);
    await page.getByRole("link", { name: /Typhoons/ }).click();
    await expect(page.getByRole("heading", { name: "Typhoons", level: 1 })).toBeVisible();
    await expect(page.getByText(/Educational guidance — not an alert/)).toBeVisible();
    await expect(page.getByRole("link", { name: "PAGASA (DOST)" })).toHaveAttribute("href", "https://www.pagasa.dost.gov.ph");
    await expect(page.getByRole("heading", { name: "Before" })).toBeVisible();
  });

  test("protected areas redirect when the backend is not configured", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByText(/no Supabase project connected/)).toBeVisible();
  });

  test("services directory shows the 911 hotline and the not-dispatch disclaimer", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("link", { name: /911/ }).first()).toHaveAttribute("href", "tel:911");
    await expect(page.getByText(/not a dispatch service/)).toBeVisible();
  });

  test("signup form validates required consent client-side", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Juan Dela Cruz");
    await page.getByLabel("Email").fill("juan@example.ph");
    await page.getByLabel("Password").fill("prepared2026");
    await page.getByRole("button", { name: "Create account" }).click();
    expect(await page.locator("input[name=consent]").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });

  for (const path of PAGES) {
    test(`a11y: ${path} has no serious axe violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).disableRules(["region"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
    });
  }

  test("responsive: no horizontal overflow on key pages", async ({ page }) => {
    for (const path of ["/", "/guides/earthquake", "/offline", "/services"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("offline", () => {
  test("installable manifest and service worker caching of guides with offline fallback", async ({ page, context }) => {
    await page.goto("/");
    const manifest = await (await page.request.get("/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.goto("/guides/flood");
    await page.waitForFunction(async () => (await caches.keys()).some((k) => k.startsWith("vanguard-")));
    await page.waitForTimeout(500);
    await context.setOffline(true);
    await page.goto("/guides/earthquake");
    await expect(page.getByRole("heading", { name: "Earthquakes", level: 1 })).toBeVisible();
    await page.goto("/plans/some-private-page");
    await expect(page.getByRole("heading", { name: "Offline access" })).toBeVisible();
    await expect(page.getByText(/Available offline/)).toBeVisible();
    await context.setOffline(false);
  });
});
