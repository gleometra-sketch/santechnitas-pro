import { test } from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_MIME, MAX_FILE_BYTES, formatBytes, guessMime } from "../../src/lib/files/constants";

test("guessMime pagal naršyklės tipą arba plėtinį", () => {
  assert.equal(guessMime({ name: "a.jpg", type: "image/jpeg" }), "image/jpeg");
  assert.equal(guessMime({ name: "IMG_0001.HEIC", type: "" }), "image/heic");
  assert.equal(guessMime({ name: "sąmata.xlsx", type: "" }), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(guessMime({ name: "sutartis.PDF", type: "" }), "application/pdf");
  // Leidžiamas tipas laimi prieš keistą plėtinį.
  assert.equal(guessMime({ name: "foto.dat", type: "image/png" }), "image/png");
});

test("guessMime atmeta vykdomus ir nežinomus failus", () => {
  assert.equal(guessMime({ name: "programa.exe", type: "application/x-msdownload" }), null);
  assert.equal(guessMime({ name: "skriptas.js", type: "text/javascript" }), null);
  assert.equal(guessMime({ name: "be_pletinio", type: "" }), null);
  assert.equal(guessMime({ name: "archyvas.zip", type: "application/zip" }), null);
  assert.equal(guessMime({ name: "foto.svg", type: "image/svg+xml" }), null); // SVG gali turėti scenarijų
});

test("ribos", () => {
  assert.equal(MAX_FILE_BYTES, 25 * 1024 * 1024);
  assert.ok(!(ALLOWED_MIME as readonly string[]).includes("image/svg+xml"));
  assert.equal(formatBytes(500), "1 KB");
  assert.equal(formatBytes(1_048_576), "1,0 MB");
});
