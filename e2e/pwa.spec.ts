import { expect, test } from "@playwright/test";

test("manifest is valid for installation", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/", scope: "/", short_name: "PI-CORE" });
  const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get("/icons/apple-touch-icon.png")).ok()).toBe(true);
});

test("iOS meta tags and viewport-fit are present", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png/);
  await expect(page.locator('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]').first()).toHaveAttribute("content", "yes");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
});

test("Chrome reports the app as installable and the service worker serves the offline page", async ({ page, context }) => {
  await page.goto("/login");
  const ready = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.scriptURL ?? null;
  });
  expect(ready).toContain("/sw.js");

  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);

  // Let the service worker take control, then go offline.
  await page.reload();
  await context.setOffline(true);
  await page.goto("/members").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await context.setOffline(false);
});

test("the service worker never caches pages or data", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const req of await cache.keys()) urls.push(new URL(req.url).pathname);
    }
    return urls;
  });
  // Only the offline page and static/public assets are allowed in Cache Storage.
  for (const path of cached) {
    expect(path === "/offline" || path.startsWith("/_next/static/") || path.startsWith("/icons/") || path.startsWith("/brand/")).toBe(true);
  }
});
