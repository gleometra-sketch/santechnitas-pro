import { test, expect } from "@playwright/test";

const PROTECTED = ["/darbai", "/kalendorius", "/valandos", "/medziagos", "/valdymas", "/valdymas/darbai", "/valdymas/darbuotojai", "/valdymas/laikas", "/valdymas/ataskaita", "/valdymas/objektai"];

test.describe("viešas pardavimo puslapis", () => {
  test("rodomas neprisijungus, be klaidų, su veikiančiomis nuorodomis", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Visi objektai viename kalendoriuje");
    await expect(page.locator("#funkcijos")).toBeVisible();
    await expect(page.locator("#kainos")).toBeVisible();

    // Visi „Išbandyti“ ir „Pasirinkti“ mygtukai veda į registraciją, „Prisijungti“ – į prisijungimą.
    for (const name of [/Išbandyti/, /Pasirinkti/]) {
      const links = page.getByRole("link", { name });
      expect(await links.count()).toBeGreaterThan(0);
      for (const l of await links.all()) await expect(l).toHaveAttribute("href", "/registracija");
    }
    await expect(page.getByRole("link", { name: "Prisijungti" }).first()).toHaveAttribute("href", "/prisijungimas");
    expect(errors).toEqual([]);
  });

  test("telefone nėra horizontalaus slinkimo", async ({ page }) => {
    for (const url of ["/", "/registracija", "/prisijungimas"]) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${url} perpildo ekraną`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("prisijungimo puslapiai", () => {
  test("registracija ir prisijungimas turi el. pašto ir slaptažodžio laukus", async ({ page }) => {
    for (const url of ["/registracija", "/prisijungimas"]) {
      await page.goto(url);
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    }
  });

  test("privatumo politika atidaroma", async ({ page }) => {
    const res = await page.goto("/privatumas");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("apsauga neprisijungus", () => {
  for (const path of PROTECTED) {
    test(`${path} nukreipia į prisijungimą`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/prisijungimas\?next=/);
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });
  }

  test("CSV eksportas neprisijungus neatiduodamas", async ({ request }) => {
    const res = await request.get("/valdymas/ataskaita/eksportas?m=2026-01", { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toContain("/prisijungimas");
    expect(res.headers()["content-type"] ?? "").not.toContain("text/csv");
  });
});

test.describe("programėlės failai", () => {
  test("manifestas ir ikonos pasiekiami", async ({ request }) => {
    const m = await request.get("/manifest.webmanifest");
    expect(m.status()).toBe(200);
    const manifest = await m.json();
    expect(manifest.name).toContain("DarboRitmas");
    for (const icon of manifest.icons ?? []) {
      const r = await request.get(icon.src);
      expect(r.status(), icon.src).toBe(200);
    }
  });
});
