import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route.ts";
import dns from "node:dns/promises";

test("returns safe errors and no-store for invalid or oversized input", async () => {
  for (const body of [
    "{",
    JSON.stringify({ url: "http://127.0.0.1" }),
    JSON.stringify({ url: "x".repeat(5000) }),
  ]) {
    const response = await POST(
      new Request("http://localhost/api/feed", { method: "POST", body }),
    );
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = await response.json();
    assert.equal(data.code, "INVALID_URL");
    assert.equal(typeof data.message, "string");
  }
});

test("bounds concurrent upstream fetches", async (t) => {
  const releases: Array<(value: never) => void> = [];
  t.mock.method(
    dns,
    "lookup",
    (() =>
      new Promise((resolve) => {
        releases.push(resolve);
      })) as never,
  );
  const makeRequest = () =>
    new Request("http://localhost/api/feed", {
      method: "POST",
      body: JSON.stringify({ url: "http://feed.example/" }),
    });
  const pending = Array.from({ length: 8 }, () => POST(makeRequest()));
  await new Promise((resolve) => setImmediate(resolve));
  const excess = POST(makeRequest());
  await new Promise((resolve) => setImmediate(resolve));
  for (const release of releases)
    release([{ address: "127.0.0.1", family: 4 }] as never);
  const response = await excess;
  await Promise.all(pending);
  assert.equal(response.status, 429);
});
