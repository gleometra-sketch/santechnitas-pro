// Paleidžia vienetinius testus (tests/unit/*.test.ts). Veikia Windows, Mac ir Linux bei Node 20+ (be glob plėtinių).
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "unit");
const files = readdirSync(dir).filter((f) => f.endsWith(".test.ts")).sort().map((f) => join(dir, f));
if (files.length === 0) {
  console.error("Nerasta vienetinių testų.");
  process.exit(1);
}
const r = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
