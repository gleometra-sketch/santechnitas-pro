import { test } from "node:test";
import assert from "node:assert/strict";
import { stepQty } from "../../src/lib/work/qty";

test("stepQty: didina ir mažina vienetu", () => {
  assert.equal(stepQty("3", 1), "4");
  assert.equal(stepQty("3", -1), "2");
  assert.equal(stepQty("2,5", 1), "3,5");
});

test("stepQty: tuščias laukas pradeda nuo 1, bet nemažėja žemiau 0", () => {
  assert.equal(stepQty("", 1), "1");
  assert.equal(stepQty("", -1), null);
  assert.equal(stepQty("1", -1), null);
  assert.equal(stepQty("0,5", -1), null);
  assert.equal(stepQty("abc", 1), "1");
});

test("stepQty: nevirsija serverio ribos 100000", () => {
  assert.equal(stepQty("100000", 1), null);
  assert.equal(stepQty("99999", 1), "100000");
});
