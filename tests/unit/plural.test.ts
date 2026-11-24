import { test } from "node:test";
import assert from "node:assert/strict";
import { ltPlural } from "../../src/lib/plural";

const d = (n: number) => `${n} ${ltPlural(n, "diena", "dienos", "dienų")}`;

test("ltPlural: lietuviškos skaičių galūnės", () => {
  assert.equal(d(0), "0 dienų");
  assert.equal(d(1), "1 diena");
  assert.equal(d(2), "2 dienos");
  assert.equal(d(9), "9 dienos");
  assert.equal(d(10), "10 dienų");
  assert.equal(d(11), "11 dienų");
  assert.equal(d(19), "19 dienų");
  assert.equal(d(20), "20 dienų");
  assert.equal(d(21), "21 diena");
  assert.equal(d(22), "22 dienos");
  assert.equal(d(31), "31 diena");
  assert.equal(d(101), "101 diena");
  assert.equal(d(111), "111 dienų");
  assert.equal(d(-1), "-1 diena");
});
