import test, { type TestContext } from "node:test";
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

test("rejects malformed and excessive length URLs", async () => {
  for (const url of [
    "file:///etc/passwd",
    `https://example.com/${"a".repeat(2048)}`,
  ])
    await assert.rejects(downloadFeed(url), { code: "INVALID_URL" });
});

type UpstreamResponse = {
  status?: number;
  headers?: Record<string, string>;
  chunks?: Buffer[];
};

function mockUpstream(t: TestContext, responses: UpstreamResponse[]) {
  const lookups: string[] = [];
  t.mock.method(dns, "lookup", async (hostname: string) => {
    lookups.push(hostname);
    return [{ address: "8.8.8.8", family: 4 }] as never;
  });
  const requests: string[] = [];
  t.mock.method(http, "request", ((
    url: URL,
    options: http.RequestOptions,
    callback: (res: Readable & UpstreamResponse) => void,
  ) => {
    requests.push(url.href);
    assert.equal(options.family, 4);
    assert.ok(options.lookup);
    options.lookup(url.hostname, {}, (err, address, family) => {
      assert.equal(err, null);
      assert.equal(address, "8.8.8.8");
      assert.equal(family, 4);
    });
    const response = responses.shift();
    assert.ok(response, `Unexpected request to ${url.href}`);
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    request.end = () => {
      const res = Readable.from(response.chunks ?? []) as Readable & {
        statusCode: number;
        headers: Record<string, string>;
      };
      res.statusCode = response.status ?? 200;
      res.headers = response.headers ?? {};
      callback(res);
    };
    return request;
  }) as never);
  return { requests, lookups };
}

test("follows three relative redirects, validates each host, and returns the final URL", async (t) => {
  const upstream = mockUpstream(t, [
    { status: 301, headers: { location: "/new/feed" } },
    { status: 302, headers: { location: "http://cdn.example/path/feed" } },
    { status: 307, headers: { location: "../final#fragment" } },
    { chunks: [Buffer.from("feed")] },
  ]);
  assert.deepEqual(await downloadFeed("http://feed.example/old#fragment"), {
    xml: "feed",
    url: "http://cdn.example/final",
  });
  assert.deepEqual(upstream.requests, [
    "http://feed.example/old",
    "http://feed.example/new/feed",
    "http://cdn.example/path/feed",
    "http://cdn.example/final",
  ]);
  assert.deepEqual(upstream.lookups, [
    "feed.example",
    "feed.example",
    "cdn.example",
    "cdn.example",
  ]);
});

test("rejects a fourth redirect without making a fifth request", async (t) => {
  const upstream = mockUpstream(
    t,
    Array.from({ length: 4 }, () => ({
      status: 302,
      headers: { location: "/again" },
    })),
  );
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "TOO_MANY_REDIRECTS",
  });
  assert.equal(upstream.requests.length, 4);
});

for (const [name, response, code] of [
  [
    "private IP redirect",
    { status: 302, headers: { location: "http://127.0.0.1/" } },
    "INVALID_URL",
  ],
  ["redirect without location", { status: 302 }, "HTTP_ERROR"],
  [
    "malformed redirect",
    { status: 302, headers: { location: "http://[" } },
    "INVALID_URL",
  ],
  ["HTTP failure", { status: 503 }, "HTTP_ERROR"],
] as const) {
  test(`rejects ${name}`, async (t) => {
    const upstream = mockUpstream(t, [response]);
    await assert.rejects(downloadFeed("http://feed.example/"), { code });
    assert.equal(upstream.requests.length, 1);
  });
}

test("rejects a redirect whose new hostname resolves to a private address", async (t) => {
  const upstream = mockUpstream(t, [
    { status: 302, headers: { location: "http://internal.example/feed" } },
  ]);
  const lookup = t.mock.method(
    dns,
    "lookup",
    async (hostname: string) =>
      [
        {
          address: hostname === "feed.example" ? "8.8.8.8" : "10.0.0.1",
          family: 4,
        },
      ] as never,
  );
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "INVALID_URL",
  });
  assert.deepEqual(
    lookup.mock.calls.map(({ arguments: args }) => args[0]),
    ["feed.example", "internal.example"],
  );
  assert.deepEqual(upstream.requests, ["http://feed.example/"]);
});

test("accepts exactly 2 MiB across chunks and rejects the next byte", async (t) => {
  const chunk = Buffer.alloc(1024 * 1024, "a");
  mockUpstream(t, [
    { chunks: [chunk, chunk] },
    { chunks: [chunk, chunk, Buffer.from("b")] },
  ]);
  const result = await downloadFeed("http://feed.example/");
  assert.equal(result.xml, "a".repeat(2 * 1024 * 1024));
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "TOO_LARGE",
  });
});

const xml = (encoding?: string) =>
  `${encoding ? `<?xml version="1.0" encoding="${encoding}"?>` : ""}<rss><channel><title>Café 한글</title></channel></rss>`;
const latinXml =
  '<?xml version="1.0" encoding="ISO-8859-1"?><rss><channel><title>Café</title></channel></rss>';
