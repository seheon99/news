import test from "node:test";
import assert from "node:assert/strict";
import { downloadFeed } from "./feed-fetch.ts";
import dns from "node:dns/promises";
import http from "node:http";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

test("rejects credentials, nonstandard ports, localhost and private IP literals", async () => {
  for (const url of [
    "http://user:pass@example.com/",
    "http://example.com:8080/",
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fe80::1]/",
  ]) {
    await assert.rejects(downloadFeed(url), { code: "INVALID_URL" });
  }
});

test("rejects IPv4-compatible IPv6 literals before connecting", async (t) => {
  t.mock.method(http, "request", (() => {
    throw new Error("unexpected connection");
  }) as never);
  for (const url of ["http://[::2]/", "http://[::a00:1]/"]) {
    await assert.rejects(downloadFeed(url), { code: "INVALID_URL" });
  }
});

test("rejects IPv4-compatible IPv6 DNS answers before connecting", async (t) => {
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "::a00:1", family: 6 }] as never,
  );
  t.mock.method(http, "request", (() => {
    throw new Error("unexpected connection");
  }) as never);
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "INVALID_URL",
  });
});

test("rejects redirects to IPv4-compatible IPv6 literals", async (t) => {
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "8.8.8.8", family: 4 }] as never,
  );
  t.mock.method(http, "request", ((
    _url: unknown,
    _options: unknown,
    callback: (
      res: Readable & { statusCode: number; headers: Record<string, string> },
    ) => void,
  ) => {
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    request.end = () => {
      const res = Readable.from([]) as Readable & {
        statusCode: number;
        headers: Record<string, string>;
      };
      res.statusCode = 302;
      res.headers = { location: "http://[::2]/" };
      callback(res);
    };
    return request;
  }) as never);
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "INVALID_URL",
  });
});

test("rejects mixed public and private DNS results before connecting", async (t) => {
  t.mock.method(
    dns,
    "lookup",
    async () =>
      [
        { address: "8.8.8.8", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ] as never,
  );
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "INVALID_URL",
  });
});

test("times out even if DNS never responds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(dns, "lookup", (() => new Promise(() => {})) as never);
  const pending = downloadFeed("http://feed.example/");
  t.mock.timers.tick(10_000);
  await assert.rejects(pending, { code: "TIMEOUT" });
});

test("checks redirects, pins public addresses, and enforces response limits", async (t) => {
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "8.8.8.8", family: 4 }] as never,
  );
  let mode = "redirect";
  let count = 0;
  t.mock.method(http, "request", ((
    _url: unknown,
    options: {
      lookup: (
        h: string,
        o: object,
        cb: (e: null, a: string, f: number) => void,
      ) => void;
    },
    callback: (
      res: Readable & { statusCode: number; headers: Record<string, string> },
    ) => void,
  ) => {
    options.lookup("feed.example", {}, (_e, address, family) => {
      assert.equal(address, "8.8.8.8");
      assert.equal(family, 4);
    });
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    request.end = () => {
      count++;
      const res = Readable.from(
        mode === "large"
          ? [Buffer.alloc(2 * 1024 * 1024 + 1)]
          : [Buffer.from("feed")],
      ) as Readable & { statusCode: number; headers: Record<string, string> };
      res.statusCode = mode === "http" ? 500 : mode === "large" ? 200 : 302;
      res.headers = {
        location: mode === "redirect" ? "http://127.0.0.1/" : "/again",
      };
      callback(res);
    };
    return request;
  }) as never);
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "INVALID_URL",
  });
  mode = "loop";
  count = 0;
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "TOO_MANY_REDIRECTS",
  });
  assert.equal(count, 4);
  mode = "large";
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "TOO_LARGE",
  });
  mode = "http";
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "HTTP_ERROR",
  });
});

test("rejects malformed and excessive length URLs", async () => {
  for (const url of [
    "file:///etc/passwd",
    `https://example.com/${"a".repeat(2048)}`,
  ])
    await assert.rejects(downloadFeed(url), { code: "INVALID_URL" });
});
