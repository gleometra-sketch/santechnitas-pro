import { defineConfig, devices } from "@playwright/test";

// „Dūmų“ testai naršyklėje: tikrina viešus puslapius ir apsaugą neprisijungus (be Supabase užklausų).
// Prieš paleidžiant reikia `npm run build`. NEXT_PUBLIC_* kintamieji įrašomi build metu.
const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "kompiuteris", use: { ...devices["Desktop Chrome"] } },
    { name: "telefonas", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
