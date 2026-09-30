import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("dashboard does not hide records from previous launch dates", () => {
  assert.doesNotMatch(appSource, /todayBoletos/);
  assert.match(appSource, /return computedBoletos\.filter\(\(b\) =>/);
  assert.match(appSource, /<StatCards boletos=\{computedBoletos\}/);
});

test("dashboard has a distinct query error state and retry action", () => {
  assert.match(appSource, /const \[dataError, setDataError\]/);
  assert.match(appSource, /Não foi possível consultar os boletos/);
  assert.match(appSource, /Tentar novamente/);
  assert.match(appSource, /requestId !== fetchRequestRef\.current/);
});
