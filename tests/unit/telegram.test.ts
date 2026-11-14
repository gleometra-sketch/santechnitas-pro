import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, clip, esc, formatMinutes, isCategory, isValidStartToken, newToken, parseCommand, safeEqual, sha256Hex } from "../../src/lib/telegram/core";

test("parseCommand supranta komandas su botu ir argumentu", () => {
  assert.deepEqual(parseCommand("/start abc"), { name: "start", arg: "abc" });
  assert.deepEqual(parseCommand("/Start@DarboRitmasBot  kodas123 "), { name: "start", arg: "kodas123" });
  assert.deepEqual(parseCommand("/pagalba"), { name: "pagalba", arg: "" });
  assert.equal(parseCommand("labas"), null);
  assert.equal(parseCommand(undefined), null);
});

test("kategorijos: yra automobiliai, nežinomos atmetamos", () => {
  assert.ok(isCategory("automobiliai"));
  assert.ok(isCategory("darbas"));
  assert.ok(!isCategory("toString"));
  assert.ok(!isCategory("xyz"));
  assert.deepEqual(Object.keys(CATEGORIES).sort(), ["automobiliai", "darbas", "medziagos", "pastabos"]);
});

test("esc apsaugo nuo HTML, clip trumpina", () => {
  assert.equal(esc("<b>&</b>"), "&lt;b&gt;&amp;&lt;/b&gt;");
  assert.equal(clip("  trumpas ", 20), "trumpas");
  assert.equal(clip("a".repeat(30), 10).length, 10);
});

test("safeEqual ir start kodo tikrinimas", () => {
  assert.ok(safeEqual("slaptas", "slaptas"));
  assert.ok(!safeEqual("slaptas", "slaptaz"));
  assert.ok(!safeEqual("a", "aa"));
  assert.ok(isValidStartToken("A".repeat(32)));
  assert.ok(!isValidStartToken("trumpas"));
  assert.ok(!isValidStartToken("a b".padEnd(32, "x")));
});

test("newToken: kodas tinka deep link, maiša atitinka kodą", async () => {
  const { token, hash } = await newToken();
  assert.ok(isValidStartToken(token));
  assert.equal(hash, await sha256Hex(token));
  assert.equal(hash.length, 64);
});

test("formatMinutes", () => {
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(120), "2 val.");
  assert.equal(formatMinutes(452), "7 val. 32 min");
});
