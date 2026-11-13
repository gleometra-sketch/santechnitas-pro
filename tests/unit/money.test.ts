import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, parseEuroToCents } from "../../src/lib/money";

test("parseEuroToCents priima kablelį ir tašką", () => {
  assert.equal(parseEuroToCents("12,5"), 1250);
  assert.equal(parseEuroToCents("12.50"), 1250);
  assert.equal(parseEuroToCents(" 7 "), 700);
  assert.equal(parseEuroToCents("0"), 0);
  assert.equal(parseEuroToCents("1000"), 100000);
  assert.equal(parseEuroToCents("0,01"), 1);
});

test("parseEuroToCents atmeta neteisingas reikšmes", () => {
  for (const bad of ["", " ", "abc", "-5", "12,345", "1000,01", "1001", "1 200", "12,5€", "1,2,3", "NaN", "1e3", "--1"]) {
    assert.equal(parseEuroToCents(bad), null, JSON.stringify(bad));
  }
});

test("formatMoney rodo eurus su kableliu", () => {
  assert.equal(formatMoney(1250).replace(/\s/g, " "), "12,50 €");
  assert.equal(formatMoney(0).replace(/\s/g, " "), "0,00 €");
  assert.equal(formatMoney(5).replace(/\s/g, " "), "0,05 €");
});
