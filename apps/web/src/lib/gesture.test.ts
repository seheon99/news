import { test } from "node:test";
import assert from "node:assert/strict";
import { gestureAction } from "./gesture.ts";
test("gestures require 80 pixels on the dominant axis and ignore downward motion", () => {
  assert.equal(gestureAction(79, 0), null);
  assert.equal(gestureAction(-80, 10), "skip");
  assert.equal(gestureAction(80, 10), "store");
  assert.equal(gestureAction(20, -80), "defer");
  assert.equal(gestureAction(90, 100), null);
});
