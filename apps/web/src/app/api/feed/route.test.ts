import assert from "node:assert/strict";
import dns from "node:dns/promises";
import { EventEmitter } from "node:events";
import http from "node:http";
import { Readable } from "node:stream";
import test, { type TestContext } from "node:test";
import { POST } from "./route.ts";

test("returns safe errors and no-store for invalid or oversized input", async () => {
  for (const body of [
    "{",
    "null",
    "[]",
    "{}",
    JSON.stringify({ url: 123 }),
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
  const completed = await Promise.all(pending);
  assert.equal(releases.length, 8);
  assert.ok(completed.every((r) => r.status === 400));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).code, "BUSY");
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "127.0.0.1", family: 4 }] as never,
  );
  const retried = await POST(makeRequest());
  assert.equal(retried.status, 400);
  assert.equal((await retried.json()).code, "INVALID_URL");
});

function mockResponses(
  t: TestContext,
  responses: Array<{
    status?: number;
    headers?: Record<string, string>;
    body?: Buffer;
  }>,
) {
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "8.8.8.8", family: 4 }] as never,
  );
  const urls: string[] = [];
  t.mock.method(http, "request", ((
    url: URL,
    _options: unknown,
    callback: (res: Readable) => void,
  ) => {
    urls.push(url.href);
    const response = responses.shift();
    assert.ok(response, `Unexpected request to ${url.href}`);
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    request.end = () => {
      const res = Readable.from(
        response.body ? [response.body] : [],
      ) as Readable & { statusCode: number; headers: Record<string, string> };
      res.statusCode = response.status ?? 200;
      res.headers = response.headers ?? {};
      callback(res);
    };
    return request;
  }) as never);
  return urls;
}

const feedXml =
  '<rss version="2.0"><channel><title>Café</title><item><guid>story-1</guid><title><![CDATA[Hello <b>world</b>]]></title><link>story</link><description><![CDATA[<p>Résumé</p><script>secret()</script>]]></description><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>';

test("POST downloads, decodes and parses a redirected feed while retaining subscription identity", async (t) => {
  const urls = mockResponses(t, [
    { status: 302, headers: { location: "http://cdn.example/path/feed" } },
    {
      body: Buffer.from(feedXml, "latin1"),
      headers: { "content-type": "application/rss+xml; charset=ISO-8859-1" },
    },
  ]);
  const started = Date.now();
  const response = await POST(
    new Request("http://localhost/api/feed", {
      method: "POST",
      body: JSON.stringify({ url: "http://feed.example/feed#section" }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  const { lastFetchedAt } = data.source;
  assert.ok(
    Date.parse(lastFetchedAt) >= started &&
      Date.parse(lastFetchedAt) <= Date.now(),
  );
  assert.equal(data.stories.length, 1);
  const { id } = data.stories[0];
  assert.match(id, /^[a-f0-9]{64}$/);
  assert.deepEqual(data, {
    source: {
      url: "http://feed.example/feed",
      title: "Café",
      lastFetchedAt,
      excludedCount: 1,
    },
    stories: [
      {
        id,
        sourceUrl: "http://feed.example/feed",
        sourceTitle: "Café",
        title: "Hello world",
        description: "Résumé",
        url: "http://cdn.example/path/story",
        publishedAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  });
  assert.deepEqual(urls, [
    "http://feed.example/feed",
    "http://cdn.example/path/feed",
  ]);
});

for (const fixture of [
  {
    name: "upstream HTTP failure",
    upstream: { status: 503 },
    code: "HTTP_ERROR",
    message: "피드 서버가 요청을 처리하지 못했습니다.",
  },
  {
    name: "invalid feed",
    upstream: { body: Buffer.from("<html>not a feed</html>") },
    code: "INVALID_FEED",
    message: "올바른 RSS 또는 Atom 피드가 아닙니다.",
  },
  {
    name: "malformed encoded bytes",
    upstream: { body: Buffer.from([0xc3, 0x28]) },
    code: "UNSUPPORTED_ENCODING",
    message: "지원하지 않는 피드 문자 인코딩입니다.",
  },
]) {
  test(`POST returns a safe no-store 502 for ${fixture.name}`, async (t) => {
    mockResponses(t, [fixture.upstream]);
    const response = await POST(
      new Request("http://localhost/api/feed", {
        method: "POST",
        body: JSON.stringify({ url: "http://feed.example/" }),
      }),
    );
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      code: fixture.code,
      message: fixture.message,
    });
  });
}

test("POST accepts exactly 4096 streamed bytes and cancels a body at 4097 before any connection", async (t) => {
  const urls = mockResponses(t, [
    {
      body: Buffer.from(feedXml, "latin1"),
      headers: { "content-type": "application/rss+xml; charset=ISO-8859-1" },
    },
  ]);
  const body = JSON.stringify({ url: "http://feed.example/" }).padEnd(
    4096,
    " ",
  );
  const encoder = new TextEncoder();
  const acceptedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body.slice(0, 2048)));
      controller.enqueue(encoder.encode(body.slice(2048)));
      controller.close();
    },
  });
  const accepted = await POST(
    new Request("http://localhost/api/feed", {
      method: "POST",
      body: acceptedStream,
      duplex: "half",
    } as RequestInit),
  );
  assert.equal(accepted.status, 200);
  let cancelled = false;
  const oversizedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.enqueue(encoder.encode(" "));
    },
    cancel() {
      cancelled = true;
    },
  });
  const rejected = await POST(
    new Request("http://localhost/api/feed", {
      method: "POST",
      body: oversizedStream,
      duplex: "half",
    } as RequestInit),
  );
  assert.equal(rejected.status, 400);
  assert.equal(rejected.headers.get("cache-control"), "no-store");
  assert.deepEqual(await rejected.json(), {
    code: "INVALID_URL",
    message: "피드 주소가 너무 깁니다.",
  });
  assert.equal(cancelled, true);
  assert.deepEqual(urls, ["http://feed.example/"]);
});

test("POST reports a DNS deadline as a safe no-store 504", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolving!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolving = resolve;
  });
  t.mock.method(dns, "lookup", (() => {
    resolving();
    return new Promise(() => {});
  }) as never);
  const pending = POST(
    new Request("http://localhost/api/feed", {
      method: "POST",
      body: JSON.stringify({ url: "http://feed.example/" }),
    }),
  );
  await ready;
  t.mock.timers.tick(10_000);
  const response = await pending;
  assert.equal(response.status, 504);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    code: "TIMEOUT",
    message: "피드 요청 시간이 초과되었습니다.",
  });
});
