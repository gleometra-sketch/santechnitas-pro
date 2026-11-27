import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REFUND_DAYS, getLegal, legalMissing } from "../../src/lib/legal";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("getLegal ir legalMissing: trūkstami privalomi rekvizitai", () => {
  const empty = getLegal({});
  assert.deepEqual(legalMissing(empty), ["LEGAL_NAME", "LEGAL_ADDRESS", "LEGAL_EMAIL"]);
  const full = getLegal({ LEGAL_NAME: " UAB Test ", LEGAL_ADDRESS: "Vilnius", LEGAL_EMAIL: "a@b.lt", LEGAL_CODE: "1" });
  assert.equal(full.name, "UAB Test");
  assert.deepEqual(legalMissing(full), []);
});

test("grąžinimo laikotarpis atitinka Paddle reikalavimą (14–90 dienų)", () => {
  assert.ok(REFUND_DAYS >= 14 && REFUND_DAYS <= 90);
});

test("juridiniai puslapiai turi, ko reikalauja Paddle, ir neturi „negrąžinama“", () => {
  const terms = read("src/app/salygos/page.tsx");
  const refund = read("src/app/grazinimai/page.tsx");
  const privacy = read("src/app/privatumas/page.tsx");
  assert.match(terms, /Merchant of Record/);
  assert.match(terms, /Paddle\.com/);
  assert.match(refund, /paddle\.net/);
  assert.match(refund, /REFUND_DAYS/);
  assert.match(privacy, /Paddle/);
  for (const text of [terms, refund, privacy]) assert.doesNotMatch(text, /negrąžinam|visi pardavimai galutiniai|no refunds|all sales are final/i);
});

test("juridiniai puslapiai viešai prieinami (middleware PUBLIC)", () => {
  const mw = read("src/middleware.ts");
  for (const path of ["/salygos", "/grazinimai", "/privatumas"]) assert.ok(mw.includes(`"${path}"`), path);
});