const utf16be = (value: string) => Buffer.from(value, "utf16le").swap16();

for (const fixture of [
  {
    name: "UTF-8 without a declaration",
    body: Buffer.from(xml()),
    expected: xml(),
  },
  {
    name: "XML Latin-1 declaration",
    body: Buffer.from(latinXml, "latin1"),
    expected: latinXml,
  },
  {
    name: "quoted case-insensitive HTTP charset over XML declaration",
    body: Buffer.from(latinXml.replace("ISO-8859-1", "UTF-8"), "latin1"),
    contentType: 'application/rss+xml; Charset = "ISO-8859-1"',
    expected: latinXml.replace("ISO-8859-1", "UTF-8"),
  },
  {
    name: "UTF-8 BOM over conflicting HTTP and XML charsets",
    body: Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(xml("ISO-8859-1")),
    ]),
    contentType: "application/rss+xml; charset=ISO-8859-1",
    expected: xml("ISO-8859-1"),
  },
  {
    name: "UTF-16LE BOM over conflicting HTTP charset",
    body: Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(xml(), "utf16le"),
    ]),
    contentType: "application/rss+xml; charset=utf-8",
    expected: xml(),
  },
  {
    name: "UTF-16BE BOM",
    body: Buffer.concat([Buffer.from([0xfe, 0xff]), utf16be(xml())]),
    expected: xml(),
  },
  {
    name: "UTF-16LE declaration without a BOM",
    body: Buffer.from(xml("UTF-16"), "utf16le"),
    expected: xml("UTF-16"),
  },
  {
    name: "UTF-16BE declaration without a BOM",
    body: utf16be(xml("UTF-16")),
    expected: xml("UTF-16"),
  },
]) {
  test(`decodes ${fixture.name} without changing the XML`, async (t) => {
    mockUpstream(t, [
      {
        chunks: [fixture.body.subarray(0, 7), fixture.body.subarray(7)],
        headers: fixture.contentType
          ? { "content-type": fixture.contentType }
          : {},
      },
    ]);
    assert.deepEqual(await downloadFeed("http://feed.example/"), {
      xml: fixture.expected,
      url: "http://feed.example/",
    });
  });
}

for (const fixture of [
  {
    name: "unsupported HTTP charset",
    body: Buffer.from(xml()),
    contentType: "application/rss+xml; charset=x-unknown",
  },
  { name: "unsupported XML charset", body: Buffer.from(xml("x-unknown")) },
  {
    name: "invalid UTF-8 bytes",
    body: Buffer.concat([
      Buffer.from("<rss>"),
      Buffer.from([0xc3, 0x28]),
      Buffer.from("</rss>"),
    ]),
  },
  { name: "truncated UTF-16 code unit", body: Buffer.from([0xff, 0xfe, 0x3c]) },
]) {
  test(`rejects ${fixture.name} instead of returning replacement characters`, async (t) => {
    mockUpstream(t, [
      {
        chunks: [fixture.body],
        headers: fixture.contentType
          ? { "content-type": fixture.contentType }
          : {},
      },
    ]);
    await assert.rejects(downloadFeed("http://feed.example/"), {
      code: "UNSUPPORTED_ENCODING",
    });
  });
}

test("maps DNS and connection failures to safe network errors", async (t) => {
  t.mock.method(dns, "lookup", async () => {
    throw Error("private DNS details");
  });
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "NETWORK_ERROR",
    message: "피드에 연결하지 못했습니다.",
  });
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "8.8.8.8", family: 4 }] as never,
  );
  t.mock.method(http, "request", (() => {
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    request.end = () =>
      request.emit("error", Error("connection reset with private details"));
    return request;
  }) as never);
  await assert.rejects(downloadFeed("http://feed.example/"), {
    code: "NETWORK_ERROR",
    message: "피드에 연결하지 못했습니다.",
  });
});

test("aborts a response that never ends after the overall request deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(
    dns,
    "lookup",
    async () => [{ address: "8.8.8.8", family: 4 }] as never,
  );
  let signal: AbortSignal | undefined;
  let connected!: () => void;
  const ready = new Promise<void>((resolve) => {
    connected = resolve;
  });
  t.mock.method(http, "request", ((
    _url: URL,
    options: http.RequestOptions,
    callback: (res: Readable) => void,
  ) => {
    const request = new EventEmitter() as EventEmitter & { end: () => void };
    signal = options.signal;
    signal?.addEventListener(
      "abort",
      () => request.emit("error", Error("aborted")),
      { once: true },
    );
    request.end = () => {
      const res = new Readable({ read() {} }) as Readable & {
        statusCode: number;
        headers: object;
      };
      res.statusCode = 200;
      res.headers = {};
      callback(res);
      connected();
    };
    return request;
  }) as never);
  const pending = downloadFeed("http://feed.example/");
  await ready;
  t.mock.timers.tick(9_999);
  assert.equal(signal?.aborted, false);
  t.mock.timers.tick(1);
  await assert.rejects(pending, { code: "TIMEOUT" });
  assert.equal(signal?.aborted, true);
});
